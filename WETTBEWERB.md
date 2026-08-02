# SICHTWERK — Wettbewerbsanalyse „SEO on Autopilot"

**Stand: 02.08.2026 · Grundlage: Web-Recherche (Quellen unten) + Produktkonzept KONZEPT.md**

> Hinweis: „Holo" war nicht auffindbar (weder als SEO- noch als GEO-Tool) — vermutlich
> Verwechslung oder sehr junges Produkt. Die Analyse deckt stattdessen die gesamte
> Autopilot-Kategorie ab. Wenn du mit „Holo" ein konkretes Tool meinst: Name/URL nachreichen,
> dann ergänze ich die Zeile.

---

## 1. Die Landschaft in vier Lagern

| Lager | Vertreter | Geschäftsmodell | Kernversprechen |
|---|---|---|---|
| **Monitoring-Generalisten** | Opinly.ai | SaaS: Personal $44 / Business ~$89 / Agency ~$277 pro Monat | Wettbewerber-Beobachtung (Preise, Features, Landingpages) + SEO-Monitoring, Audits, Keyword-Tracking, AI-Content, „LLM-Visibility" — alles in einem |
| **Pixel-Autopiloten** | SearchAtlas OTTO ($99–$999/M., 4 Stufen, White-Label), Alli AI | SaaS + Agentur-White-Label | „99 % der manuellen SEO-Arbeit automatisiert": JS-Pixel im Site-Head, Fixes werden per Overlay live injiziert, One-Click-Apply |
| **GEO-Content-Fabriken** | Sight AI (13 Agenten), Axy.digital | SaaS, oft Credit-basiert | Vollautonom: Nachfrage erkennen → Artikel schreiben → selbst publizieren → Backlinks verteilen, „no prompting required" |
| **KI-Sichtbarkeits-Tracker** | Profound, Peec AI, Otterly | SaaS, Seat-/Prompt-basiert | Messen, wie oft die Marke in ChatGPT/Perplexity & Co. auftaucht — reine Beobachtung |

## 2. Was sie anbieten, das wir (noch) nicht hatten → und was davon übernommen wurde

| Feature beim Wettbewerb | Bewertung | Konsequenz für SICHTWERK |
|---|---|---|
| **Autopilot-Grade / One-Click-Apply** (OTTO) | Richtige Idee, falsche Governance | ✅ **Gebaut: Autopilot-Stufen 0–3** (Einstellungen) — Stufe 2 „Bagatellen automatisch", Stufe 3 „Autopilot mit Wächter". Unterschied: bei uns mit Messfenster + Auto-Rollback statt blindem Apply |
| **Wettbewerber-Alerts** (Opinly OpinAlert) | Stark, fehlt klassischen Suiten | ✅ **Gebaut: Markt-Radar** (Wettbewerber-Seite) — Alerts bei neuen Seiten, Feature-Verlusten, Relaunches. Offen: E-Mail/Push-Kanal |
| **White-Label / Agentur-Mandanten** (OTTO $999-Tier) | Relevanter Umsatzhebel | ➕ **Roadmap**: Mandantenfähigkeit für Dental-Agenturen, Depots und Abrechnungsdienstleister als Reseller |
| **Deployment ohne CMS-Zugriff** (OTTO-Pixel) | Nützlich für Legacy-Praxen-Sites | ✅ Im Konzept als **Edge-Layer** (at-request-time), aber als *Fallback* — Standard bleibt die echte CMS-Revision (siehe 3.2) |
| **Backlink-Automation** (Opinly, Axy) | Spam-/Qualitätsrisiko | ❌ Bewusst nicht. Wir liefern Linkquellen-Analyse + Ansprache-Entwürfe, Ausführung bleibt menschlich — als Differenzierung dokumentiert |
| **Content-Volumen-Fabrik** (Sight: 13 Agenten publizieren selbst) | Kollidiert mit Googles Scaled-Content-Policy und im Dental-Kontext mit dem HWG | ❌ Bewusst nicht. Content-Vollgenerierung bleibt Opt-in mit Redaktion (EEAT) |

## 3. Was uns strukturell besser macht (die Hebel)

**3.1 Der Flugschreiber — Closed Loop statt Blindflug.**
Kein Wettbewerber misst pro ausgespielter Änderung ein Vorher/Nachher-Fenster und nimmt
Wirkungsloses selbst zurück. OTTO appliziert und hofft; Tracker messen ohne zu handeln.
Unser Regelkreis (Erkennen → Generieren → Freigeben → Ausspielen → **Wirkung messen →
ggf. Rollback**) ist das Vertrauensargument für konservative Käufer wie Praxisinhaber —
und der Datenschatz, mit dem die Priorisierung pro Kunde kalibriert wird.

**3.2 Echte CMS-Revisionen statt Pixel-Overlay.**
OTTO/Alli injizieren Änderungen per JavaScript über ein Pixel: Der Quelltext bleibt falsch,
die Änderung existiert nur solange das Abo läuft, Renderer-Abhängigkeit und eine
Cloaking-Grauzone inklusive. Wir schreiben per API echte, versionierte CMS-Revisionen
(WordPress/Shopify/PR-Flow) — kündbar ohne Sichtbarkeitsverlust. Das ist ein Verkaufsargument,
kein Implementationsdetail: „Ihre Website gehört Ihnen, auch nach uns."

