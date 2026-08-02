# SICHTWERK — SEO on Autopilot, mit Flugschreiber

**Ein DentalConnect Produkt · Enterprise-Konzept: SEO · AEO · GEO — von der Analyse zur automatischen Umsetzung**

**Positionierung (Stand 02.08.2026): ein Produkt, eine Marke — NENNWERT.**
Das SEO-Cockpit ist ein Modul unter der NENNWERT-Marke (eigener Einstieg neben der
Messung, gleiche CI: Apex-N-Logo, Cyan/Mint, tiefes Navy). Arbeitsname „SICHTWERK"
lebt nur noch im Repo-Namen weiter. Vertikaler Fokus Dental (HWG-Prüfer,
Praxis-Benchmarks, Distribution über das DC-Praxenverzeichnis), Architektur
branchenneutral. Wettbewerbs-Delta und Preisidee: siehe `WETTBEWERB.md`.

**Metrik-Vertrag Cockpit ↔ NENNWERT-Messung** (verhindert widersprüchliche Zahlen):

| Kennzahl | Quelle | Bedeutung |
|---|---|---|
| **AEO-/GEO-Bereitschaft** (0–100) | Cockpit-Crawl, deterministisch | *Kann* die Site zitiert werden? (llms.txt, KI-Bot-Freigaben, Schema, Antwortstruktur, SSR) |
| **KI-Zitationsrate** (% ± Konfidenz) | NENNWERT-Prompt-Panel | *Wird* sie tatsächlich zitiert? |
| **GEO-Gesamt** (nur wenn beide Quellen vorhanden) | 40 % Bereitschaft + 60 % normierte Zitationsrate | Management-Sicht |

Bereitschaft und Ergebnis dürfen auseinanderlaufen — das ist Diagnose, kein Widerspruch:
hohe Bereitschaft + niedrige Zitationsrate = Inhalte fehlen oder sind zu jung;
niedrige Bereitschaft + hohe Rate = Marke trägt trotz Technik. Jede Kennzahl trägt im
UI ihr Quellen-Label; ohne Live-Quelle wird „Demo" angezeigt, niemals gemischt.

> Kernprinzip: **Die Maschine erkennt, generiert und misst. Live geht nur, was ein Mensch freigibt.**
> Jede Änderung ist versioniert, begründet und per Klick rückholbar. Keine Ranking-Garantien —
> aber die systematisch bestmöglichen Chancen, weil nichts liegen bleibt.

---

## 1. Produktvision

Bestehende Tools (Ahrefs, Semrush, Screaming Frog, Clearscope …) enden dort, wo die Arbeit
beginnt: beim Report. SICHTWERK ist als **Betriebssystem** konzipiert — ein geschlossener
Regelkreis:

```
   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  MESSEN  │ →  │ ERKENNEN │ →  │GENERIEREN│ →  │ FREIGABE │ →  │AUSSPIELEN│
   │ Crawl,   │    │ Findings │    │ Fix als  │    │ Mensch   │    │ CMS/Edge,│
   │ SERP, KI │    │ + Score  │    │ Diff     │    │ prüft    │    │versioniert│
   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └────┬─────┘
        ▲                                                               │
        └────────────────── Wirkungsmessung (14/28 Tage) ◄──────────────┘
```

Der letzte Pfeil ist entscheidend: Jede ausgespielte Maßnahme bekommt ein
**Beobachtungsfenster** (CTR, Position, Zitationsrate vorher/nachher). Wirkt sie nicht,
schlägt das System die Rücknahme vor. So lernt die Priorisierung aus echten Ergebnissen
statt aus Heuristiken.

**Drei Sichtbarkeits-Oberflächen, ein System:**

