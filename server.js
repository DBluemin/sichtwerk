/* ==========================================================================
   SICHTWERK Server — statische Auslieferung + Analyse- & Verifizierungs-API
   Start:  node server.js   (Port 8899)
   API:    GET /api/analyze?url=…          echte Crawl-Analyse (max. 8 Seiten)
           GET /api/verify/start?domain=…  Verifizierungs-Token erzeugen
           GET /api/verify/check?domain=…  DNS-TXT + Datei wirklich prüfen
   Ohne Dependencies · Node >= 18 · Politeness: robots.txt, UA, sequenziell
   Testsuite: node tests/test-analyzer.js
   ========================================================================== */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dns = require("dns").promises;

const PORT = process.env.PORT || 8899;
const ROOT = __dirname;
const UA = "NennwertBot/0.1 (+https://dbluemin.github.io/sichtwerk; Prototyp-Analyse auf Nutzeranfrage)";
const MAX_PAGES = 8;
const FETCH_TIMEOUT = 9000;
const VERIFY_FILE = path.join(ROOT, ".nennwert-verify.json");

/* ==========================================================================
   HTTP-Helfer
   ========================================================================== */
async function fetchRaw(u, method = "GET") {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(u, {
      method,
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
      signal: ctrl.signal,
    });
    const body = method === "GET" && res.status >= 200 && res.status < 300 ? await res.text() : "";
    return { status: res.status, headers: res.headers, body };
  } finally {
    clearTimeout(t);
  }
}

/* Folgt Redirects manuell (max. 5) und protokolliert die Kette */
async function fetchPage(u) {
  const chain = [];
  let current = u;
  for (let hop = 0; hop < 5; hop++) {
    let r;
    try {
      r = await fetchRaw(current);
    } catch (e) {
      const code = e && e.cause && e.cause.code ? e.cause.code : e.name === "AbortError" ? "Timeout" : String(e.name || e);
      return { url: u, finalUrl: current, status: 0, chain, html: "", error: code };
    }
    chain.push({ url: current, status: r.status });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location");
      if (!loc) return { url: u, finalUrl: current, status: r.status, chain, html: "" };
      try { current = new URL(loc, current).href; } catch (e) { return { url: u, finalUrl: current, status: r.status, chain, html: "" }; }
      continue;
    }
    return { url: u, finalUrl: current, status: r.status, chain, html: r.body || "" };
  }
  return { url: u, finalUrl: current, status: 310, chain, html: "", error: "Redirect-Schleife" };
}

/* ==========================================================================
   HTML-Analyse (bewusst einfacher, aber getesteter Parser)
   ========================================================================== */
