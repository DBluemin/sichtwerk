/* ==========================================================================
   SICHTWERK · ein DentalConnect Produkt — gemeinsame Logik
   Shell (Nav + Agent-Dock) · Datenlayer (localStorage) · Chart-Engine
   Hinweis Prototyp: Der Datenlayer simuliert das Backend aus KONZEPT.md
   (Change-Sets, Stages, Freigaben) clientseitig und persistiert im Browser.
   ========================================================================== */
(function () {
  "use strict";
  const WERK = (window.WERK = {});

  /* ================= Navigation ================= */
  const ICONS = {
    grid: '<rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1"/><rect x="9" y="9" width="5.5" height="5.5" rx="1"/>',
    globe: '<circle cx="8" cy="8" r="6.5"/><path d="M1.5 8h13M8 1.5c-4 3.5-4 9.5 0 13 4-3.5 4-9.5 0-13z"/>',
    doc: '<path d="M3 2h10v12H3z"/><path d="M5.5 5h5M5.5 8h5M5.5 11h3"/>',
    link: '<path d="M6 10 10 6M4.5 8 2.8 9.7a2.5 2.5 0 0 0 3.5 3.5L8 11.5M11.5 8l1.7-1.7a2.5 2.5 0 0 0-3.5-3.5L8 4.5"/>',
    search: '<circle cx="7" cy="7" r="4.5"/><path d="m13.5 13.5-3.2-3.2"/>',
    star: '<path d="M8 1.5 9.6 6 14 6.4l-3.4 2.9 1.1 4.4L8 11.2l-3.7 2.5 1.1-4.4L2 6.4 6.4 6z"/>',
    bot: '<rect x="2" y="3" width="12" height="9" rx="2"/><path d="M5 7.5h.01M8 7.5h.01M11 7.5h.01M8 12v2"/>',
    bars: '<path d="M2 13.5V9M6 13.5V5.5M10 13.5V7.5M14 13.5V3"/>',
    pin: '<path d="M8 14s5-4.5 5-8a5 5 0 1 0-10 0c0 3.5 5 8 5 8z"/><circle cx="8" cy="6" r="1.8"/>',
    check: '<path d="m6 8 1.5 1.5L10.5 6"/><rect x="2" y="2" width="12" height="12" rx="3"/>',
    report: '<path d="M3 13.5h10M4.5 13.5V8M8 13.5V4M11.5 13.5V6.5"/>',
    gear: '<circle cx="8" cy="8" r="2"/><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6 5 5M11 11l1.4 1.4M12.4 3.6 11 5M5 11l-1.4 1.4"/>',
  };
  const NAV = [
    { group: "Steuerung" },
    { id: "dashboard", href: "dashboard.html", label: "Übersicht", icon: "grid" },
    { id: "crawls", href: "crawls.html", label: "Crawls & Technik", icon: "globe" },
    { id: "content", href: "content.html", label: "Content", icon: "doc" },
    { id: "links", href: "links.html", label: "Interne Links", icon: "link" },
    { id: "keywords", href: "keywords.html", label: "Keywords & Chancen", icon: "search" },
    { group: "KI-Suche" },
    { id: "aeo", href: "aeo.html", label: "AEO / Antwortboxen", icon: "star" },
    { id: "geo", href: "geo.html", label: "GEO / KI-Zitationen", icon: "bot" },
    { group: "Markt" },
    { id: "wettbewerber", href: "wettbewerber.html", label: "Wettbewerber", icon: "bars" },
    { id: "lokal", href: "lokal.html", label: "Lokal & International", icon: "pin" },
    { group: "Umsetzung" },
    { id: "massnahmen", href: "massnahmen.html", label: "Maßnahmen", icon: "check", badge: true },
    { id: "berichte", href: "berichte.html", label: "Berichte", icon: "report" },
    { id: "einstellungen", href: "einstellungen.html", label: "Einstellungen", icon: "gear" },
  ];

  function svgIcon(name) {
    return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">' + ICONS[name] + "</svg>";
  }

  function renderNav(active) {
    const el = document.getElementById("navRoot");
    if (!el) return;
    let h = '<a class="brand" href="dashboard.html"><div class="brand-mark" aria-hidden="true"></div><div class="brand-name">SICHTWERK</div></a>';
    h += '<div class="brand-by">ein <b>DentalConnect</b> Produkt</div>';
    NAV.forEach((n) => {
      if (n.group) { h += '<div class="nav-group-label">' + n.group + "</div>"; return; }
      h += '<a class="nav-item' + (n.id === active ? " active" : "") + '" href="' + n.href + '">' + svgIcon(n.icon) +
        "<span>" + n.label + "</span>" +
        (n.badge ? '<b class="nav-badge" data-badge>0</b>' : "") + "</a>";
    });
    h += '<div class="nav-foot"><span class="dot">●</span> Alle Worker aktiv · v2.4.1<br>© DentalConnect · EU (Amsterdam)</div>';
    el.innerHTML = h;
  }

  /* ================= Datenlayer (simuliertes Backend) ================= */
  const STORE_KEY = "sichtwerk.v2";
  const SEED = {
    autopilot: 1,
    massnahmen: [
      { id: "e1", stage: "erkannt", type: "Technik", title: "Duplicate Content", url: "/behandlungen/bleaching + 3 Varianten", note: "4 URLs mit 94 % identischem Inhalt, kein Canonical. Vorschlag wird generiert." },
      { id: "e2", stage: "erkannt", type: "Links", title: "Verwaiste Seite", url: "/ratgeber/angstpatienten", note: "0 interne Links, aber 320 Suchanfragen/Monat im Themencluster." },
      { id: "e3", stage: "erkannt", type: "CWV", title: "LCP-Verschlechterung", url: "/standorte/muenchen", note: "LCP p75 von 2,1 s auf 3,4 s — Hero-Bild ohne Priorität geladen." },
      { id: "g1", stage: "generiert", type: "Schema", title: "FAQ-Markup", url: "/behandlungen/zahnimplantate", note: "FAQPage-Schema aus 6 bestehenden Fragen erzeugt, Validierung läuft …" },
      { id: "g2", stage: "generiert", type: "Content", title: "Semantische Lücken", url: "/behandlungen/wurzelbehandlung", note: "11 fehlende Begriffe ergänzt (u. a. „Revision“, „Mikroskop“). Konsistenzprüfung läuft …" },
      { id: "p1", stage: "pruefung", type: "Meta", title: "Titel zu lang, CTR schwach", url: "/behandlungen/zahnimplantate", detail: "url-detail.html",
        diff: "<del>Zahnimplantate | SmileDental Gruppe München Zahnarzt Implantologie</del><br><ins>Zahnimplantate München: Kosten, Ablauf &amp; Beratung | SmileDental</ins>" },
      { id: "p2", stage: "pruefung", type: "Alt-Texte", title: "14 Bilder ohne Beschreibung", url: "/standorte/muenchen · Galerie",
        diff: "<ins>„Behandlungszimmer 3 mit Dental-Mikroskop, Standort München-Schwabing“</ins> + 13 weitere", approveLabel: "Alle freigeben" },
      { id: "p3", stage: "pruefung", type: "Links", title: "6 interne Links setzen", url: "Cluster „Implantologie“ → Pillar-Seite",
        diff: "<ins>„Knochenaufbau“ → /zahnimplantate</ins>, <ins>„Sofortimplantat“ → /zahnimplantate</ins> + 4 weitere" },
      { id: "p4", stage: "pruefung", type: "AEO", title: "Antwortabsatz „Kosten“ platzieren", url: "/behandlungen/zahnimplantate", detail: "url-detail.html",
        diff: "<ins>„Ein Zahnimplantat kostet in München je nach Aufwand 1.800–3.500 € …“</ins> (42 Wörter, unter der H1)" },
      { id: "p5", stage: "pruefung", type: "EEAT", title: "Autorenbox mit Facharzt-Nachweis", url: "23 Ratgeber-Artikel",
        diff: "<ins>Autorenprofil „Dr. med. dent. S. Maier, Fachzahnärztin für Oralchirurgie“ + Person-Schema</ins>" },
      { id: "p6", stage: "pruefung", type: "Technik", title: "hreflang de-AT reparieren", url: "6 URLs · Standort-Rollout AT",
        diff: "<del>de-AT → /at/behandlungen/… (404)</del><br><ins>de-AT → /at/leistungen/… (200)</ins>" },
      { id: "p7", stage: "pruefung", type: "Schema", title: "LocalBusiness für Nürnberg", url: "/standorte/nuernberg",
        diff: "<ins>MedicalClinic-Schema: Öffnungszeiten, Geo, 4,8★ (214 Bewertungen)</ins>" },
      { id: "p8", stage: "pruefung", type: "Meta", title: "12 Descriptions unter 70 Zeichen", url: "Ratgeber-Cluster",
        diff: "<ins>12 neue Descriptions, je 140–155 Zeichen, mit Antwort-Hook</ins>", approveLabel: "Alle freigeben" },
      { id: "l1", stage: "live", type: "Meta", title: "Description erneuert", url: "/behandlungen/prophylaxe", liveMeta: "✓ Live seit 08:14 · CTR-Beobachtung 14 Tage" },
      { id: "l2", stage: "live", type: "Schema", title: "LocalBusiness ergänzt", url: "/standorte/augsburg", liveMeta: "✓ Live seit gestern · Rich-Result bestätigt" },
      { id: "l3", stage: "live", type: "Alt-Texte", title: "12 Alt-Texte ergänzt", url: "/behandlungen/zahnimplantate", liveMeta: "✓ Live seit 30.07. · in Beobachtung" },
    ],
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* Quota/Parse: mit Seed weiterarbeiten */ }
    return JSON.parse(JSON.stringify(SEED));
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  WERK.store = {
    all: () => state.massnahmen,
    byStage: (s) => state.massnahmen.filter((m) => m.stage === s),
    counts: () => {
      const c = { erkannt: 0, generiert: 0, pruefung: 0, live: 0, rejected: 0, rolledback: 0 };
      state.massnahmen.forEach((m) => { c[m.stage] = (c[m.stage] || 0) + 1; });
      return c;
    },
    get: (id) => state.massnahmen.find((m) => m.id === id),
    setStage: (id, stage, extra) => {
      const m = WERK.store.get(id);
      if (!m) return;
      m.stage = stage;
      if (extra) Object.assign(m, extra);
      save(); WERK.updateBadge();
    },
    add: (item) => {
      item.id = item.id || "x" + Date.now();
      state.massnahmen.unshift(item);
      save(); WERK.updateBadge();
      return item;
    },
    autopilot: {
      get: () => state.autopilot,
      set: (lvl) => { state.autopilot = lvl; save(); },
    },
    reset: () => { state = JSON.parse(JSON.stringify(SEED)); save(); WERK.updateBadge(); },
  };

  WERK.updateBadge = function () {
    const n = WERK.store.counts().pruefung;
    document.querySelectorAll("[data-badge]").forEach((el) => (el.textContent = n));
    document.querySelectorAll("[data-pruefung-count]").forEach((el) => (el.textContent = n));
  };

  /* ================= Agent-Dock ================= */
  const FALLBACK =
    "Aufgenommen — ich prüfe Crawl-Daten, Rankings und NENNWERT-Zitationen und lege konkrete Maßnahmen ins Fließband. Nichts geht ohne Ihre Freigabe live.";
  let dockCanned = {};

  function renderDock(cfg) {
    const el = document.getElementById("dockRoot");
    if (!el) return;
    cfg = cfg || {};
    dockCanned = cfg.canned || {};
    let h =
      '<div class="dock-head"><div class="dock-ava">S</div><div><div class="dock-title">Werksleiter</div>' +
      '<div class="dock-sub">Analysiert · plant · setzt um</div></div><span class="dock-status" title="Bereit"></span></div>';
    if (cfg.context) h += '<div class="dock-context">Kontext: <b>' + cfg.context + "</b></div>";
    h += '<div class="dock-body" id="dockBody">' + (cfg.seed || "") + "</div>";
    h += '<div class="chips-q">' + (cfg.chips || [])
      .map((c) => '<button class="chip-q" data-chip>' + c + "</button>").join("") + "</div>";
    h +=
      '<div class="dock-input"><form class="dock-field" id="dockForm">' +
      '<input id="agentInput" type="text" placeholder="' + (cfg.placeholder || "Anweisung oder Frage an den Agenten …") + '" autocomplete="off">' +
      '<button class="dock-send" type="submit" aria-label="Senden">→</button></form>' +
      '<div class="dock-note">Der Agent ändert nichts ohne Ihre Freigabe im Fließband.</div></div>';
    el.innerHTML = h;

    el.querySelectorAll("[data-chip]").forEach((b) =>
      b.addEventListener("click", () => { WERK.agentSay(b.textContent, true); })
    );
    document.getElementById("dockForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = document.getElementById("agentInput");
      const q = inp.value.trim();
      if (q) { inp.value = ""; WERK.agentSay(q, true); }
    });
  }

  WERK.addMsg = function (cls, html) {
    const body = document.getElementById("dockBody");
    if (!body) return;
    const div = document.createElement("div");
    div.className = "msg " + cls;
    div.innerHTML = cls === "msg-agent" ? '<div class="who">Werksleiter</div><div class="bubble">' + html + "</div>" : html;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  };
  WERK.agentSay = function (q, echo) {
    if (echo) WERK.addMsg("msg-user", q);
    const key = q.trim().toLowerCase();
    setTimeout(() => WERK.addMsg("msg-agent", dockCanned[key] || FALLBACK), 600);
  };
  WERK.agentNote = function (html) { WERK.addMsg("msg-agent", html); };
  WERK.focusAgent = function () { const i = document.getElementById("agentInput"); if (i) i.focus(); };

  /* ================= Fließband ================= */
  const STAGE_META = [
    ["erkannt", "Erkannt"], ["generiert", "Generiert"], ["pruefung", "Ihre Prüfung"], ["live", "Live"],
  ];
  function cardHtml(m) {
    let h = '<div class="card" data-id="' + m.id + '">';
    h += '<div class="card-type"><span class="tchip">' + m.type + "</span> " + m.title + "</div>";
    h += '<div class="card-url">' + (m.detail ? '<a href="' + m.detail + '">' + m.url + "</a>" : m.url) + "</div>";
    if (m.diff) h += '<div class="card-diff">' + m.diff + "</div>";
    if (m.note) h += '<div class="card-note">' + m.note + "</div>";
    if (m.stage === "pruefung")
      h += '<div class="card-actions"><button class="approve" data-approve>' + (m.approveLabel || "Freigeben") +
        '</button><button class="reject" data-reject>Verwerfen</button></div>';
    if (m.stage === "live" && m.liveMeta) h += '<div class="card-live-meta">' + m.liveMeta + "</div>";
    h += "</div>";
    return h;
  }
  WERK.renderBand = function (rootId, filterType) {
    const root = document.getElementById(rootId);
    if (!root) return;
    root.innerHTML = STAGE_META.map(([stage, label]) => {
      const items = WERK.store.byStage(stage).filter((m) => !filterType || m.type === filterType);
      return '<div class="lane" data-stage="' + stage + '"><div class="lane-head">' + label +
        ' <span class="cnt">' + items.length + "</span></div>" + items.map(cardHtml).join("") + "</div>";
    }).join("");

    root.querySelectorAll("[data-approve]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const card = btn.closest(".card");
        const id = card.dataset.id;
        card.classList.add("leaving");
        setTimeout(() => {
          WERK.store.setStage(id, "live", { liveMeta: "✓ Soeben live · Version gesichert, Rollback möglich" });
          WERK.renderBand(rootId, filterType);
          WERK.agentNote("Change-Set freigegeben und ausgespielt — Wirkungsmessung über 14 Tage läuft.");
        }, 280);
      })
    );
    root.querySelectorAll("[data-reject]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const card = btn.closest(".card");
        const id = card.dataset.id;
        card.classList.add("leaving");
        setTimeout(() => { WERK.store.setStage(id, "rejected"); WERK.renderBand(rootId, filterType); }, 280);
      })
    );
  };

  /* ================= Chart-Engine ================= */
  /* host: Element mit position:relative-Umfeld (.chart-wrap) — wird befüllt.
     cfg: { labels, series:[{name,hex,vals}], unit, invert, min, max,
            yTicks, events:[{id,idx,label}], areaFirst, h } */
  WERK.chart = function (host, cfg) {
    const W = 900, H = cfg.h || 250, PAD = { t: 26, r: 170, b: 28, l: 44 };
    host.innerHTML = '<svg class="chart-svg" viewBox="0 0 ' + W + " " + H + '" role="img"></svg><div class="tooltip"></div>';
    const svg = host.querySelector("svg");
    const tt = host.querySelector(".tooltip");

    function draw(c) {
      const n = c.labels.length;
      const x = (i) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
      const y = (v) => {
        const t = (v - c.min) / (c.max - c.min);
        return PAD.t + (c.invert ? t : 1 - t) * (H - PAD.t - PAD.b);
      };
      const fmt = (v) => String(v).replace(".", ",");
      let out = "";

      const ticks = c.yTicks || [0, 1, 2, 3].map((s) => c.min + ((c.max - c.min) / 3) * s);
      ticks.forEach((v) => {
        const yy = y(v);
        out += '<line x1="' + PAD.l + '" x2="' + (W - PAD.r) + '" y1="' + yy + '" y2="' + yy + '" stroke="#16223A" stroke-width="1"/>';
        out += '<text x="' + (PAD.l - 8) + '" y="' + (yy + 3.5) + '" text-anchor="end" font-family="IBM Plex Mono" font-size="10" fill="#5A6B8C">' + fmt(Math.round(v * 10) / 10) + "</text>";
      });
      if (c.invert) out += '<text x="' + (PAD.l - 8) + '" y="' + (PAD.t - 10) + '" text-anchor="end" font-family="Instrument Sans" font-size="9.5" fill="#5A6B8C">Pos. 1 = oben</text>';
      c.labels.forEach((lb, i) => {
        if (i % 2 === 0) out += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-family="IBM Plex Mono" font-size="10" fill="#5A6B8C">' + lb + "</text>";
      });

      (c.events || []).forEach((ev) => {
        const ex = x(ev.idx);
        out += '<line x1="' + ex + '" x2="' + ex + '" y1="' + (PAD.t - 4) + '" y2="' + (H - PAD.b) + '" stroke="#45C486" stroke-width="1" stroke-dasharray="3 3" opacity=".55"/>';
        out += '<circle cx="' + ex + '" cy="' + (PAD.t - 11) + '" r="8" fill="rgba(69,196,134,.13)" stroke="rgba(69,196,134,.5)" stroke-width="1"/>';
        out += '<text x="' + ex + '" y="' + (PAD.t - 7.5) + '" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#45C486">' + ev.id + "</text>";
      });

      if (c.areaFirst !== false) {
        const s0 = c.series[0];
        let area = "M " + x(0) + " " + y(s0.vals[0]);
        s0.vals.forEach((v, i) => (area += " L " + x(i) + " " + y(v)));
        area += " L " + x(n - 1) + " " + (H - PAD.b) + " L " + x(0) + " " + (H - PAD.b) + " Z";
        out += '<defs><linearGradient id="gA' + H + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s0.hex + '" stop-opacity=".18"/><stop offset="1" stop-color="' + s0.hex + '" stop-opacity="0"/></linearGradient></defs>';
        out += '<path d="' + area + '" fill="url(#gA' + H + ')"/>';
      }

      c.series.forEach((s, si) => {
        let p = "M " + x(0) + " " + y(s.vals[0]);
        s.vals.forEach((v, i) => (p += " L " + x(i) + " " + y(v)));
        out += '<path d="' + p + '" fill="none" stroke="' + s.hex + '" stroke-width="' + (si === 0 ? 2.5 : 2) + '" stroke-linejoin="round"' + (si === 0 ? "" : ' opacity=".85"') + "/>";
        out += '<circle cx="' + x(n - 1) + '" cy="' + y(s.vals[n - 1]) + '" r="3.5" fill="' + s.hex + '" stroke="#0C1526" stroke-width="2"/>';
      });

      const labels = c.series.map((s, si) => ({ si, v: s.vals[n - 1], ly: y(s.vals[n - 1]) })).sort((a, b) => a.ly - b.ly);
      for (let i = 1; i < labels.length; i++)
        if (labels[i].ly - labels[i - 1].ly < 14) labels[i].ly = labels[i - 1].ly + 14;
      labels.forEach(({ si, v, ly }) => {
        const s = c.series[si];
        out += '<text x="' + (x(n - 1) + 10) + '" y="' + (ly + 3.5) + '" font-family="Instrument Sans" font-size="10.5" font-weight="' + (si === 0 ? 700 : 500) + '" fill="' + (si === 0 ? "#EAF0FA" : "#93A5C4") + '">' + s.name + " · " + (c.invert ? "Pos. " : "") + fmt(v) + (c.unit || "") + "</text>";
      });

      out += '<line data-xhair x1="0" x2="0" y1="' + PAD.t + '" y2="' + (H - PAD.b) + '" stroke="#5A6B8C" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>';
      out += '<rect data-zone x="' + PAD.l + '" y="' + PAD.t + '" width="' + (W - PAD.l - PAD.r) + '" height="' + (H - PAD.t - PAD.b) + '" fill="transparent"/>';
      svg.innerHTML = out;

      const zone = svg.querySelector("[data-zone]");
      const xhair = svg.querySelector("[data-xhair]");
      zone.addEventListener("mousemove", (e) => {
        const r = svg.getBoundingClientRect();
        const mx = ((e.clientX - r.left) / r.width) * W;
        const i = Math.max(0, Math.min(n - 1, Math.round(((mx - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1))));
        const cx = x(i);
        xhair.setAttribute("x1", cx); xhair.setAttribute("x2", cx); xhair.setAttribute("opacity", "1");
        const ev = (c.events || []).find((ev) => ev.idx === i);
        tt.innerHTML = '<div class="tt-date">' + c.labels[i] + "</div>" +
          c.series.map((s) => '<div class="tt-row"><i style="background:' + s.hex + '"></i>' + s.name + "<b>" + (c.invert ? "Pos. " : "") + fmt(s.vals[i]) + (c.unit || "") + "</b></div>").join("") +
          (ev ? '<div class="tt-ev">● Change-Set ' + ev.id + " live: " + ev.label + "</div>" : "");
        tt.classList.add("show");
        const wr = host.getBoundingClientRect();
        tt.style.left = Math.min((cx / W) * wr.width + 16, wr.width - 205) + "px";
        tt.style.top = "20px";
      });
      zone.addEventListener("mouseleave", () => { xhair.setAttribute("opacity", "0"); tt.classList.remove("show"); });
    }
    draw(Object.assign({}, cfg));
    return { update: (c2) => draw(Object.assign({}, cfg, c2)) };
  };

  WERK.legend = function (el, series, extra) {
    el.innerHTML = series.map((s, si) =>
      '<span class="leg"><i style="background:' + s.hex + '"></i>' + (si === 0 ? "<b>" + s.name + "</b>" : s.name) + "</span>").join("") + (extra || "");
  };

  WERK.spark = function (el) {
    const vals = el.dataset.spark.split(",").map(Number);
    const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), rng = max - min || 1;
    const w = 52, h = 20;
    const pts = vals.map((v, i) => (i / (vals.length - 1)) * w + "," + (h - 3 - ((v - min) / rng) * (h - 6))).join(" ");
    const up = vals[vals.length - 1] >= vals[0];
    el.innerHTML = '<polyline points="' + pts + '" fill="none" stroke="' + (up ? "#45C486" : "#E4566B") + '" stroke-width="1.5" opacity=".75"/>';
  };

  WERK.hbars = function (el, rows) {
    const max = Math.max.apply(null, rows.map((r) => r.max || r.val));
    el.innerHTML = rows.map((r) =>
      '<div class="hbar"><span class="hb-label">' + r.label + '</span><span class="hb-track"><i class="hb-fill" style="width:' +
      Math.max(2, (r.val / (r.max || max)) * 100) + "%" + (r.hex ? ";background:" + r.hex : "") + '"></i></span><span class="hb-val">' +
      r.display + "</span></div>").join("");
  };

  /* ================= Fix-Buttons (Finding → Change-Set) ================= */
  WERK.bindFixButtons = function () {
    document.querySelectorAll("[data-fix]").forEach((btn) =>
      btn.addEventListener("click", () => {
        btn.disabled = true;
        btn.textContent = "Wird generiert …";
        setTimeout(() => {
          WERK.store.add({
            stage: "pruefung", type: btn.dataset.fix, title: btn.dataset.title,
            url: btn.dataset.url || "siehe Titel",
            diff: "<ins>Vorschlag generiert — Details im Fließband prüfen</ins>",
          });
          const s = document.createElement("span");
          s.className = "inband";
          s.textContent = "Liegt im Fließband";
          btn.replaceWith(s);
          WERK.agentNote('Fix generiert — <a href="massnahmen.html" style="color:var(--act)">im Fließband freigeben</a>.');
        }, 900);
      })
    );
  };

  /* ================= Topbar-Bausteine ================= */
  WERK.topbarHtml = function (opts) {
    opts = opts || {};
    return (
      '<button class="proj"><span class="proj-fav"></span> smiledental-gruppe.de <span class="chev">▾</span></button>' +
      '<div class="search" role="search"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><path d="m13.5 13.5-3.2-3.2"/></svg>' +
      '<span class="q">URL, Keyword oder Befehl suchen …</span> <kbd>⌘K</kbd></div>' +
      '<div class="crawl-chip"><span class="pulse"></span> Crawl läuft · <b data-crawl>4.812&thinsp;/&thinsp;6.240</b> Seiten</div>' +
      '<button class="btn btn-ghost">Neuer Crawl</button>' +
      '<button class="btn btn-primary" onclick="WERK.focusAgent()">Agent fragen</button>'
    );
  };
  function tickCrawl() {
    const el = document.querySelector("[data-crawl]");
    if (!el) return;
    let done = 4812;
    setInterval(() => {
      done = Math.min(6240, done + Math.floor(Math.random() * 9) + 3);
      el.innerHTML = done.toLocaleString("de-DE") + "&thinsp;/&thinsp;6.240";
    }, 2400);
  }

  /* ================= Init ================= */
  WERK.init = function (opts) {
    opts = opts || {};
    renderNav(opts.page);
    renderDock(opts.dock);
    const tb = document.getElementById("topbarRoot");
    if (tb) tb.innerHTML = WERK.topbarHtml();
    WERK.updateBadge();
    tickCrawl();
    document.querySelectorAll("[data-spark]").forEach(WERK.spark);
  };
})();