| Ebene | Ziel | Messung |
|---|---|---|
| **SEO** | Google/Bing-Rankings | Rank-Tracking, Sichtbarkeitsindex, GSC-Daten |
| **AEO** | Antwortboxen, Featured Snippets, PAA | SERP-Feature-Erkennung je Keyword |
| **GEO** | Zitationen in ChatGPT, Gemini, Claude, Perplexity | Prompt-Stichproben (Panel), Zitations-/Erwähnungsrate, Bot-Zugriffe (GPTBot, ClaudeBot …) in Logfiles |

---

## 2. Modul-Landkarte

### 2.1 Erfassung (Messen)
- **Crawler-Flotte**: verteilter Crawler (HTTP-first, Headless-Rendering nur bei Bedarf —
  Erkennung über JS-Abhängigkeits-Heuristik). Respektiert robots.txt, adaptives Rate-Limit
  pro Host, Sitemap- und Logfile-Abgleich (Crawlbudget-Analyse).
- **SERP-Sammler**: tägliche Positions- und SERP-Feature-Daten über Datenpartner-APIs
  (z. B. DataForSEO), lokalisiert pro Standort/Sprache.
- **KI-Zitations-Panel**: kuratiertes Prompt-Set pro Projekt (aus Keywords + Fragenclustern
  generiert), täglich/wöchentlich gegen ChatGPT-, Gemini-, Claude- und Perplexity-APIs
  gestellt; Antworten werden auf Domain-Zitationen, Marken-Erwähnungen und
  Wettbewerber-Nennungen geparst. Stichprobenbasiert und mit Konfidenzintervall
  ausgewiesen — KI-Antworten sind nicht deterministisch, das System behauptet keine
  Scheingenauigkeit.
- **Felddaten**: CrUX-API + optionales RUM-Snippet für Core Web Vitals (LCP/INP/CLS p75),
  GSC/Bing-Webmaster-Anbindung, Backlink-Daten via Partner-API.

### 2.2 Analyse (Erkennen)
Jede Seite durchläuft eine **Analyse-Pipeline** aus deterministischen Prüfern (schnell,
billig, reproduzierbar) und LLM-Prüfern (teuer, nur wo Semantik nötig):

| Prüfer | Typ | Beispiele |
|---|---|---|
| Technik | deterministisch | Statuscodes, Redirect-Ketten, Canonicals, hreflang, robots/noindex-Konflikte, Broken Links, Sitemap-Drift, Indexierbarkeit |
| Duplicate Content | deterministisch | SimHash/Shingling über Renderextrakte, Cluster-Bildung, Canonical-Vorschlag |
| Performance | deterministisch | CWV-Schwellen, Render-Blocking, Bildgewichte, Preload-Kandidaten |
| Struktur | deterministisch | H-Hierarchie, Title/Description-Längen, Alt-Text-Lücken, Schema-Validierung |
| Semantik | LLM + Embeddings | Themenabdeckung vs. Top-10, fehlende Entitäten, Intent-Match, Kannibalisierung (Embedding-Nähe zweier eigener URLs auf ein Keyword) |
| EEAT | LLM + Regeln | Autorenschaft, Belege/Quellen, Erfahrungssignale, tote Referenzen, Impressums-/Über-uns-Vollständigkeit |
| AEO | Regeln + LLM | Beantwortet die Seite die Frage in den ersten 40–60 Wörtern? FAQ-Kandidaten, Snippet-Formatierung |
| GEO | Regeln + LLM | Zitierfähigkeit: klare Fakten, Statistiken, Definitionen, konsistente NAP-Daten, llms.txt, strukturierte Quellenseiten |
| Interne Links | Graph | PageRank-artige Linkkraft, verwaiste Seiten, Klicktiefe, Anchor-Diversität, Pillar/Cluster-Vollständigkeit |
| Wettbewerb | Graph + LLM | Content-Gaps (Keywords, die 2+ Wettbewerber ranken, wir nicht), Linklücken, SERP-Feature-Lücken |

Jeder Befund wird als **Finding** persistiert: Typ, Evidenz (Messwerte, URLs),
Schweregrad, geschätzter Effekt, Behebbarkeit (`auto` / `assisted` / `manual`).