function stripTags(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
function attr(tag, name) {
  const m = String(tag).match(new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']', "i"));
  return m ? m[1] : null;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function shortUrl(u) {
  try { const x = new URL(u); return x.pathname === "/" ? x.host : x.pathname; } catch (e) { return String(u); }
}

function analyzeHtml(pageUrl, html) {
  const out = {};
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  out.title = titleM ? stripTags(titleM[1]).slice(0, 200) : "";
  out.titleLen = out.title.length;

  out.desc = "";
  out.noindex = false;
  for (const m of html.match(/<meta\b[^>]*>/gi) || []) {
    const name = (attr(m, "name") || attr(m, "property") || "").toLowerCase();
    if (name === "description" && !out.desc) out.desc = (attr(m, "content") || "").trim();
    if (name === "robots" && /noindex/i.test(attr(m, "content") || "")) out.noindex = true;
  }
  out.descLen = out.desc.length;

  const canonM = html.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i);
  out.canonical = canonM ? attr(canonM[0], "href") : null;
  try {
    out.canonicalSelf = out.canonical
      ? new URL(out.canonical, pageUrl).href.replace(/\/+$/, "") === String(pageUrl).replace(/\/+$/, "")
      : null;
  } catch (e) { out.canonicalSelf = null; }

  out.h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  out.h2Count = (html.match(/<h2[\s>]/gi) || []).length;
  const heads = html.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi) || [];
  out.questionHeadings = heads.filter((h) => stripTags(h).trim().endsWith("?")).length;

  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  out.imgs = imgs.length;
  out.imgsNoAlt = imgs.filter((t) => {
    const a = attr(t, "alt");
    return a === null || a.trim() === "";
  }).length;

  out.words = stripTags(html).split(" ").filter(Boolean).length;
  out.lang = (html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i) || [])[1] || null;
  out.viewport = /<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html);

  out.schemaTypes = [];
  out.schemaInvalid = false;
  for (const block of html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || []) {
    try {
      const json = JSON.parse(block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, ""));
      const collect = (node) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) return node.forEach(collect);
        if (node["@type"]) out.schemaTypes.push(String(node["@type"]));
        if (node["@graph"]) collect(node["@graph"]);
      };
      collect(json);
    } catch (e) { out.schemaInvalid = true; }
  }
  out.schemaTypes = [...new Set(out.schemaTypes)].slice(0, 8);

  out.links = [];
  for (const a of html.match(/<a\b[^>]*href\s*=\s*["'][^"']+["'][^>]*>/gi) || []) {
    const href = attr(a, "href");
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try { out.links.push(new URL(href, pageUrl).href.split("#")[0]); } catch (e) {}
  }
  return out;
}

/* ==========================================================================
   robots.txt — korrekter Gruppen-Parser
   Regeln: User-agent-Zeilen sammeln Agenten, bis die erste Regel kommt;
   die nächste User-agent-Zeile NACH einer Regel beginnt eine neue Gruppe.
   ========================================================================== */
function parseRobots(txt) {
  const groups = {}; // agent(lowercase) → [{type:'disallow'|'allow', path}]
  let agents = [];
  let sawRule = false;
  for (const raw of String(txt).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const m = line.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (sawRule) { agents = []; sawRule = false; }
      const a = val.toLowerCase();
      agents.push(a);
      if (!groups[a]) groups[a] = [];
    } else {
      sawRule = true;
      for (const a of agents) groups[a].push({ type: key, path: val });
    }
  }
  return groups;
}
/* Regelauswahl: exakter Agent, sonst '*'. Längster Pfad-Match gewinnt;
   bei Gleichstand gewinnt Allow. Leeres Disallow = alles erlaubt. */
function isDisallowed(groups, agent, pathName) {
  const rules = groups[String(agent).toLowerCase()] || groups["*"] || [];
  let best = null;
  for (const r of rules) {
    if (r.path === "" ) { if (r.type === "disallow") continue; }
    if (r.path === "" || pathName.startsWith(r.path)) {
      if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.type === "allow")) {
        best = r;
      }
    }
  }
  return !!best && best.type === "disallow" && best.path !== "";
}
function botBlocked(groups, bot) {
  const rules = groups[String(bot).toLowerCase()];
  if (!rules) return false;
  return isDisallowed({ [String(bot).toLowerCase()]: rules }, bot, "/");
}

/* ==========================================================================
   Vorschlags-Generatoren
   ========================================================================== */
function proposeTitle(a, brand) {
  const core = (a.title || "").split(/[|–—-]/)[0].trim() || "Startseite";
  const b = brand.charAt(0).toUpperCase() + brand.slice(1);
  let t = core + " | " + b;
  if (t.length > 60) t = core.slice(0, Math.max(10, 57 - b.length)).trim() + "… | " + b;
  return t;
}
function proposeDesc(html) {
  const text = stripTags(html);
  let d = text.slice(0, 170);
  const cut = d.lastIndexOf(" ");
  d = d.slice(0, cut > 100 ? cut : 152).trim();
  return d + " …";
}