**3.3 NENNWERT als eigene Mess-Infrastruktur.**
Die KI-Zitationsmessung (Multi-LLM-Panel, EU-Region Amsterdam, Fehlinfo-Verifizierung)
existiert bereits als DentalConnect-Produkt. Wettbewerber kaufen solche Panels teuer zu
oder messen gar nicht. Kopplung: SICHTWERK optimiert, NENNWERT misst — ein Regelkreis
über zwei Produkte, beide unter DC-Dach, DSGVO-konform (US-Tools können das Argument
EU-Datenregion nicht kontern).

**3.4 Vertikal Dental statt Generalist.**
- **HWG-Prüfer** (Heilmittelwerbegesetz): generierte Texte werden gegen Werbebeschränkungen
  für Medizin geprüft (Heilversprechen, Vorher/Nachher-Bilder, Fachgebietsbezeichnungen).
  Kein Generalist kann das; für Praxen ist es existenziell. → stärkster vertikaler Moat.
- **DC-Ökosystem-Distribution**: verifiziertes Praxisprofil im Praxenverzeichnis
  (strukturierte Daten + Backlink), Jobs, Events — Sichtbarkeitskanäle, die kein
  externes Tool mitbringt.
- **Benchmarks aus echten Praxisdaten** (DC kennt den Markt): „Ø Technik-Score Dental: 61"
  ist ein Datenpunkt, den Semrush nicht hat.

**3.5 Ehrlichkeit als Positionierung.**
OTTO wirbt mit „99 % Automatisierung" und Ranking-Lift-Versprechen. Wir weisen
Konfidenzintervalle aus, zeigen Rücknahmen im Bericht und garantieren nichts — bei
Ärzten/Zahnärzten (skeptische, haftungsbewusste Käufer) ist das ein Verkäufer, kein Nachteil.

## 4. Positionierung & Preisidee

> **„SEO on Autopilot — mit Flugschreiber."**
> Automatisiert wie OTTO, messbar wie ein Tracker, sicher wie keiner von beiden.
> Ein DentalConnect Produkt, verbunden mit NENNWERT.

| Plan | Preisidee (netto/M.) | Zielgruppe | Referenzpunkt |
|---|---|---|---|
| Praxis | 149 € | Einzelpraxis, 1 Domain | über Opinly ($44–89), unter OTTO-Growth |
| Praxis-Gruppe | 349 € | Mehrere Standorte (Demo-Mandant) | OTTO-Pro-Klasse, aber vertikal + EU |
| Agentur/Depot | 699 €+ | White-Label, Mandanten | OTTO $999-Tier unterboten |
| DC-Bundle | Aufpreis auf DC-Abo | Bestandskunden dentalcareers/NENNWERT | einzigartig — kein Wettbewerber hat das Ökosystem |

## 5. Offene To-dos aus der Analyse

1. **HWG-Prüfer** als eigener Analyse-Prüfer ins Konzept (Kap. 2.2) — spezifiziert, Umsetzung offen.
2. **Alert-Kanäle** für den Markt-Radar (E-Mail/Push).
3. **Agentur-Mandanten/White-Label** in Datenmodell (organizations → agencies) und Preisliste.
4. **„Holo"** klären — falls es ein konkretes Tool gibt, Zeile nachtragen.

---

**Quellen:**
[Opinly Pricing](https://opinly.ai/pricing) · [Opinly-Überblick (OpenTools, 04/2026)](https://opentools.ai/tools/opinlyai) · [Opinly-Preisanalyse (Oreate)](https://www.oreateai.com/blog/unpacking-opinly-ai-your-guide-to-competitive-intelligence-pricing/b3d96656a1980eb0748d37537b946250) · [Opinly auf Capterra](https://www.capterra.com/p/10014411/Opinly-ai/) · [Opinly-Review](https://aitoolsforcontentcreators.com/opinly-ai-review-2026) · [Search Atlas Review (LinkGraph)](https://www.linkgraph.com/blog/search-atlas-review/) · [Search Atlas Deep-Dive (eesel)](https://www.eesel.ai/blog/search-atlas-ai-seo-software) · [Search Atlas Pricing (Stackmatix)](https://www.stackmatix.com/blog/search-atlas-features-pricing) · [OTTO-Review 2026 (max-productive)](https://max-productive.ai/ai-tools/search-atlas/) · [OTTO + Content Genius Test (diyai)](https://diyai.io/ai-tools/seo/reviews/search-atlas-review/) · [Search Atlas Pricing 2026](https://checkthat.ai/brands/search-atlas/pricing) · [SEO-Autopilot-Tools 2026 (trysight)](https://www.trysight.ai/blog/seo-autopilot-tools) · [Axy GEO/AEO/SEO Autopilot](https://www.axy.digital/products/geo-aeo-seo-autopilot) · [AI-SEO-Tools für Startups (trysight)](https://www.trysight.ai/blog/ai-seo-tool-for-startups)