### 2.3 Priorisierung
Ein einheitlicher **ROI-Score** pro Finding/Chance:

```
ROI = (erwarteter Traffic-Effekt × Geschäftswert der Seite × Konfidenz) / Umsetzungsaufwand
```

- Traffic-Effekt aus Suchvolumen × CTR-Kurve je Position × realistischem Positionssprung
  (kalibriert an historischen Wirkungsmessungen des Projekts — der Regelkreis!)
- Geschäftswert aus Conversion-Daten (optional GA4/Matomo) oder Seitentyp-Gewichten
- Konfidenz sinkt bei dünner Datenlage → „sichere kleine Wins" schlagen „spekulative große"
- Quick Wins = hoher ROI + Behebbarkeit `auto` + Aufwand < Schwelle

### 2.4 Umsetzung (Generieren → Freigeben → Ausspielen)
Das Herzstück: **Change-Sets**. Jede automatische Optimierung ist ein strukturierter,
menschenlesbarer Diff mit Begründung und Evidenz-Links:

- Meta-Titel/Descriptions (Längen-, Keyword-, CTR-optimiert; A/B-fähig)
- Überschriften-Restrukturierung, Intro-Antwortabsätze (AEO)
- Alt-Texte (Vision-Modell beschreibt das tatsächliche Bild, kein Keyword-Stuffing)
- FAQ-Blöcke + FAQPage-Schema, HowTo/Article/LocalBusiness/Organization/Person-Schema
- Interne Links (Kandidaten aus Embedding-Nähe + Linkgraph-Lücken, Anchor-Vorschlag)
- Content-Erweiterungen und semantische Ergänzungen (als markierte Einfügungen, nie
  Volltext-Ersetzung ohne expliziten Auftrag)
- Neue Seiten (Landingpage-/Pillar-Entwürfe) als Draft im CMS

**Autopilot-Stufen (pro Projekt, im Prototyp umgesetzt):**
- **Stufe 0 — Beobachten:** nur messen und erkennen, nichts generieren (Einführungsphase)
- **Stufe 1 — Alles prüfen (Default):** jede Maßnahme läuft durchs Fließband
- **Stufe 2 — Bagatellen automatisch:** Alt-Texte, Canonical-Fixes, defekte Links gehen
  direkt live — rückholbar, im Protokoll sichtbar
- **Stufe 3 — Autopilot mit Wächter:** auch Meta, Schema, interne Links automatisch;
  der **Wirkungs-Wächter** überwacht jedes Set (Baseline + Messfenster) und rollt
  Verschlechterungen sofort, Wirkungsloses nach 28 Tagen zur Bestätigung zurück.
  Content-Änderungen bleiben auf jeder Stufe freigabepflichtig.

Zusätzlich vertikal: **HWG-Prüfer** — generierte Texte werden vor der Freigabe gegen das
Heilmittelwerbegesetz geprüft (Heilversprechen, Vorher/Nachher-Regeln, Fachbezeichnungen).

**Ausspielung** über drei Wege:
- **CMS-Konnektoren** (WordPress, Shopify, Webflow, Contentful, TYPO3 …) via API,
  jede Änderung als eigene Revision im CMS
- **Edge-Layer** (optionaler Proxy/Worker à la Cloudflare): Meta, Schema, Links werden
  at-request-time injiziert — funktioniert ohne CMS-Zugriff, ideal für Legacy-Systeme
- **Pull-Requests** für Git-basierte Sites (Headless/SSG)

Jede Ausspielung erzeugt einen **Snapshot vorher/nachher** → Ein-Klick-Rollback.

### 2.5 KI-Agent („Werksleiter")
Konversationaler Agent mit Tool-Zugriff auf alle System-APIs:

