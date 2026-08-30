# Next Steps

## Prossima attivita

Completare la verifica operativa V1/V2 e preparare il passaggio a QUALITY.

### Area interessata

- verifica manuale autenticata di booking, QR, check-in, live e tornei in DEV;
- verifica manuale autenticata di duplicazione/archiviazione eventi e gestione
  no-show in DEV;
- verifica installazione PWA e fallback offline su dispositivo;
- verifica manuale autenticata dell'upload asset in DEV;
- test autenticato manuale di `/admin/news` e `/admin/servizi`;
- test autenticato manuale di `/admin/richieste` e invio form servizio;
- sostituzione dei fixture editoriali con contenuti e asset approvati;
- `docs/dev/guideline_test_features.md` per le procedure manuali;
- configurazione manuale Supabase remoto, Cloudflare e OneSignal secondo
  `docs/dev/guideline_implementations.md`.

### Comportamento atteso

- esperienze, news e servizi provengono da contenuti pubblicati e non da copy
  inventato nel frontend;
- draft, archived e contenuti non pubblicati non compaiono nelle route pubbliche;
- le operazioni CMS restano protette da ruolo e RLS;
- immagini, Open Graph e metadata restano coerenti con il contenuto effettivo.
- le richieste servizi non espongono dati interni e restano autorizzate lato
  server secondo il ruolo previsto.
- l'endpoint pubblico valida input e servizio attivo prima di creare un lead;
- admin e super-admin possono aggiornare stato e note interne delle richieste.

### Gia verificato in Phase 3

- home alimentata dalla view `public_events`;
- lista `/eventi` e dettaglio `/eventi/[slug]` alimentati da Supabase;
- postazioni e attivita lette dalle view `public_event_*`;
- loading/error/empty state senza dati fittizi lato frontend;
- robots, sitemap, canonical e JSON-LD evento;
- noindex/disallow in ambienti non production.
- view pubbliche `public_activities`, `public_news_posts` e
  `public_service_pages`, con filtering dei soli contenuti `published`;
- route pubbliche esperienze/news/servizi/regolamento con fixture DEV e
  dettagli editoriali, incluso `/esperienze/[slug]`;
- disponibilita evento nella vista pubblica secondo `hidden`, `status` ed
  `exact`, con soglia `booking.almost-full-threshold` e test privacy;
- sitemap dinamica con slug di eventi, news e servizi pubblicati.
- console CMS news/servizi con scritture protette da RLS e ruoli admin.
- form servizio, endpoint server validato e console `/admin/richieste`.
- console `/admin/eventi` con date, stato, prenotazioni, prezzo e visibilità
  capienza privata.
- console `/admin/catalogo` con CRUD globale di attività/postazioni e categorie.
- configurazione `/admin/eventi/[id]` con associazioni many-to-many tra attività
  e postazioni.
- override per evento di nome, descrizione, capienza, visibilità, disponibilità,
  orari e modalità d’accesso.
- workflow admin eventi per duplicazione/archiviazione e no-show operativo,
  con test database delle autorizzazioni e degli audit.

### Gia verificato: asset CMS

- bucket Supabase Storage `vrsus-assets` con lettura pubblica;
- uploader CMS collegato a news, servizi, eventi e catalogo;
- policy RLS di insert/update/delete limitate ad admin e super-admin.

### Implementato nel repository

- booking V1, waiting list FIFO, QR hash-only, check-in idempotente e pagamenti
  sul posto;
- dashboard utente, inbox notifiche, console live e check-in;
- torneo V2 single-elimination, registrazione, check-in, bracket, risultati e
  ranking da ledger, con operazioni match, realtime e notifica chiamata
  giocatori.
- adapter OneSignal server-side, mapping subscription e preferenze push con
  fallback inbox.
- console `/admin/ranking` per adjustment auditabili da admin/super-admin.
- route area utente `/app/eventi`, `/app/tornei`, `/app/tornei/[id]` e
  `/app/profilo`.
- console `/admin/impostazioni` per `site_settings` con validazione JSON e
  protezione admin/super-admin.

### Verifica

La verifica finale del 2026-08-30 e PASS: `corepack pnpm db:test` (169), lint
senza warning, format, typecheck, unit (1), E2E seriale (7/7), build standard e
build Cloudflare. Restano esclusivamente i test manuali autenticati/device, la
configurazione OneSignal e il deploy QUALITY/PRODUCTION.