/* SPA-/Shell-Erkennung: identische HTML-Antworten gruppieren */
function detectShell(pages) {
  const byHash = {};
  for (const p of pages) {
    if (!p.hash) continue;
    (byHash[p.hash] = byHash[p.hash] || []).push(p);
  }
  let biggest = [];
  for (const h of Object.keys(byHash)) if (byHash[h].length > biggest.length) biggest = byHash[h];
  return biggest.length >= 2 ? biggest : null;
}

/* ==========================================================================
   Analyse-Lauf
   ========================================================================== */
async function analyze(target) {
  const start = Date.now();
  const base = new URL(target);
  const host = base.host;
  const brand = host.replace(/^www\./, "").split(".")[0];
  const result = { target: base.href, host, fetchedAt: new Date().toISOString(), pages: [], findings: [], spa: null };

  /* robots.txt, sitemap, llms.txt */
  let robotsGroups = {};
  try {
    const r = await fetchRaw(new URL("/robots.txt", base).href);
    result.robotsFound = r.status === 200;
    if (r.status === 200) robotsGroups = parseRobots(r.body);
  } catch (e) { result.robotsFound = false; }
  const AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"];
  result.aiBots = {};
  AI_BOTS.forEach((b) => (result.aiBots[b] = botBlocked(robotsGroups, b) ? "blockiert" : "erlaubt"));
  try { result.sitemap = (await fetchRaw(new URL("/sitemap.xml", base).href)).status === 200; } catch (e) { result.sitemap = false; }
  try { result.llmsTxt = (await fetchRaw(new URL("/llms.txt", base).href)).status === 200; } catch (e) { result.llmsTxt = false; }

  /* Startseite + bis zu 7 interne Seiten */
  const first = await fetchPage(base.href);
  if (first.status !== 200 || !first.html) {
    result.error = "Startseite nicht erreichbar (" + (first.error || "HTTP " + first.status) + ")";
    return result;
  }
  const fetched = [first];
  const seen = new Set([base.href.replace(/\/+$/, "")]);
  const firstParsed = analyzeHtml(first.finalUrl, first.html);
  const candidates = [...new Set(firstParsed.links)]
    .filter((l) => { try { return new URL(l).host === host; } catch (e) { return false; } })
    .filter((l) => !/\.(pdf|jpg|jpeg|png|webp|gif|svg|zip|mp4|webm|css|js|xml|ico)(\?|$)/i.test(l))
    .filter((l) => { try { return !isDisallowed(robotsGroups, "*", new URL(l).pathname); } catch (e) { return false; } })
    .slice(0, MAX_PAGES - 1);
  for (const c of candidates) {
    const key = c.replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    await new Promise((r) => setTimeout(r, 250));
    fetched.push(await fetchPage(c));
  }

  /* Seiten parsen + Zeilen bauen */
  const parsed = [];
  for (const p of fetched) {
    const row = { url: p.finalUrl, requested: p.url, status: p.status, hops: Math.max(0, p.chain.length - 1) };
    if (p.status !== 200 || !p.html) {
      row.error = p.error || "HTTP " + p.status;
      result.pages.push(row);
      parsed.push({ row, a: null, p });
      continue;
    }
    const a = analyzeHtml(p.finalUrl, p.html);
    row.hash = crypto.createHash("md5").update(p.html).digest("hex").slice(0, 12);
    Object.assign(row, {
      title: a.title, titleLen: a.titleLen, descLen: a.descLen, canonicalSelf: a.canonicalSelf,
      noindex: a.noindex, h1Count: a.h1Count, imgs: a.imgs, imgsNoAlt: a.imgsNoAlt,
      words: a.words, schemaTypes: a.schemaTypes, questionHeadings: a.questionHeadings,
    });
    result.pages.push(row);
    parsed.push({ row, a, p });
  }

  /* SPA-/Shell-Erkennung VOR den Einzel-Findings */
  const okRows = result.pages.filter((r) => r.status === 200 && r.hash);
  const shellGroup = detectShell(okRows);
  const shellUrls = new Set();
  if (shellGroup && shellGroup.length >= Math.max(2, Math.ceil(okRows.length / 2))) {
    shellGroup.forEach((r) => { r.shell = true; shellUrls.add(r.url); });
    result.spa = {
      routes: shellGroup.length,
      total: okRows.length,
      words: shellGroup[0].words,
    };
  }

  const F = (severity, type, title, sub, fix) =>
    result.findings.push(Object.assign({ severity, type, title, sub }, fix || {}));
  const deduct = { technik: 0, content: 0, aeo: 0 };

  if (result.spa) {
    F("kritisch", "GEO",
      "SPA ohne Server-Rendering: " + result.spa.routes + " von " + result.spa.total + " Routen liefern identisches HTML",
      "Der Server schickt für jede Route dieselbe App-Hülle (" + result.spa.words + " Wörter). Crawler ohne JavaScript-Rendering — darunter GPTBot, ClaudeBot und PerplexityBot — sehen damit effektiv nur EINE Seite; Titel, Description und Inhalte pro Route existieren für sie nicht. Googlebot rendert nach, KI-Bots in der Regel nicht.",
      { fixType: "Technik", fixTitle: "Server-Rendering/Prerendering einführen", proposal: "<ins>Pro Route eigenes HTML ausliefern: SSR (z. B. Next/Remix), Prerendering beim Build oder ein Prerender-Dienst für Bots. Danach Titel/Description/Schema pro Route pflegbar — erst dann greifen Meta-Optimierungen überhaupt.</ins>" });
    deduct.aeo += 10; deduct.content += 6; deduct.technik += 4;
  }

  for (const { row, a, p } of parsed) {
    if (!a) {
      F("kritisch", "Technik", "Seite nicht ladbar: " + shortUrl(row.requested), row.error || "", null);
      deduct.technik += 12;
      continue;
    }
    const u = shortUrl(row.url);
    const isShellDupe = row.shell && row.url !== (shellGroup && shellGroup[0].url);

    if (row.hops > 1) { F("hoch", "Technik", "Weiterleitungskette (" + row.hops + " Hops): " + u, p.chain.map((c) => c.status).join(" → "), { fixType: "Technik", fixTitle: "Redirect-Kette kürzen: " + u, proposal: "Direkt auf " + esc(shortUrl(row.url)) + " verlinken (1 Hop statt " + row.hops + ")" }); deduct.technik += 5; }
    if (a.noindex) { F("kritisch", "Technik", "noindex gesetzt: " + u, "Seite ist intern verlinkt, aber von der Indexierung ausgeschlossen", { fixType: "Technik", fixTitle: "noindex prüfen/entfernen: " + u, proposal: "<del>robots: noindex</del> → <ins>robots: index, follow</ins> (falls beabsichtigt: interne Links entfernen)" }); deduct.technik += 12; }

    /* Bei erkannter SPA-Hülle: Meta-/Struktur-Findings nur EINMAL (an der Hülle), nicht 8-fach */
    if (isShellDupe) continue;
    const shellNote = row.shell ? " (App-Hülle — gilt für alle " + result.spa.routes + " Routen)" : "";

    if (!a.title) { F("kritisch", "Meta", "Titel fehlt: " + u + shellNote, "Ohne <title> keine steuerbare SERP-Darstellung", { fixType: "Meta", fixTitle: "Titel erstellen: " + u, proposal: "<ins>" + esc(proposeTitle(a, brand)) + "</ins>" }); deduct.content += 8; }
    else if (a.titleLen > 62 || a.titleLen < 25) { F("mittel", "Meta", "Titel " + (a.titleLen > 62 ? "zu lang" : "zu kurz") + " (" + a.titleLen + " Z.): " + u + shellNote, "„" + esc(a.title.slice(0, 70)) + "“", { fixType: "Meta", fixTitle: "Titel optimieren: " + u, proposal: "<del>" + esc(a.title.slice(0, 90)) + "</del><br><ins>" + esc(proposeTitle(a, brand)) + "</ins>" }); deduct.content += 3; }
    if (!a.desc) { F("hoch", "Meta", "Description fehlt: " + u + shellNote, "Google generiert dann selbst — CTR-Chance vertan", { fixType: "Meta", fixTitle: "Description erstellen: " + u, proposal: "<ins>" + esc(proposeDesc(p.html)) + "</ins>" }); deduct.content += 4; }
    else if (a.descLen > 165 || a.descLen < 70) { F("mittel", "Meta", "Description " + (a.descLen > 165 ? "zu lang" : "zu kurz") + " (" + a.descLen + " Z.): " + u + shellNote, "", { fixType: "Meta", fixTitle: "Description anpassen: " + u, proposal: "<ins>" + esc(proposeDesc(p.html)) + "</ins>" }); deduct.content += 2; }
    if (a.h1Count === 0) { F("hoch", "Content", "Keine H1: " + u + shellNote, "Hauptüberschrift fehlt — schwächt Thema-Signal und KI-Extraktion", { fixType: "Content", fixTitle: "H1 ergänzen: " + u, proposal: "<ins>H1 aus dem Titel ableiten: „" + esc((a.title || brand).split("|")[0].trim()) + "“</ins>" }); deduct.content += 4; }
    if (a.h1Count > 1) { F("mittel", "Content", a.h1Count + "× H1: " + u + shellNote, "Mehrere H1 verwässern die Struktur", { fixType: "Content", fixTitle: "H1-Struktur bereinigen: " + u, proposal: "Eine H1 behalten, übrige zu H2 abstufen" }); deduct.content += 2; }
    if (a.imgsNoAlt > 0) { F("mittel", "Alt-Texte", a.imgsNoAlt + " von " + a.imgs + " Bildern ohne Alt-Text: " + u + shellNote, "Barrierefreiheit + Bildersuche + KI-Verständnis", { fixType: "Alt-Texte", fixTitle: a.imgsNoAlt + " Alt-Texte ergänzen: " + u, proposal: "<ins>Beschreibende Alt-Texte für " + a.imgsNoAlt + " Bilder generieren (Vision-Modell im Produkt; Freigabe einzeln)</ins>" }); deduct.content += Math.min(4, a.imgsNoAlt); }
    if (a.canonical === null) { F("mittel", "Technik", "Kein Canonical: " + u + shellNote, "Duplikat-Signale unnötig offen", { fixType: "Technik", fixTitle: "Self-Canonical setzen: " + u, proposal: "<ins>&lt;link rel=&quot;canonical&quot; href=&quot;" + esc(row.url) + "&quot;&gt;</ins>" + (row.shell ? " — bei SPA pro Route dynamisch setzen" : "") }); deduct.technik += 2; }
    if (a.schemaTypes.length === 0) { F("mittel", "Schema", "Kein strukturiertes Markup: " + u + shellNote, "Keine JSON-LD-Daten gefunden", { fixType: "Schema", fixTitle: "Basis-Schema ergänzen: " + u, proposal: "<ins>Organization/WebPage-JSON-LD generieren" + (a.questionHeadings > 1 ? " + FAQPage aus " + a.questionHeadings + " vorhandenen Fragen" : "") + "</ins>" }); deduct.aeo += 3; }
    if (!a.lang) { F("mittel", "Technik", "html-lang fehlt: " + u + shellNote, "Sprachsignal für Suche und Screenreader", { fixType: "Technik", fixTitle: "lang-Attribut setzen: " + u, proposal: "<ins>&lt;html lang=&quot;de&quot;&gt;</ins>" }); deduct.technik += 1; }
    if (a.schemaInvalid) { F("hoch", "Schema", "Invalides JSON-LD: " + u + shellNote, "Markup wird ignoriert", { fixType: "Schema", fixTitle: "JSON-LD reparieren: " + u, proposal: "Syntaxfehler beheben (Validierung im Fließband)" }); deduct.aeo += 3; }
  }

  /* Doppelte Titel über verschiedene Inhalte hinweg (außerhalb der Shell-Gruppe) */
  const titleMap = {};
  for (const r of okRows) {
    if (r.shell || !r.title) continue;
    (titleMap[r.title] = titleMap[r.title] || []).push(r);
  }
  for (const t of Object.keys(titleMap)) {
    if (titleMap[t].length >= 2) {
      F("hoch", "Meta", "Doppelter Titel auf " + titleMap[t].length + " Seiten", "„" + esc(t.slice(0, 70)) + "“ — " + titleMap[t].map((r) => shortUrl(r.url)).join(", "),
        { fixType: "Meta", fixTitle: "Titel differenzieren (" + titleMap[t].length + " Seiten)", proposal: "<ins>Pro Seite eigenen Titel aus H1 + Intent ableiten</ins>" });
      deduct.content += 3;
    }
  }

  /* Site-weite GEO/Technik-Checks */
  if (!result.llmsTxt) {
    const list = okRows.map((r) => "- [" + esc((r.title || shortUrl(r.url)).split("|")[0].trim()) + "](" + esc(r.url) + ")").join("<br>");
    F("hoch", "GEO", "llms.txt fehlt", "KI-Systemen fehlt der kuratierte Einstieg in Ihre Inhalte", { fixType: "GEO", fixTitle: "llms.txt erzeugen", proposal: "<ins># " + esc(host) + "<br><br>" + list + "</ins>" });
    deduct.aeo += 4;
  }
  const blocked = Object.entries(result.aiBots).filter(([, v]) => v === "blockiert").map(([k]) => k);
  if (blocked.length) F("hoch", "GEO", "KI-Bots blockiert: " + blocked.join(", "), "Diese Systeme können Inhalte weder lesen noch zitieren — falls unbeabsichtigt: freigeben", { fixType: "GEO", fixTitle: "robots.txt: KI-Bots freigeben", proposal: "<del>Disallow: /</del> für " + blocked.join(", ") + " → <ins>Allow</ins> (bewusste Entscheidung nötig)" });
  if (!result.sitemap) { F("mittel", "Technik", "Keine sitemap.xml gefunden", "Erschwert vollständige Indexierung", { fixType: "Technik", fixTitle: "Sitemap erzeugen", proposal: "<ins>sitemap.xml aus " + result.pages.length + " gefundenen Seiten generieren</ins>" }); deduct.technik += 3; }
  if (!result.robotsFound) { F("mittel", "Technik", "Keine robots.txt", "Kein Steuersignal für Crawler", { fixType: "Technik", fixTitle: "robots.txt anlegen", proposal: "<ins>User-agent: *<br>Allow: /<br>Sitemap: " + esc(new URL("/sitemap.xml", base).href) + "</ins>" }); deduct.technik += 2; }

  /* Scores */
  const clamp = (v) => Math.max(5, Math.min(98, Math.round(v)));
  const altCover = okRows.reduce((s, r) => s + (r.imgs ? (r.imgs - r.imgsNoAlt) / r.imgs : 1), 0) / Math.max(1, okRows.length);
  result.scores = {
    technik: clamp(96 - deduct.technik),
    content: clamp(92 - deduct.content + altCover * 4),
    aeo: clamp(85 - deduct.aeo + okRows.reduce((s, r) => s + Math.min(3, r.questionHeadings || 0), 0)),
    geo: clamp(40 + (result.llmsTxt ? 18 : 0) + (blocked.length === 0 ? 18 : 0) + (okRows.some((r) => (r.schemaTypes || []).length) ? 10 : 0) + (result.sitemap ? 6 : 0) - (result.spa ? 18 : 0)),
  };
  const sevRank = { kritisch: 0, hoch: 1, mittel: 2 };
  result.findings.sort((x, y) => sevRank[x.severity] - sevRank[y.severity]);
  result.durationMs = Date.now() - start;
  return result;
}

