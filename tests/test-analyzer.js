/* NENNWERT SEO-Cockpit — Testsuite für die Analyse-Logik
   Ausführen:  node tests/test-analyzer.js  (Exit-Code 0 = alles grün) */
"use strict";
const S = require("../server.js");

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.error("  ✗ FAIL: " + name); }
}

/* ---------- robots.txt ---------- */
console.log("robots.txt-Parser");
const g1 = S.parseRobots("User-agent: *\nDisallow: /admin\n\nUser-agent: GPTBot\nDisallow: /");
t("Gruppen erkannt (* und gptbot)", !!g1["*"] && !!g1["gptbot"]);
t("GPTBot komplett blockiert", S.botBlocked(g1, "GPTBot") === true);
t("ClaudeBot nicht blockiert (keine eigene Gruppe, * blockt nicht alles)", S.botBlocked(g1, "ClaudeBot") === false);
t("/admin für * gesperrt", S.isDisallowed(g1, "*", "/admin/login") === true);
t("/behandlungen für * frei", S.isDisallowed(g1, "*", "/behandlungen") === false);

const g2 = S.parseRobots("User-agent: *\nDisallow:");
t("Leeres Disallow = alles erlaubt", S.isDisallowed(g2, "*", "/x") === false);

const g3 = S.parseRobots("User-agent: a\nUser-agent: b\nDisallow: /x\nUser-agent: c\nDisallow: /y");
t("Mehrfach-Agenten teilen Regeln", S.isDisallowed(g3, "b", "/x/1") === true);
t("Neue Gruppe nach Regel getrennt", S.isDisallowed(g3, "c", "/x/1") === false && S.isDisallowed(g3, "c", "/y") === true);

const g4 = S.parseRobots("User-agent: *\nDisallow: /a\nAllow: /a/frei");
t("Allow mit längerem Pfad gewinnt", S.isDisallowed(g4, "*", "/a/frei/seite") === false && S.isDisallowed(g4, "*", "/a/zu") === true);

/* ---------- HTML-Analyse ---------- */
console.log("HTML-Analyse");
const HTML = `<!DOCTYPE html><html lang="de"><head>
<title>Zahnimplantate München | Praxis</title>
<meta name="description" content="Feste Zähne an einem Tag.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://praxis.de/implantate">
<meta name="viewport" content="width=device-width">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"MedicalClinic"},{"@type":"FAQPage"}]}</scr` + `ipt>
</head><body>
<h1>Implantate</h1><h2>Was kostet ein Implantat?</h2><h2>Ablauf</h2>
<img src="a.jpg" alt="Behandlungszimmer"><img src="b.jpg"><img src="c.jpg" alt="">
<a href="/kontakt">Kontakt</a><a href="https://extern.de/x">Extern</a><a href="#top">Anker</a><a href="mailto:a@b.de">Mail</a>
</body></html>`;
const a = S.analyzeHtml("https://praxis.de/implantate", HTML);
t("Titel extrahiert", a.title === "Zahnimplantate München | Praxis");
t("Description extrahiert", a.desc === "Feste Zähne an einem Tag.");
t("Canonical = self erkannt", a.canonicalSelf === true);
t("kein noindex", a.noindex === false);
t("1× H1, 2× H2", a.h1Count === 1 && a.h2Count === 2);
t("Fragen-Überschrift erkannt", a.questionHeadings === 1);
t("3 Bilder, 2 ohne Alt", a.imgs === 3 && a.imgsNoAlt === 2);
t("Schema-Typen aus @graph", a.schemaTypes.includes("MedicalClinic") && a.schemaTypes.includes("FAQPage"));
t("lang erkannt", a.lang === "de");
t("Links: nur echte URLs (2)", a.links.length === 2);

const bad = S.analyzeHtml("https://x.de/", '<html><head><script type="application/ld+json">{kaputt</scr' + 'ipt><meta name="robots" content="noindex"></head><body></body></html>');
t("Invalides JSON-LD markiert", bad.schemaInvalid === true);
t("noindex erkannt", bad.noindex === true);
t("Kein Titel → leer, Länge 0", bad.title === "" && bad.titleLen === 0);

/* ---------- Vorschläge ---------- */
console.log("Vorschlags-Generatoren");
const long = S.proposeTitle({ title: "Ein extrem langer Seitentitel der niemals in die Suchergebnisse passen würde weil viel zu lang" }, "praxisname");
t("proposeTitle ≤ 62 Zeichen", long.length <= 62);
t("proposeTitle enthält Marke", long.toLowerCase().includes("praxisname"));
const desc = S.proposeDesc("<p>" + "Wort ".repeat(100) + "</p>");
t("proposeDesc 100–175 Zeichen", desc.length >= 100 && desc.length <= 175);

/* ---------- SPA-Erkennung ---------- */
console.log("SPA-/Shell-Erkennung");
const shell = S.detectShell([
  { url: "a", hash: "h1" }, { url: "b", hash: "h1" }, { url: "c", hash: "h1" }, { url: "d", hash: "h2" },
]);
t("Größte identische Gruppe gefunden (3)", shell && shell.length === 3);
t("Keine Gruppe bei Unikaten", S.detectShell([{ url: "a", hash: "x" }, { url: "b", hash: "y" }]) === null);

/* ---------- Eingabe-Validierung ---------- */
console.log("Eingabe-Validierung");
t("normHost säubert URL-Eingabe", S.normHost("https://Www.Praxis.DE/pfad?x=1") === "www.praxis.de");
t("normHost verwirft Müll", S.normHost("nicht eine domain") === null);
t("validTarget ergänzt https", S.validTarget("example.com") === "https://example.com/");
let threw = false;
try { S.validTarget("http://192.168.1.1/x"); } catch (e) { threw = true; }
t("validTarget blockt private IPs", threw);
threw = false;
try { S.validTarget("http://localhost:8899"); } catch (e) { threw = true; }
t("validTarget blockt localhost", threw);
t("esc escaped HTML", S.esc('<b>&"') === "&lt;b&gt;&amp;\"");

/* ---------- Ergebnis ---------- */
console.log("\n" + pass + " bestanden, " + fail + " fehlgeschlagen");
process.exit(fail ? 1 : 0);
