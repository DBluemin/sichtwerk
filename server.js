/* ==========================================================================
   SICHTWERK Server — statische Auslieferung + echte Analyse-API
   Start:  node server.js   (Port 8899)
   API:    GET /api/analyze?url=https://beispiel-domain.de
   Ohne Dependencies · Node >= 18 (global fetch)
   Politeness: max. 8 Seiten, sequenziell, robots.txt wird respektiert,
   identifizierbarer User-Agent.
   ========================================================================== */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8899;
const ROOT = __dirname;
const UA = "SichtwerkBot/0.1 (+https://dbluemin.github.io/sichtwerk; Prototyp-Analyse auf Nutzeranfrage)";
const MAX_PAGES = 8;
const FETCH_TIMEOUT = 9000;

/* ---------------- HTTP-Helfer ---------------- */
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
      return { url: u, finalUrl: current, status: 0, chain, html: "", error: String(e && e.cause ? e.cause.code || e.cause : e.name || e) };
    }
    chain.push({ url: current, status: r.status });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location");
      if (!loc) return { url: u, finalUrl: current, status: r.status, chain, html: "" };
      current = new URL(loc, current).href;
      continue;
    }
    return { url: u, finalUrl: current, status: r.status, chain, html: r.body || "" };
  }
  return { url: u, finalUrl: current, status: 310, chain, html: "" };
}

/* ---------------- HTML-Parser (bewusst einfach) ---------------- */
function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function attr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']', "i"));
  return m ? m[1] : null;
}
function analyzeHtml(pageUrl, html) {
  const out = {};
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  out.title = titleM ? stripTags(titleM[1]).slice(0, 200) : "";
  out.titleLen = out.title.length;

  out.desc = "";
  out.noindex = false;
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  for (const m of metas) {
    const name = (attr(m, "name") || attr(m, "property") || "").toLowerCase();
    if (name === "description") out.desc = (attr(m, "content") || "").trim();
    if (name === "robots" && /noindex/i.test(attr(m, "content") || "")) out.noindex = true;
  }
  out.descLen = out.desc.length;

  const canonM = html.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/i);
  out.canonical = canonM ? attr(canonM[0], "href") : null;
  try {
    out.canonicalSelf = out.canonical
      ? new URL(out.canonical, pageUrl).href.replace(/\/$/, "") === pageUrl.replace(/\/$/, "")
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
  const lds = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of lds) {
    try {
      const json = JSON.parse(block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, ""));
      const collect = (node) => {
        if (!node || typeof node !== "object") return;
        if (node["@type"]) out.schemaTypes.push(String(node["@type"]));
        if (Array.isArray(node)) node.forEach(collect);
        if (node["@graph"]) collect(node["@graph"]);
      };
      collect(json);
    } catch (e) { /* invalides JSON-LD ist selbst ein Finding */ out.schemaInvalid = true; }
  }
  out.schemaTypes = [...new Set(out.schemaTypes)].slice(0, 8);

  out.links = [];
  const anchors = html.match(/<a\b[^>]*href\s*=\s*["'][^"']+["'][^>]*>/gi) || [];
  for (const a of anchors) {
    const href = attr(a, "href");
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    try { out.links.push(new URL(href, pageUrl).href.split("#")[0]); } catch (e) {}
  }
  return out;
}

/* ---------------- robots.txt (einfacher Parser) ---------------- */
function parseRobots(txt) {
  const groups = {}; // agent → [disallow]
  let agents = [];
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = line.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === "user-agent") {
      agents.push(val.toLowerCase());
      agents.forEach((a) => { if (!groups[a]) groups[a] = []; });
    } else if (key === "disallow") {
      agents.forEach((a) => groups[a].push(val));
      if (val === "") agents.forEach((a) => { /* leeres Disallow = alles erlaubt */ });
    } else if (key === "allow") {
      /* für den Prototyp ignoriert */
    }
    if (key !== "user-agent") agents = agents.length ? agents : agents;
    if (key === "disallow" || key === "allow") { /* Gruppe bleibt offen bis nächster user-agent-Block */ }
  }
  return groups;
}
function isDisallowed(groups, agent, pathName) {
  const rules = groups[agent.toLowerCase()] || groups["*"] || [];
  return rules.some((r) => r && r !== "/" === false ? pathName.startsWith(r) : r === "/" && pathName.startsWith("/")) ||
    rules.some((r) => r && pathName.startsWith(r));
}
function botBlocked(groups, bot) {
  const rules = groups[bot.toLowerCase()];
  if (!rules) return false;
  return rules.some((r) => r === "/" || r === "");
}