/* ==========================================================================
   Domain-Verifizierung (echt: DNS-TXT oder Datei)
   ========================================================================== */
function loadVerify() {
  try { return JSON.parse(fs.readFileSync(VERIFY_FILE, "utf8")); } catch (e) { return {}; }
}
function saveVerify(data) {
  try { fs.writeFileSync(VERIFY_FILE, JSON.stringify(data, null, 2)); } catch (e) {}
}
function normHost(input) {
  let h = String(input || "").trim().toLowerCase();
  h = h.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(h)) return null;
  return h;
}
async function verifyCheck(host, token) {
  const methods = { dns: false, file: false };
  try {
    const records = await dns.resolveTxt("_nennwert." + host);
    methods.dns = records.flat().some((r) => r.includes("nennwert-verify=" + token));
  } catch (e) { /* NXDOMAIN etc. → nicht verifiziert */ }
  try {
    const r = await fetchRaw("https://" + host + "/nennwert-verify.txt");
    methods.file = r.status === 200 && r.body.includes(token);
  } catch (e) {}
  return { verified: methods.dns || methods.file, methods };
}

/* ==========================================================================
   Server
   ========================================================================== */
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".md": "text/markdown; charset=utf-8", ".php": "text/plain; charset=utf-8", ".zip": "application/zip" };

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(obj));
}
function validTarget(raw) {
  let target = String(raw || "");
  if (!/^https?:\/\//i.test(target)) target = "https://" + target;
  const parsed = new URL(target); // wirft bei Müll
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Nur http(s).");
  if (/^(localhost|\[|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) {
    throw new Error("Nur öffentliche Domains.");
  }
  return parsed.href;
}

function createServer() {
  return http.createServer(async (req, res) => {
    let u;
    try { u = new URL(req.url, "http://localhost"); } catch (e) { res.writeHead(400); res.end(); return; }

    try {
      if (u.pathname === "/api/analyze") {
        let href;
        try { href = validTarget(u.searchParams.get("url")); } catch (e) { return json(res, 400, { error: e.message }); }
        const data = await analyze(href);
        return json(res, 200, data);
      }
      if (u.pathname === "/api/verify/start") {
        const host = normHost(u.searchParams.get("domain"));
        if (!host) return json(res, 400, { error: "Ungültige Domain." });
        const store = loadVerify();
        if (!store[host] || !store[host].token) {
          store[host] = { token: crypto.randomBytes(12).toString("hex"), created: new Date().toISOString(), verified: false };
          saveVerify(store);
        }
        return json(res, 200, { host, token: store[host].token, verified: !!store[host].verified });
      }
      if (u.pathname === "/api/verify/check") {
        const host = normHost(u.searchParams.get("domain"));
        const store = loadVerify();
        if (!host || !store[host]) return json(res, 400, { error: "Erst Verifizierung starten." });
        const check = await verifyCheck(host, store[host].token);
        store[host].verified = check.verified;
        if (check.verified) store[host].verifiedAt = new Date().toISOString();
        saveVerify(store);
        return json(res, 200, Object.assign({ host, token: store[host].token }, check));
      }
    } catch (e) {
      return json(res, 500, { error: "Interner Fehler: " + (e && e.message ? e.message : String(e)) });
    }

    /* Statisch */
    let p = path.normalize(path.join(ROOT, decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname)));
    if (!p.startsWith(ROOT) || p.includes(".nennwert-verify")) { res.writeHead(403); res.end(); return; }
    fs.readFile(p, (err, buf) => {
      if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("404"); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
      res.end(buf);
    });
  });
}

/* Export für Tests · Start nur bei Direktaufruf */
module.exports = { stripTags, attr, esc, shortUrl, analyzeHtml, parseRobots, isDisallowed, botBlocked, proposeTitle, proposeDesc, detectShell, normHost, validTarget };
if (require.main === module) {
  createServer().listen(PORT, () =>
    console.log("NENNWERT SEO-Cockpit läuft auf http://localhost:" + PORT + " — API: /api/analyze · /api/verify/start · /api/verify/check")
  );
}