```
Nutzer-Prompt → Planner (zerlegt in Schritte) → Tool-Aufrufe:
  crawl_page, get_rankings, get_citations, compare_competitor,
  analyze_gaps, generate_changeset, queue_for_review, create_report
→ Antwort + Change-Sets im Fließband
```

- Der Agent **kann nichts direkt publizieren** — er erzeugt ausschließlich Change-Sets,
  die den normalen Freigabeweg gehen. Das ist Architektur, nicht Konvention:
  der Publish-Endpunkt verlangt eine menschliche Freigabe-Signatur (oder eine explizit
  konfigurierte Auto-Regel).
- Langläufer („Verbessere alle Landingpages") werden als **Agent-Runs** mit Fortschritt,
  Zwischenergebnissen und Abbruchmöglichkeit geführt.
- Jede Antwort verlinkt ihre Evidenz (Findings, Messreihen) — keine unbelegten Behauptungen.

---

## 3. Scores (transparent, nachrechenbar)

Alle Scores 0–100, gewichtete Aggregation über Findings; jeder Score ist bis auf
Einzel-Findings aufklappbar („Warum 62?").

| Score | Hauptkomponenten |
|---|---|
| **Technik** | Indexierbarkeit, Statuscode-Hygiene, Canonicals/hreflang, CWV, Crawlbudget-Effizienz |
| **Content** | Themenabdeckung, Intent-Match, Aktualität, Kannibalisierungsfreiheit, Lesbarkeit |
| **AEO** | Antwortabsätze, FAQ/Schema-Abdeckung, gewonnene SERP-Features vs. Potenzial |
| **GEO** | Zitationsrate im Prompt-Panel, Zitierfähigkeits-Index, KI-Bot-Crawlbarkeit, llms.txt |
| **EEAT** | Autorenschaft, Belege, Über-uns/Impressum, externe Reputationssignale |
| **SEO Gesamt** | gewichtete Summe + Sichtbarkeitstrend |

---

## 4. Technische Architektur

### 4.1 Überblick

```
                                   ┌───────────────────────────────┐
  Browser (Next.js SPA/SSR) ──────►│  API-Gateway (REST + GraphQL) │
  WebSocket (Live-Updates)  ◄──────│  AuthN/Z · Rate-Limit · Audit │
                                   └───────┬───────────────────────┘
                                           │ Domain-Services (stateless, k8s/HPA)
      ┌──────────────┬──────────────┬──────┴───────┬──────────────┬─────────────┐
      │ Projects &   │ Findings &   │ Change-Set & │ Agent-       │ Insights/   │
      │ Crawl-Svc    │ Score-Svc    │ Publish-Svc  │ Orchestrator │ Report-Svc  │
      └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴──────┬──────┘
             │              │              │              │              │
      ┌──────┴──────────────┴───── Event-Bus (Kafka/NATS) ┴──────────────┴──────┐
      └──────┬──────────────┬──────────────┬──────────────┬──────────────┬──────┘
      Worker-Pools (Queues: BullMQ/Redis o. Temporal für Langläufer):
      crawl · render · analyze · llm · serp · citation · publish · measure
             │              │              │
      ┌──────┴────┐  ┌──────┴─────┐  ┌─────┴──────┐  ┌────────────┐  ┌──────────┐
      │ PostgreSQL│  │ ClickHouse │  │ Object-    │  │ Redis      │  │ pgvector/│
      │ (OLTP,    │  │ (Zeitreihen│  │ Storage    │  │ (Cache,    │  │ Qdrant   │
      │ Multi-    │  │ Rankings,  │  │ (Snapshots,│  │ Queues,    │  │ (Embed-  │
      │ Tenant)   │  │ Logs, CWV) │  │ HTML, Bilder)│ │ Sessions) │  │ dings)   │
      └───────────┘  └────────────┘  └────────────┘  └────────────┘  └──────────┘
```

**Warum so:** OLTP (Projekte, Findings, Change-Sets) braucht Transaktionen und
Row-Level-Security → PostgreSQL. Rankings/Zitationen/Logs sind append-only-Zeitreihen mit
Milliarden Zeilen → ClickHouse (spaltenorientiert, Kompression, schnelle Aggregation).
Semantik (Ähnlichkeit, Kannibalisierung, Linkkandidaten) → Vektorindex. Roh-HTML und
Snapshots → Objektspeicher, in der DB nur Hashes/Referenzen.

### 4.2 Datenmodell (Kern, vereinfacht)

```sql
organizations(id, name, plan, sso_config)
users(id, org_id, email, role)                -- roles: owner, admin, editor, approver, viewer
projects(id, org_id, domain, locales[], crawl_config, publish_mode)

crawls(id, project_id, started_at, status, pages_total, pages_done)
pages(id, project_id, url_hash UNIQUE(project_id,url_hash), url, first_seen, last_crawl_id,
      status_code, canonical_url, content_hash, render_mode, page_type, business_value)
page_snapshots(id, page_id, crawl_id, storage_ref, extracted_text_ref, headings jsonb,
      meta jsonb, schema_types text[], word_count, embedding_ref)

findings(id, project_id, page_id NULL, type, severity, fixability, evidence jsonb,
      roi_score numeric, status, first_detected, resolved_at, dedup_key UNIQUE)
scores(project_id, page_id NULL, kind, value, components jsonb, computed_at)

change_sets(id, project_id, finding_id NULL, agent_run_id NULL, type, target_page_id,
      diff jsonb,               -- [{field, before, after, rationale}]
      status,                   -- detected|generated|in_review|approved|published|rolled_back|rejected
      created_by,               -- 'system' | 'agent' | user_id
      approved_by NULL, approved_at NULL, published_at NULL,
      publish_channel,          -- cms|edge|pr
      rollback_ref, observe_until, impact jsonb)   -- Wirkungsmessung

keywords(id, project_id, phrase, locale, volume, intent, cluster_id)
rankings(keyword_id, date, position, url, serp_features[])          -- ClickHouse
citation_probes(id, project_id, prompt, engine, sampled_at,
      cited boolean, mentioned boolean, competitors_cited[])        -- ClickHouse
link_graph(project_id, from_page_id, to_page_id, anchor, follow)    -- + Graph-Cache
competitors(id, project_id, domain); competitor_snapshots(...)
agent_runs(id, project_id, user_id, prompt, plan jsonb, status, result jsonb)
audit_log(id, org_id, actor, action, entity, before_ref, after_ref, at)  -- append-only
```

### 4.3 API-Struktur (Auszug)

```
POST /v1/projects/{id}/crawls                 # Crawl starten
GET  /v1/projects/{id}/findings?type=&severity=&sort=roi
GET  /v1/projects/{id}/scores?granularity=day
GET  /v1/pages/{id}                           # inkl. Findings, Historie, Diffs
POST /v1/change-sets/{id}/approve             # ⇒ verlangt Rolle approver+, 2FA-fähig
POST /v1/change-sets/{id}/reject
POST /v1/change-sets/{id}/rollback
POST /v1/agent/runs                           # {prompt} ⇒ SSE-Stream des Plans/Fortschritts
GET  /v1/projects/{id}/citations/summary?engine=chatgpt
WS   /v1/projects/{id}/events                 # Live: crawl.progress, finding.created,
                                              # change_set.status_changed, score.updated
```

GraphQL ergänzend für das Dashboard (ein Roundtrip pro View), REST für Integrationen,
Webhooks für Kunden-Systeme (`change_set.published`, `finding.critical.created` …).

### 4.4 Queues, Worker, Events
- **Kurzläufer** (einzelne Seite analysieren, Titel generieren): BullMQ auf Redis,
  Retry mit Exponential Backoff, Dead-Letter-Queue, Idempotenzschlüssel
  (`project:url_hash:analyzer:content_hash` — gleicher Inhalt wird nie doppelt analysiert).
- **Langläufer** (Voll-Crawl 1 Mio. Seiten, „alle Landingpages verbessern"):
  Temporal-Workflows — überleben Deploys/Crashes, Fortschritt abfragbar, sauber abbrechbar.
- **Fairness**: Queues pro Mandant partitioniert + gewichtete Kontingente
  (kein Kunde kann die Flotte monopolisieren); Crawl-Politeness pro Ziel-Host global
  koordiniert (verteilter Token-Bucket in Redis).
- **Event-Bus**: alle Zustandsübergänge als Events (Kafka/NATS). Konsumenten:
  Score-Neuberechnung (inkrementell, nur betroffene Komponenten), WebSocket-Fanout,
  Webhooks, Audit. „Echtzeit" im Dashboard = Event-getrieben, kein Polling.
- **LLM-Gateway**: zentraler Dienst mit Modell-Routing (billiges Modell für Klassifikation,
  starkes Modell für Generierung), Prompt-Versionierung, Kosten-Budget pro Mandant,
  Antwort-Cache (Hash über Prompt+Kontext), Schema-validierte strukturierte Ausgaben.

### 4.5 Caching
- Redis: Sessions, heiße Aggregationen (Dashboard-Scores, TTL 60 s + Event-Invalidierung)
- ClickHouse Materialized Views: Tages-/Wochenaggregate für Trends
- CDN/Edge: statische Assets, signierte Report-Exporte
- Embedding-Cache: content_hash → Vektor (nie doppelt einbetten)

### 4.6 Sicherheit & Compliance
- Mandantentrennung: Row-Level-Security in PostgreSQL + mandanten-präfixierte Schlüssel
  überall; Objektspeicher mit per-Tenant-Prefixen und signierten URLs
- AuthN: OIDC/SAML-SSO, 2FA; AuthZ: RBAC (Approver-Rolle getrennt von Editor —
  Vier-Augen-Prinzip erzwingbar)
- CMS-Credentials: KMS-verschlüsselt (Envelope Encryption), niemals im Log
- Publish-Pfad: signierte Freigaben, vollständiges Audit-Log (append-only), Rollback-Pflicht
- Crawler: robots.txt-Treue, identifizierbarer User-Agent, Abuse-Schutz
  (nur verifizierte Domain-Inhaberschaft crawlbar — DNS/Datei-Verifikation)
- DSGVO: EU-Region-Pinning, Auftragsverarbeitung, PII-Redaktion vor LLM-Aufrufen,
  Lösch-Workflows
- LLM-Sicherheit: Gecrawlte Inhalte sind Daten, nie Instruktionen (Prompt-Injection-Schutz:
  strikte Trennung von System-Prompt und Webinhalt, Ausgabe-Validierung gegen Schema)

### 4.7 Skalierung (Tausende gleichzeitige Nutzer)
- Stateless Services hinter dem Gateway, horizontal per HPA
- Lese-Replikate für PostgreSQL; ClickHouse-Cluster mit Sharding pro Mandanten-Hash
- WebSocket-Fanout über Redis Pub/Sub / NATS, Sticky-frei
- Crawler-Flotte autoskalierend nach Queue-Tiefe, getrennt vom API-Pfad
  (ein Riesen-Crawl beeinträchtigt nie die Dashboard-Latenz)
- Ziel-SLOs: Dashboard p95 < 300 ms (aus Cache/MV), Event-bis-UI < 2 s,
  Voll-Crawl 100k Seiten < 4 h

---

## 5. Frontend (umgesetzt als Klick-Prototyp: 12 Routen)

Alle Routen sind gebaut und lauffähig: `dashboard` (Übersicht), `crawls`, `content`,
`url-detail` (Findings + Wirkungskurve + Diff-Historie), `links`, `keywords`, `aeo`,
`geo` (NENNWERT-Panel), `wettbewerber` (inkl. Markt-Radar), `lokal`, `massnahmen`
(volles Fließband mit Typ-Filter), `berichte`, `einstellungen` (Autopilot-Stufen,
Konnektoren, Rollen). Gemeinsame Basis: `assets/werk.css` + `assets/werk.js` mit einem
localStorage-Datenlayer, der das Backend simuliert — Freigaben, Fix-Generierungen und
die Autopilot-Stufe wirken seitenübergreifend und persistent.

- **Stack-Empfehlung (Produkt)**: Next.js + TypeScript, TanStack Query (Server-State),
  WebSocket-Layer für Events, virtualisierte Tabellen (100k-URL-Listen), ECharts/visx
- **Designsystem „Werk" in DentalConnect-CI**: Tech-Luxus-Dark-Navy
  (#02050D→#0D1F3D-Gradient, Flächen #0C1526) mit DC-Cyan als Mess-Akzent; semantisches
  Zwei-Akzent-System — **Cyan = Maschine misst/arbeitet, Bernstein = wartet auf Ihre
  Freigabe**, Grün = live/gesund, Rot = kritisch. Typografie: Bricolage Grotesque
  (Display), Instrument Sans (UI), IBM Plex Mono (Daten).
- **Signatur-Element**: das **Maßnahmen-Fließband** (Erkannt → Generiert → Ihre Prüfung →
  Live) mit Diff-Karten und Ein-Klick-Freigabe — der Freigabe-Regelkreis als sichtbares
  Zentrum des Produkts, nicht als Untermenü.
- **KI-Agent** als permanentes Dock rechts: analysiert, plant, legt Change-Sets ins
  Fließband; unter jedem Eingabefeld der Satz, der das Vertrauensmodell trägt:
  *„Der Agent ändert nichts ohne Ihre Freigabe im Fließband."*
- Chart-Palette farbfehlsichtigkeits-validiert (4 Serien, ΔE-geprüft gegen die
  Panel-Fläche); eine Achse pro Chart (Metrikwechsel per Tab statt Doppelachse);
  Direktbeschriftung mit Kollisionsauflösung; Crosshair-Tooltip; Responsive bis Mobil;
  `prefers-reduced-motion` respektiert.

---

## 6. Realistische Grenzen (bewusst im Produkt verankert)

1. **Keine Ranking-Garantien.** Das System optimiert Wahrscheinlichkeiten und macht
   Wirkung messbar — Google und KI-Systeme bleiben externe, nicht kontrollierbare Akteure.
2. **KI-Zitationsmessung ist eine Stichprobe.** Antworten variieren; wir zeigen
   Konfidenzintervalle statt Scheinpräzision.
3. **Offpage nur halbautomatisch.** Linkaufbau wird analysiert und mit Kandidaten
   unterstützt, aber nie automatisiert ausgeführt (Spam-Risiko).
4. **Content-Vollgenerierung ist Opt-in.** Default ist Verbessern und Ergänzen von
   Bestehendem; neue Seiten entstehen als Entwürfe mit menschlicher Redaktion (EEAT!).

---

## 7. Ausbau-Roadmap

| Phase | Inhalt |
|---|---|
| **MVP** | Crawler + Technik-/Struktur-Prüfer, Findings, Scores, Fließband mit CMS-Konnektor (WordPress), Meta/Alt/Schema-Generierung, GSC-Anbindung |
| **2** | SERP-Tracking, Wettbewerber, interne Links, Content-Analyse (Embeddings), Quick Wins/ROI |
| **3** | GEO-Panel (KI-Zitationen), AEO-Optimierer, Agent v1 (Analyse + Change-Sets) |
| **4** | Edge-Layer, Temporal-Langläufer, Agent v2 (Multi-Step-Runs), Wirkungsmessung → lernende Priorisierung |
| **5** | Lokal/International-Suite, Reporting/White-Label, Enterprise-SSO/Audit-Zertifizierung |