/* ---------------- Analyse-Lauf ---------------- */
async function analyze(target) {
  const start = Date.now();
  const base = new URL(target);
  const host = base.host;
  const brand = host.replace(/^www\./, "").split(".")[0];
  const result = { target: base.href, host, fetchedAt: new Date().toISOString(), pages: [], findings: [], proposals: [] };

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
  try {
    const s = await fetchRaw(new URL("/sitemap.xml", base).href, "GET");
    result.sitemap = s.status === 200;
  } catch (e) { result.sitemap = false; }
  try {
    const l = await fetchRaw(new URL("/llms.txt", base).href, "GET");
    result.llmsTxt = l.status === 200;
  } catch (e) { result.llmsTxt = false; }

  /* Startseite + bis zu 7 interne Seiten */
  const first = await fetchPage(base.href);
  if (first.status === 0 || !first.html) {
    result.error = "Startseite nicht erreichbar (" + (first.error || "HTTP " + first.status) + ")";
    return result;
  }
  const queue = [first];
  const seen = new Set([base.href.replace(/\/$/, "")]);
  const firstParsed = analyzeHtml(first.finalUrl, first.html);
  const candidates = [...new Set(firstParsed.links)]
    .filter((l) => { try { return new URL(l).host === host; } catch (e) { return false; } })
    .filter((l) => !/\.(pdf|jpg|jpeg|png|webp|svg|zip|mp4|css|js|xml)(\?|$)/i.test(l))
    .filter((l) => !isDisallowed(robotsGroups, "*", new URL(l).pathname))
    .slice(0, MAX_PAGES - 1);
  for (const c of candidates) {
    const key = c.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    await new Promise((r) => setTimeout(r, 250)); // Politeness-Pause
    queue.push(await fetchPage(c));
  }

  /* Seiten auswerten */
  const F = (severity, type, title, sub, fix) =>
    result.findings.push(Object.assign({ severity, type, title, sub }, fix || {}));

  let deduct = { technik: 0, content: 0, aeo: 0 };
  for (const p of queue) {
    const row = { url: p.finalUrl, requested: p.url, status: p.status, hops: p.chain.length - 1 };
    if (p.status !== 200 || !p.html) {
      row.error = p.error || "HTTP " + p.status;
      result.pages.push(row);
      F("kritisch", "Technik", "Seite nicht ladbar: " + short(p.url), row.error, null);
      deduct.technik += 12;
      continue;
    }
    const a = analyzeHtml(p.finalUrl, p.html);
    Object.assign(row, {
      title: a.title, titleLen: a.titleLen, descLen: a.descLen, canonicalSelf: a.canonicalSelf,
      noindex: a.noindex, h1Count: a.h1Count, imgs: a.imgs, imgsNoAlt: a.imgsNoAlt,
      words: a.words, schemaTypes: a.schemaTypes, questionHeadings: a.questionHeadings,
    });
    result.pages.push(row);
    const u = short(p.finalUrl);

    if (row.hops > 1) { F("hoch", "Technik", "Weiterleitungskette (" + row.hops + " Hops): " + u, p.chain.map((c) => c.status).join(" → "), { fixType: "Technik", fixTitle: "Redirect-Kette kürzen: " + u, proposal: "Direkt auf " + short(p.finalUrl) + " verlinken (1 Hop statt " + row.hops + ")" }); deduct.technik += 5; }
    if (a.noindex) { F("kritisch", "Technik", "noindex gesetzt: " + u, "Seite ist intern verlinkt, aber von der Indexierung ausgeschlossen", { fixType: "Technik", fixTitle: "noindex prüfen/entfernen: " + u, proposal: "<del>robots: noindex</del> → <ins>robots: index, follow</ins> (falls beabsichtigt: interne Links entfernen)" }); deduct.technik += 12; }
    if (!a.title) { F("kritisch", "Meta", "Titel fehlt: " + u, "Ohne <title> keine steuerbare SERP-Darstellung", { fixType: "Meta", fixTitle: "Titel erstellen: " + u, proposal: "<ins>" + esc(proposeTitle(a, brand)) + "</ins>" }); deduct.content += 8; }
    else if (a.titleLen > 62 || a.titleLen < 25) { F("mittel", "Meta", "Titel " + (a.titleLen > 62 ? "zu lang" : "zu kurz") + " (" + a.titleLen + " Z.): " + u, "„" + esc(a.title.slice(0, 70)) + "…“", { fixType: "Meta", fixTitle: "Titel optimieren: " + u, proposal: "<del>" + esc(a.title.slice(0, 90)) + "</del><br><ins>" + esc(proposeTitle(a, brand)) + "</ins>" }); deduct.content += 3; }
    if (!a.desc) { F("hoch", "Meta", "Description fehlt: " + u, "Google generiert dann selbst — CTR-Chance vertan", { fixType: "Meta", fixTitle: "Description erstellen: " + u, proposal: "<ins>" + esc(proposeDesc(p.html)) + "</ins>" }); deduct.content += 4; }
    else if (a.descLen > 165 || a.descLen < 70) { F("mittel", "Meta", "Description " + (a.descLen > 165 ? "zu lang" : "zu kurz") + " (" + a.descLen + " Z.): " + u, "", { fixType: "Meta", fixTitle: "Description anpassen: " + u, proposal: "<ins>" + esc(proposeDesc(p.html)) + "</ins>" }); deduct.content += 2; }
    if (a.h1Count === 0) { F("hoch", "Content", "Keine H1: " + u, "Hauptüberschrift fehlt — schwächt Thema-Signal und KI-Extraktion", { fixType: "Content", fixTitle: "H1 ergänzen: " + u, proposal: "<ins>H1 aus dem Titel ableiten: „" + esc((a.title || brand).split("|")[0].trim()) + "“</ins>" }); deduct.content += 4; }
    if (a.h1Count > 1) { F("mittel", "Content", a.h1Count + "× H1: " + u, "Mehrere H1 verwässern die Struktur", { fixType: "Content", fixTitle: "H1-Struktur bereinigen: " + u, proposal: "Eine H1 behalten, übrige zu H2 abstufen" }); deduct.content += 2; }
    if (a.imgsNoAlt > 0) { F("mittel", "Alt-Texte", a.imgsNoAlt + " von " + a.imgs + " Bildern ohne Alt-Text: " + u, "Barrierefreiheit + Bildersuche + KI-Verständnis", { fixType: "Alt-Texte", fixTitle: a.imgsNoAlt + " Alt-Texte ergänzen: " + u, proposal: "<ins>Beschreibende Alt-Texte für " + a.imgsNoAlt + " Bilder generieren (Vision-Modell im Produkt; Freigabe einzeln)</ins>" }); deduct.content += Math.min(4, a.imgsNoAlt); }
    if (a.canonical === null) { F("mittel", "Technik", "Kein Canonical: " + u, "Duplikat-Signale unnötig offen", { fixType: "Technik", fixTitle: "Self-Canonical setzen: " + u, proposal: "<ins>&lt;link rel=&quot;canonical&quot; href=&quot;" + esc(p.finalUrl) + "&quot;&gt;</ins>" }); deduct.technik += 2; }
    if (a.schemaTypes.length === 0) { F("mittel", "Schema", "Kein strukturiertes Markup: " + u, "Keine JSON-LD-Daten gefunden", { fixType: "Schema", fixTitle: "Basis-Schema ergänzen: " + u, proposal: "<ins>Organization/WebPage-JSON-LD generieren" + (a.questionHeadings > 1 ? " + FAQPage aus " + a.questionHeadings + " vorhandenen Fragen" : "") + "</ins>" }); deduct.aeo += 3; }
    if (a.questionHeadings === 0 && a.words > 300) { deduct.aeo += 2; }
    if (!a.lang) { F("mittel", "Technik", "html-lang fehlt: " + u, "Sprachsignal für Suche und Screenreader", { fixType: "Technik", fixTitle: "lang-Attribut setzen: " + u, proposal: "<ins>&lt;html lang=&quot;de&quot;&gt;</ins>" }); deduct.technik += 1; }
    if (a.schemaInvalid) { F("hoch", "Schema", "Invalides JSON-LD: " + u, "Markup wird ignoriert", { fixType: "Schema", fixTitle: "JSON-LD reparieren: " + u, proposal: "Syntaxfehler beheben (Validierung im Fließband)" }); deduct.aeo += 3; }
  }

  /* Site-weite GEO/AEO-Checks */
  if (!result.llmsTxt) {
    const list = result.pages.filter((p) => p.status === 200).map((p) => "- [" + (p.title || short(p.url)).split("|")[0].trim() + "](" + p.url + ")").join("\n");
    F("hoch", "GEO", "llms.txt fehlt", "KI-Systemen fehlt der kuratierte Einstieg in Ihre Inhalte", { fixType: "GEO", fixTitle: "llms.txt erzeugen", proposal: "<ins># " + esc(host) + "\n\n" + esc(list).replace(/\n/g, "<br>") + "</ins>" });
    deduct.aeo += 4;
  }
  const blocked = Object.entries(result.aiBots).filter(([, v]) => v === "blockiert").map(([k]) => k);
  if (blocked.length) F("hoch", "GEO", "KI-Bots blockiert: " + blocked.join(", "), "Diese Systeme können Inhalte weder lesen noch zitieren — falls unbeabsichtigt: freigeben", { fixType: "GEO", fixTitle: "robots.txt: KI-Bots freigeben", proposal: "<del>Disallow: /</del> für " + blocked.join(", ") + " → <ins>Allow</ins> (bewusste Entscheidung nötig)" });
  if (!result.sitemap) { F("mittel", "Technik", "Keine sitemap.xml gefunden", "Erschwert vollständige Indexierung", { fixType: "Technik", fixTitle: "Sitemap erzeugen", proposal: "<ins>sitemap.xml aus " + result.pages.length + " gefundenen Seiten generieren</ins>" }); deduct.technik += 3; }
  if (!result.robotsFound) { F("mittel", "Technik", "Keine robots.txt", "Kein Steuersignal für Crawler", { fixType: "Technik", fixTitle: "robots.txt anlegen", proposal: "<ins>User-agent: *\nAllow: /\nSitemap: " + esc(new URL("/sitemap.xml", base).href) + "</ins>" }); deduct.technik += 2; }

  /* Scores */
  const clamp = (v) => Math.max(5, Math.min(98, Math.round(v)));
  const okPages = result.pages.filter((p) => p.status === 200);
  const altCover = okPages.reduce((s, p) => s + (p.imgs ? (p.imgs - p.imgsNoAlt) / p.imgs : 1), 0) / Math.max(1, okPages.length);
  result.scores = {
    technik: clamp(96 - deduct.technik),
    content: clamp(92 - deduct.content + altCover * 4),
    aeo: clamp(85 - deduct.aeo + okPages.reduce((s, p) => s + Math.min(3, p.questionHeadings || 0), 0)),
    geo: clamp(40 + (result.llmsTxt ? 20 : 0) + (blocked.length === 0 ? 20 : 0) + (okPages.some((p) => (p.schemaTypes || []).length) ? 12 : 0) + (result.sitemap ? 6 : 0)),
  };
  const sevRank = { kritisch: 0, hoch: 1, mittel: 2 };
  result.findings.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
  result.durationMs = Date.now() - start;
  return result;
}
function short(u) { try { const x = new URL(u); return x.pathname === "/" ? x.host : x.pathname; } catch (e) { return u; } }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function proposeTitle(a, brand) {
  const core = (a.title || "").split(/[|–—-]/)[0].trim() || "Startseite";
  const b = brand.charAt(0).toUpperCase() + brand.slice(1);
  let t = core + " | " + b;
  if (t.length > 60) t = core.slice(0, 57 - b.length).trim() + "… | " + b;
  return t;
}
function proposeDesc(html) {
  const text = stripTags(html);
  let d = text.slice(0, 170);
  d = d.slice(0, d.lastIndexOf(" ") > 100 ? d.lastIndexOf(" ") : 152).trim();
  return d + " …";
}

/* ---------------- Server ---------------- */
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".md": "text/markdown; charset=utf-8" };
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  if (u.pathname === "/api/analyze") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    let target = u.searchParams.get("url") || "";
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;
    try {
      const parsed = new URL(target);
      if (!/^https?:$/.test(parsed.protocol) || /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) {
        res.writeHead(400); res.end(JSON.stringify({ error: "Nur öffentliche http(s)-Domains." })); return;
      }
      const data = await analyze(parsed.href);
      res.writeHead(200); res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: "Analyse fehlgeschlagen: " + (e && e.message ? e.message : String(e)) }));
    }
    return;
  }
  /* Statisch */
  let p = path.normalize(path.join(ROOT, decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname)));
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("404"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(buf);
  });
}).listen(PORT, () => console.log("SICHTWERK läuft auf http://localhost:" + PORT + " — Analyse-API: /api/analyze?url=…"));
