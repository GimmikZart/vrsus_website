# Development Worklog

Storico append-only delle sessioni di sviluppo.

## 2026-08-26 — Sessione 1

### Lavoro svolto

- Rimossi i riferimenti al progetto d'origine.
- Trasformata la specifica tecnica in un template neutrale e riutilizzabile.
- Aggiornati README, stato corrente, prossimi passi e esempio di handoff.

### File principali modificati

- `AGENTS.md`
- `README.md`
- `docs/technical/TECHNICAL_SPECIFICATION.md`
- `docs/ai/HANDOFF_PROTOCOL.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/NEXT_STEPS.md`

### Verifiche

- Ricerca dei riferimenti al progetto d'origine → PASS
- Build e test applicativi → N/A, progetto non ancora implementato

### Problemi emersi

- La cartella non è un repository Git; `git status` non è disponibile.

### Stato finale della sessione

Scaffolding neutrale pronto per essere specializzato in un nuovo progetto.

## 2026-08-29 — Sessione 2

### Lavoro svolto

- Creato il bootstrap Nuxt 4/TypeScript del progetto VRSUS.
- Configurati pnpm, Tailwind 4, Nuxt UI, Supabase CLI, PWA, ESLint,
  Prettier, Vitest e Playwright.
- Implementati layout pubblico, landing, pagina evento placeholder, token
  visuali e supporto reduced motion.
- Risolto il redirect auth predefinito di Supabase sulle route pubbliche.
- Verificato il target Cloudflare Pages.

### File principali modificati

- `package.json`, `pnpm-lock.yaml`, `nuxt.config.ts`
- `app/`, `shared/`, `server/`, `supabase/`, `tests/`
- `.env.example`, `.gitignore`, `README.md`
- `docs/ai/`, `docs/dev/`

### Verifiche

- `pnpm lint` -> PASS
- `pnpm format:check` -> PASS
- `pnpm typecheck` -> PASS
- `pnpm test` -> PASS, 1 test
- `pnpm test:e2e` -> PASS, 1 test Chromium
- `pnpm build` -> PASS
- `pnpm exec nuxt build --preset=cloudflare_pages` -> PASS

### Problemi emersi

- Playwright richiedeva il download locale di Chromium; installato e verificato.
- Il typecheck integrato nel bundler produceva `TS5042`; spostato nel gate
  dedicato e registrato in `DECISIONS.md`.
- `.env` e Supabase DEV reali restano da configurare per il lavoro database.

### Stato finale della sessione

Phase 0 bootstrap completata. Riprendere dalla fondazione schema/RLS indicata
in `docs/ai/NEXT_STEPS.md`.

## 2026-08-29 — Sessione 3

### Lavoro svolto

- Avviato Docker Desktop e creato lo stack Supabase DEV locale dedicato.
- Implementata la migration V1 con schema, vincoli, trigger, RLS, view sicure
  e funzioni di base per profili/ruoli e booking proprietari.
- Aggiunti seed demo locali riproducibili e tipi TypeScript generati.
- Corretto l'avvio Playwright/Nuxt su Windows affinché usi Node 22 da NVM.
- Aggiornata la documentazione operativa, test e handoff per Phase 2.

### File principali modificati

- `supabase/config.toml`, `supabase/migrations/20260829170000_initial_schema.sql`
- `supabase/seed.sql`, `supabase/tests/database_foundation.test.sql`
- `app/types/database.types.ts`, `nuxt.config.ts`, `playwright.config.ts`
- `docs/ai/`, `docs/dev/`, `README.md`

### Verifiche

- `pnpm db:reset` -> PASS
- `pnpm db:types` -> PASS
- `pnpm db:test` -> PASS, 22 test pgTAP
- `pnpm lint` -> PASS
- `pnpm format:check` -> PASS
- `pnpm typecheck` -> PASS
- `pnpm test` -> PASS, 1 test
- `pnpm test:e2e` -> PASS, 1 test Chromium
- `pnpm build` -> PASS

### Problemi emersi

- Le porte Supabase predefinite erano occupate da altri progetti: configurate
  porte VRSUS dedicate.
- Il processo figlio Nuxt di Playwright selezionava un Node globale: il runner
  ora usa il Node indicato in `.nvmrc` tramite NVM su Windows.

### Stato finale della sessione

Phase 1 database foundation completata e verificata. Riprendere dalla Phase 2
in `docs/ai/NEXT_STEPS.md`.

## 2026-08-29 — Sessione 4

### Lavoro svolto

- Implementato il primo blocco Phase 2 con login email/password e sessione SSR.
- Aggiunti middleware `auth` e `role`, route `/app` e `/admin` e gestione
  logout.
- Aggiunta funzione `get_my_roles()` con grant limitato agli utenti autenticati.
- Verificati profile bootstrap, ruolo admin e accesso UI con utente locale
  temporaneo poi rimosso.
- Aggiornata la decisione SSR da DEC-006 a DEC-007 e la documentazione test.

### File principali modificati

- `app/composables/useVrsusAuth.ts`, `app/middleware/`
- `app/pages/login.vue`, `app/pages/app.vue`, `app/pages/admin/index.vue`
- `app/layouts/default.vue`, `nuxt.config.ts`
- `supabase/migrations/20260829193000_auth_roles.sql`
- `tests/e2e/home.spec.ts`, `docs/ai/`, `docs/dev/`

### Verifiche

- `pnpm db:reset` -> PASS
- `pnpm db:types` -> PASS
- `pnpm db:test` -> PASS, 21 test pgTAP
- `pnpm lint` -> PASS
- `pnpm typecheck` -> PASS
- `pnpm test` -> PASS, 1 test
- `pnpm test:e2e` -> PASS, 3 test Chromium
- Auth REST/UI smoke -> PASS
- Role management smoke -> PASS: super-admin autorizzato, utente normale rifiutato

### Problemi emersi

- Il typecheck continua a mostrare soltanto il warning non bloccante Volar per
  `vue-router/volar/sfc-route-blocks`.
- I test Auth richiedono utenti locali temporanei; nessun secret è stato
  salvato nel repository.

### Stato finale della sessione

Phase 2 autenticazione base e route guard completati. Riprendere dalla
copertura multiutente/RLS e gestione ruoli super-admin in `NEXT_STEPS.md`.

## 2026-08-29 — Sessione 5

### Lavoro svolto

- Implementata RPC `set_user_role()` con autorizzazione esclusiva
  `super_admin` e audit log.
- Aggiunti endpoint server per elenco utenti e assegnazione/rimozione ruoli.
- Aggiunta pagina `/admin/utenti` e collegamento dalla console admin.
- Estesi i test database con isolamento RLS user A/B e test RPC privilegiata.
- Corretto il guard server per restituire 401 senza sessione invece di 500.

### File principali modificati

- `supabase/migrations/20260829200000_admin_role_management.sql`
- `supabase/tests/database_foundation.test.sql`
- `server/utils/authorization.ts`, `server/api/admin/`
- `app/pages/admin/index.vue`, `app/pages/admin/utenti.vue`
- `tests/e2e/home.spec.ts`, `package.json`, `docs/ai/`, `docs/dev/`

### Verifiche

- `pnpm db:test` -> PASS, 29 test pgTAP
- `pnpm lint` -> PASS
- `pnpm format:check` -> PASS
- `pnpm typecheck` -> PASS
- `pnpm test` -> PASS
- `pnpm test:e2e` -> PASS, 3 test Chromium
- `pnpm build` -> PASS
- Smoke RLS/Auth/role management -> PASS

### Problemi emersi

- Nessun blocker. Restano configurazioni future per QUALITY: reset password,
  SMTP custom e Google OAuth.

### Stato finale della sessione

Phase 2 completata. Proseguire con Phase 3 secondo `docs/ai/NEXT_STEPS.md`.

## 2026-08-29 — Sessione 6

### Lavoro svolto

- Collegata la homepage alla view `public_events` tramite composable tipizzato.
- Implementati `/eventi`, `/eventi/[slug]` e la compatibilita della route
  `/evento` con il prossimo evento.
- Aggiunta visualizzazione pubblica di postazioni e attivita dalle view
  `public_event_*`, senza capienza o campi interni.
- Gestiti loading, errore e stato vuoto nel catalogo e nella homepage.
- Aggiunti canonical, JSON-LD `Event`, `robots.txt` environment-aware e sitemap
  dinamica con gli slug degli eventi pubblici.
- Rimossa la chiave Supabase placeholder dalla configurazione Playwright: i test
  locali usano l'`.env` ignorato dal repository.

### File principali modificati

- `app/composables/usePublicEvents.ts`
- `app/components/public/EventCard.vue`
- `app/pages/index.vue`, `app/pages/evento.vue`, `app/pages/eventi/`
- `server/routes/robots.txt.ts`, `server/routes/sitemap.xml.ts`
- `playwright.config.ts`, `tests/e2e/home.spec.ts`
- `docs/ai/`, `docs/dev/guideline_test_features.md`

### Verifiche

- `pnpm lint` -> PASS
- `pnpm typecheck` -> PASS, warning Volar non bloccante
- `pnpm test` -> PASS, 1 test
- `pnpm test:e2e` -> PASS, 4 test Chromium
- `pnpm build` -> PASS
- Smoke SSR bundle -> PASS su home, eventi, dettaglio, robots e sitemap

### Stato finale della sessione

Phase 3 parzialmente completata: vertical slice eventi/SEO pronto. Riprendere
con contenuti pubblici e base CMS indicati in `docs/ai/NEXT_STEPS.md`.

## 2026-08-29 — Sessione 7

### Lavoro svolto

- Aggiunte le projection view Supabase `public_activities`,
  `public_news_posts` e `public_service_pages`, con filtro ai soli contenuti
  `published` e senza campi CMS interni.
- Aggiunti fixture DEV pubblicati per una news e un servizio; aggiornati tipi
  database, seed e test pgTAP.
- Implementate le route pubbliche `/esperienze`, `/news`, `/news/[slug]`,
  `/servizi`, `/servizi/[slug]` e `/regolamento`.
- Estesa la sitemap con news e servizi pubblicati e aggiunto un test E2E sulle
  pagine CMS pubbliche.
- Registrata DEC-009 per il contratto delle projection view editoriali.

### Verifiche

- `pnpm db:reset` -> PASS
- `pnpm db:test` -> PASS, 37 test pgTAP
- `pnpm format` -> PASS
- `pnpm typecheck` -> PASS, warning Volar non bloccante
- `pnpm lint` -> PASS
- `pnpm test` -> PASS, 1 test
- `pnpm build` -> PASS, preset `node-server`
- `pnpm test:e2e` -> PASS, 5 test Chromium
- Smoke SSR bundle -> PASS su tutte le route pubbliche, robots e sitemap

### Stato finale della sessione

Phase 3 avanzata: contenuti pubblici e SEO editoriale sono pronti con fixture
DEV. Proseguire con console CMS amministrativa, richieste servizi e contenuti
reali secondo `docs/ai/NEXT_STEPS.md`.

## 2026-08-29 — Sessione 8

### Lavoro svolto

- Trasformata la console `/admin` da placeholder in dashboard con accesso a CMS
  news e servizi.
- Implementate `/admin/news` e `/admin/servizi` con lista, creazione, modifica,
  slug normalizzato, stato di pubblicazione/attivazione, campi SEO e feedback
  di salvataggio.
- Le scritture usano il client Supabase autenticato; l'accesso resta protetto
  da middleware ruolo e dalle policy RLS admin già esistenti.

### Verifiche

- `pnpm format` -> PASS
- `pnpm typecheck` -> PASS, warning Volar non bloccante
- `pnpm lint` -> PASS
- `pnpm test` -> PASS, 1 test
- `pnpm build` -> PASS, preset `node-server`
- Smoke preview -> PASS: route pubbliche 200, CMS fixture, robots/sitemap e
  redirect anonimi delle route admin
- `pnpm test:e2e` -> PASS, 5 test Chromium

### Stato finale della sessione

Phase 3 avanzata: authoring CMS news/servizi pronto in DEV. Restano richieste
servizi, gestione admin eventi/catalogo, upload asset e test manuale autenticato.

## 2026-08-29 — Sessione 9

### Lavoro svolto

- Implementato il form pubblico per richieste servizi con validazione server,
  controllo del servizio attivo e honeypot anti-bot.
- Aggiunti endpoint admin per elenco e aggiornamento delle richieste, con stato
  operativo e note interne protetti da ruolo admin e RLS.
- Aggiunta `/admin/richieste`, aggiornato il dettaglio servizio e ampliata la
  copertura E2E/pgTAP.

### Verifiche

- `pnpm format` -> PASS
- `pnpm lint` -> PASS
- `pnpm typecheck` -> PASS, warning Volar non bloccante
- `pnpm test` -> PASS, 1 test
- `pnpm db:test` -> PASS, 39 test pgTAP
- `pnpm build` -> PASS, preset `node-server`
- Smoke preview -> PASS: form lead SSR, payload invalido 400 e route admin protette
- `pnpm test:e2e` -> PASS, 5 test Chromium

### Stato finale della sessione

Phase 3 avanzata: flusso lead servizi pronto in DEV. Restano gestione admin
eventi/catalogo, upload asset e test manuale autenticato.

## 2026-08-29 — Sessione 10

### Lavoro svolto

- Aggiunta `/admin/eventi` con elenco, creazione e modifica degli eventi.
- Gestiti stato, date, finestra prenotazioni, prezzo sul posto, capienza,
  visibilità capienza, waiting list, luogo e metadati SEO.
- Collegata la nuova sezione alla dashboard `/admin`; la scrittura resta
  protetta da middleware ruolo e policy RLS `events_admin_manage`.

### Verifiche

- Prettier mirato -> PASS.
- `pnpm build` -> PASS, preset `node-server`.
- Retry lint/typecheck mirato -> interrotto dopo bootstrap Nuxt senza errori
  emessi; resta warning noto `vue-router/volar/sfc-route-blocks`.

### Stato finale della sessione

Phase 3 avanzata: gestione admin eventi pronta per test manuale DEV. Restano
catalogo e associazioni evento/postazione/attività, upload asset e contenuti
reali.

## 2026-08-29 — Sessione 11

### Lavoro svolto

- Aggiunta `/admin/catalogo` con tab per attività e postazioni globali.
- Implementati CRUD, slug normalizzato, categorie Supabase, stato attivo,
  capienza standard e metadati SEO per le attività.
- Collegata la nuova sezione alla dashboard `/admin`; le scritture usano il
  client autenticato e le policy RLS del catalogo.

### Verifiche

- Prettier mirato -> PASS.
- `pnpm test` -> PASS, 1 test unitario.
- `pnpm build` -> PASS, preset `node-server`.

### Stato finale della sessione

Phase 3 avanzata: catalogo globale pronto per test manuale DEV. Restano le
associazioni evento/postazione/attività, upload asset e contenuti reali.

## 2026-08-29 — Sessione 12

### Lavoro svolto

- Aggiunta `/admin/eventi/[id]` per configurare il catalogo di un evento.
- Implementata la selezione di postazioni e attività attive e la gestione delle
  associazioni many-to-many in `event_station_activities`.
- Collegato il percorso dalla lista eventi; la configurazione resta protetta da
  middleware ruolo e policy RLS.

### Verifiche

- Prettier mirato -> PASS.
- `pnpm build` -> PASS, preset `node-server`.
- `vue-tsc --noEmit -p .nuxt/tsconfig.json` -> PASS dopo correzione di
  narrowing e gestione dei ref nel template; restano warning Volar noti.

### Stato finale della sessione

Phase 3 avanzata: associazioni evento/catalogo pronte per test manuale DEV.
Restano override per evento, upload asset e contenuti reali.

## 2026-08-29 — Sessione 13

### Lavoro svolto

- Estesa `/admin/eventi/[id]` con override per singola postazione e attività.
- Gestiti nome pubblico, descrizione, capienza, visibilità, stato attivo,
  modalità d'accesso e orari delle attività.
- Aggiunta validazione preventiva di capienze e intervalli orari per evitare
  scritture parziali in caso di dati non validi.

### Verifiche

- Prettier mirato -> PASS.
- `vue-tsc --noEmit -p .nuxt/tsconfig.json` -> PASS; warning Volar noto.
- `pnpm build` -> PASS, preset `node-server`.

### Stato finale della sessione

Phase 3 avanzata: configurazione evento completa per associazioni e override.
Restano upload asset, contenuti reali e test manuale autenticato.

## 2026-08-29 — Sessione 14

### Lavoro svolto

- Aggiunta migration Supabase Storage per il bucket `vrsus-assets`, con lettura
  pubblica e policy di scrittura limitate a `admin` e `super_admin`.
- Aggiunto `AssetUploader` riutilizzabile con validazione MIME/dimensione,
  preview, rimozione del campo e persistenza del solo path.
- Collegato l'uploader alle console news, servizi, eventi e catalogo.

### Verifiche

- `pnpm db:reset` -> PASS; bucket e policy applicati localmente.
- `pnpm db:test` -> PASS, 43 test pgTAP.
- `vue-tsc --noEmit -p .nuxt/tsconfig.json` -> PASS; warning Volar noto.
- `pnpm build` -> PASS, componente uploader incluso nel bundle server.

### Stato finale della sessione

Phase 3 avanzata: upload asset pronto per test manuale autenticato DEV.
Restano contenuti e asset reali QUALITY/PROD e le verifiche manuali delle
console.

## 2026-08-30 — Sessione 15

### Lavoro svolto

- Implementate RPC V1 per prenotazione race-safe, cancellazione, promozione
  waiting list, QR hash-only, check-in idempotente e pagamento sul posto.
- Aggiunte dashboard utente prenotazioni, inbox notifiche e console admin
  `/admin/checkin` e `/admin/live`.
- Implementato il modello V2 tornei con iscrizione, check-in, bracket
  single-elimination deterministico con bye, risultati e ranking ledger.
- Aggiunte route pubbliche `/tornei`, `/tornei/[slug]`, `/ranking` e console
  `/admin/tornei`.
- Aggiunto fallback offline PWA e checklist manuali V1/V2/PWA/QUALITY.

### Verifiche

- `corepack pnpm db:reset` -> PASS dopo un retry per 502 transitorio del reset.
- `corepack pnpm db:test` -> PASS, 87 test pgTAP.
- `corepack pnpm test` -> PASS, 1 test unitario.
- `corepack pnpm lint` -> PASS, sei warning HTML preesistenti/non bloccanti.
- `corepack pnpm format:check` -> PASS.
- `corepack pnpm typecheck` -> PASS; warning Volar/vue-router non bloccante.
- `corepack pnpm build` -> PASS, preset `node-server` e service worker PWA.

### Stato finale della sessione

Le milestone implementative V1/V2 sono presenti nel repository. Restano test
manuali autenticati su DEV/QUALITY, installazione PWA/fotocamera su device e
configurazione dei servizi remoti, documentati nelle checklist.

## 2026-08-30 — Sessione 17: estensione operativa V2 e push

- Aggiunta migration `20260830120000_v2_operations_push.sql` con stato
  `checkin`, operazioni match, notifiche applicative automatiche, preferenze e
  subscription push, ranking per attività e adjustment admin.
- Implementato adapter OneSignal server-side con retry limitati e fallback
  inbox; aggiunta UI utente per abilitare/disabilitare le push.
- Estesa console torneo con assegnazione postazione, `Call players`, avvio
  match, score JSON e nuova route di dispatch autorizzata.
- Estesa classifica generale/per attività e dashboard con riepilogo personale.
- Aggiunta console `/admin/ranking` con selezione utente/attività e adjustment
  positivo o negativo auditabile.
- Aggiunti test pgTAP per operazioni/push e torneo single-elimination a 8
  partecipanti; la suite locale passa 122 test.
- La verifica visuale autenticata non e stata eseguita perché il backend
  browser integrato non era disponibile nella sessione.
- Verifica finale automatica: db reset e 122 test pgTAP, lint, format, typecheck,
  unit, E2E seriale 6/6, build Node e build Cloudflare PASS.

## 2026-08-30 — Sessione 16

- Corretto il rilevamento dell’iscrizione personale nella pagina pubblica del
  torneo: ora viene risolta tramite `tournament_entry_members` dell’utente
  autenticato e non tramite il primo partecipante pubblico.
- Eseguita la verifica conclusiva: lint PASS con 9 warning HTML non bloccanti,
  format PASS, typecheck PASS, unit PASS (1), pgTAP PASS (87), E2E seriale PASS
  (5/5) e build standard PASS (`node-server`, PWA inclusa).
- Aggiornato l’handoff con gli esiti finali e lasciate come `USER ACTION
  REQUIRED` soltanto le verifiche manuali su account/device e la configurazione
  dei servizi remoti QUALITY/PROD.

## 2026-08-30 - Sessione 18: completamento route protette

- L'audit della specifica ha rilevato le route previste ma ancora mancanti
  `/app/eventi`, `/app/tornei`, `/app/tornei/[id]`, `/app/profilo` e
  `/admin/impostazioni`.
- Implementate le nuove superfici con query Supabase tipizzate, RLS per i dati
  utente, azioni torneo tramite RPC e gestione JSON validata per `site_settings`.
- Aggiunta una regression E2E per i redirect anonimi delle nuove route.
- Typecheck e lint PASS; build standard e Cloudflare PASS; E2E seriale PASS
  (7/7). Lint segnala 10 warning HTML non bloccanti.

## 2026-08-30 - Sessione 19: audit pubblico e chiusura gate automatici

- L’audit della specifica ha rilevato la route pubblica mancante
  `/esperienze/[slug]`; aggiunto il dettaglio CMS con query tipizzata, SEO,
  fallback visuale controllato e regression E2E.
- Estesa la proiezione `public_events` con capienza pubblica privacy-safe:
  modalità `hidden`, `status` ed `exact`, stati derivati e soglia
  quasi-completo configurabile; aggiunta la decisione DEC-015 e 11 test pgTAP.
- Aggiornati tipi Supabase, card pubblica eventi, lint config e timeout del
  web server Playwright per il cold start Nuxt su Windows.
- Durante il reset locale il container realtime/storage non è ripartito
  automaticamente; riavvio Docker non distruttivo eseguito e ambiente
  ripristinato.
- Gate verificati: db:test PASS (133/133), unit PASS (1/1), E2E seriale PASS
  (7/7), typecheck PASS, lint PASS senza warning, format PASS, build
  `node-server` PASS e build `cloudflare_pages` PASS.
- Restano USER ACTION REQUIRED i test manuali autenticati/device e la
  configurazione/deploy dei servizi remoti QUALITY/PRODUCTION; warning Volar/
  vue-router, Cloudflare Node compatibility e ciclo di re-export Supabase
  restano non bloccanti.

## 2026-08-30 - Sessione 20: workflow eventi, no-show e guardie di stato

### Lavoro svolto

- Implementato il no-show operativo per staff/admin con RPC atomica, revoca del
  QR, controllo evento terminato/in corso e audit log; aggiornata la console
  `/admin/live`.
- Implementate duplicazione e archiviazione eventi per admin/super-admin, con
  copia di configurazione e associazioni ma senza prenotazioni, check-in o
  tornei; aggiunti audit e UI in `/admin/eventi`.
- Aggiunte guardie database per le macchine a stati di eventi, tornei e match.
- Corretto l'avanzamento single-elimination: un match a un solo partecipante
  viene chiuso automaticamente soltanto se l'altro feeder è un bye reale;
  i bracket a 4 e 8 partecipanti ora attendono correttamente il secondo
  risultato.
- Aggiunta copertura pgTAP dedicata per le transizioni e aggiornate le
  procedure manuali e i documenti di handoff.

### File principali modificati

- `supabase/migrations/20260830140000_booking_notifications_no_show.sql`
- `supabase/migrations/20260830150000_event_admin_workflows.sql`
- `supabase/migrations/20260830160000_state_machine_guards.sql`
- `supabase/tests/booking_workflows.test.sql`
- `supabase/tests/event_admin_workflows.test.sql`
- `supabase/tests/state_machine_guards.test.sql`
- `app/pages/admin/eventi.vue`
- `app/pages/admin/live.vue`
- `app/composables/useBookings.ts`
- `docs/dev/guideline_test_features.md`

### Verifiche

- `corepack pnpm db:reset` -> PASS.
- `corepack pnpm db:test` -> PASS, 169/169 test pgTAP.
- `corepack pnpm db:types` -> PASS.
- `corepack pnpm lint` -> PASS.
- `corepack pnpm format:check` -> PASS.
- `corepack pnpm typecheck` -> PASS; warning Volar/vue-router non bloccante.
- `corepack pnpm test` -> PASS, 1/1 unit test.
- `corepack pnpm exec playwright test --workers=1` -> PASS, 7/7 Chromium.
- `corepack pnpm build` -> PASS, preset `node-server`.
- `corepack pnpm exec nuxt build --preset=cloudflare_pages` -> PASS; warning
  Node compatibility/re-export Supabase non bloccante.

### Problemi emersi

Il primo test delle guardie ha rilevato la chiusura prematura dei match a valle
nei bracket a più round; il comportamento è stato corretto e verificato con i
test a 4 e 8 partecipanti. Restano i gate manuali autenticati/device e le
configurazioni remote QUALITY/PRODUCTION.

### Stato finale della sessione

Le milestone implementative locali risultano verificate automaticamente. Il
repository è pronto per la verifica manuale delle nuove azioni admin e per il
passaggio a QUALITY; non viene marcato `IMPLEMENTAZIONE COMPLETATA` finché i
gate manuali e remoti restano aperti.

## 2026-09-10 - Ridefinizione prodotto V2

Il proprietario ha ridefinito vetrina, app utente e console admin. Prima della
redazione sono state chiuse quattro ambiguita con domanda diretta: piattaforma
e postazione sono la stessa entita; il ranking espone punti e record per gioco;
i punteggi arcade li registra solo lo staff; le console admin esistenti vengono
assorbite dove ha senso.

Prodotto: `docs/technical/VRSUS_APP_SPEC_V2.md`, con modello dati, mappa delle
rotte, specifica schermata per schermata in ottica mobile-first, roadmap in
dieci fasi con Definition of Done, impatti sul codice esistente e rischi.

Decisioni registrate: DEC-020 (autorita del documento V2), DEC-021 (piattaforma
= postazione, che supera il vincolo storico di AGENT_START_HERE), DEC-022
(i giochi sostituiscono le attivita), DEC-023 (ranking a due letture), DEC-024
(data di nascita al posto dell'eta), DEC-025 (tre shell e navigazione per
gruppo di rotte).

Aggiornati `AGENTS.md` (ordine di lettura e priorita), `CURRENT_STATE.md` e
`NEXT_STEPS.md`. Nessuna modifica al codice: la fase A parte dalla migration
del dominio piattaforme/giochi.

## 2026-09-10 - Chiusura questioni aperte V2

Il proprietario ha risposto alle quattro questioni aperte: minorenni accettati
con consenso genitoriale, punteggio dei tornei da rendere elastico perche
dipende dal torneo, politica nickname confermata come proposta, fine riga da
chiarire.

Specifica V2 estesa con: sezione 3.6 sugli utenti minorenni e le due soglie di
eta, sezione 3.7 sugli schemi di punteggio, tabelle `guardian_consents`,
`point_schemes`, `point_scheme_rules` e `profile_nickname_history`, funzione
`is_minor()`, campo `tournaments.point_scheme_id`, flusso di registrazione di
un minore, console degli schemi di punteggio, aggiornamento di roadmap
(fasi B e G), impatti e rischi.

Decisioni: DEC-026 (minorenni e consenso), DEC-027 (punteggio configurabile per
schema, che supera l'assegnazione cablata in `record_match_result`), DEC-028
(Prettier con `endOfLine: 'auto'`).

Verificato che i punti oggi sono cablati in `record_match_result` a 100 e 60
per le sole prime due posizioni: la fase G deve sostituire quella logica, non
affiancarla, altrimenti i punti verrebbero assegnati due volte.

`pnpm format:check` riportato a PASS su tutti i file.

## 2026-09-11 - Implementazione completa della V2

Realizzate tutte le fasi della roadmap V2.

Database: rinomina del dominio postazioni in piattaforme, ritiro di
`activities`, introduzione di `games`, `game_scores`, schemi di punteggio,
bacheca, feedback, consensi genitoriali e storico nickname. Aggiunto hardening
dei grant di default (TRUNCATE ignora le RLS). Motore dei punti riscritto per
leggere lo schema collegato al torneo, con piazzamenti derivati dal round di
eliminazione e supporto ai gironi. Suite pgTAP da 169 a 211 test.

Frontend: tre shell (vetrina, app, console), diciotto pagine nuove o riscritte,
endpoint service-role per piattaforme, bacheca e riepilogo console.

Difetti trovati durante la verifica funzionale e corretti: incompatibilita fra
`pageTransition` e pagine async che bloccava la navigazione client-side
(DEC-029), conflitto di rotte annidate su `/app/tornei/[id]` con test di
regressione permanente, cinque pagine con `v-if` sulla radice del template,
test pgTAP dipendente dallo stato mutabile delle fixture (DEC-030).

Tutti i gate verdi: lint, format, typecheck, unit, E2E 8/8, pgTAP 211/211,
build standard e Cloudflare.

## 2026-09-12 - Console dinamica e schede condivise

Revisione della console richiesta dal proprietario.

Rimosso il passaggio all'area personale dalla shell admin: chi amministra non
ha un profilo di gioco (DEC-031).

Dashboard `/admin` riscritta come vista dinamica sull'evento che conta adesso:
quello in corso se esiste, altrimenti il prossimo programmato. Informazioni
della giornata in alto, poi due schede. A evento programmato: prenotati con
nome, cognome, eta, tornei e il segno di "prima volta da VRSUS", piu i tornei
con orario e iscritti; il pulsante `Start evento` porta in modalita live e
avvisa gli iscritti confermati. A evento in corso: partecipanti effettivamente
presenti e tornei con conto alla rovescia, cronometro, stato, iscritti,
presenti e partite giocate.

Introdotta la scheda utente `/admin/utenti/[id]` e riscritta la scheda torneo,
entrambe con struttura unica riutilizzabile (DEC-032): componenti in
`app/components/profile/` e `app/components/tournament/`, tipi in
`shared/types/`, classifica e etichette dei round come funzioni pure in
`shared/utils/tournament-standings.ts`. La stessa scheda torneo alimenta la
console (dati anagrafici, comandi riservati) e l'app utente (soli nickname).
Il tabellone a eliminazione diretta e disegnato a colonne sul modello di
Challonge, con i collegamenti come pseudo-elementi.

Nuovi endpoint service-role: `/api/admin/dashboard`,
`/api/admin/events/[id]/start`, `/api/admin/users/[id]`,
`/api/admin/tournaments/[id]` e la gestione manuale degli iscritti
(`entries`, `entries/[entryId]`, `candidates`).

### File principali modificati

- `app/layouts/admin.vue`, `app/pages/admin/index.vue`
- `app/pages/admin/utenti/index.vue`, `app/pages/admin/utenti/[id].vue`
- `app/pages/admin/tornei/[id].vue`, `app/pages/app/tornei/[id]/index.vue`
- `app/components/profile/`, `app/components/tournament/`,
  `app/components/ui/VrsusTabs.vue`
- `app/composables/useTournamentView.ts`
- `server/api/admin/`, `server/utils/tournament-detail.ts`
- `shared/types/`, `shared/utils/tournament-standings.ts`
- `tests/unit/tournament-standings.test.ts`, `tests/e2e/home.spec.ts`
- `docs/technical/VRSUS_APP_SPEC_V2.md`, `docs/ai/`, `docs/dev/`

### Difetti trovati durante la verifica funzionale e corretti

- I collegamenti del tabellone erano invisibili: `overflow: hidden` sul
  riquadro dell'incontro tagliava gli pseudo-elementi che escono dal box.
- Il pulsante "Salva risultato" compariva su incontri in stato `ready`, dove
  la guardia di transizione rifiuta il passaggio a `completed`. La sequenza
  chiama -> avvia -> risultato e ora esplicita nell'interfaccia.
- Il conto alla rovescia mostrava ore a tre cifre per eventi a giorni di
  distanza; sopra le ventiquattro ore ora si contano i giorni.
- Un torneo avviato prima dell'orario previsto mostrava un conto alla rovescia
  pur essendo in corso.

### Verifiche

- `pnpm lint` -> PASS
- `pnpm format:check` -> PASS
- `pnpm typecheck` -> PASS
- `pnpm test` -> PASS, 10 test (8 nuovi sulla classifica)
- `pnpm exec playwright test --workers=1` -> PASS, 8/8 Chromium
- `pnpm db:test` -> PASS, 211/211 pgTAP
- `pnpm build` -> PASS, preset `node-server`
- Verifica funzionale nel browser: iscrizione manuale, check-in, avvio torneo,
  chiamata e avvio incontro, registrazione risultato, corone in classifica,
  scheda utente con eventi/tornei/ranking, `Start evento` con notifica ai due
  iscritti confermati, viste mobile e desktop.

### Problemi emersi e non risolti

- `record_match_result` accetta stati che la guardia poi rifiuta: incoerenza
  di dominio, aggirata dall'interfaccia e annotata in `CURRENT_STATE.md`.
- Le notifiche di chiamata al match puntano a `/tornei/<slug>`, rotta ritirata.

### Stato finale della sessione

Console rivista e verificata, documentazione allineata, tutti i gate verdi.

## 2026-09-12 - Wizard evento, terza scheda dashboard e spaziature mobile

Secondo giro di modifiche richieste dal proprietario sulla console.

**Dashboard.** Tolte le tre card di riepilogo in fondo (utenti, richieste,
feedback): non erano state chieste. Le schede restano agganciate in alto
durante lo scorrimento. Aggiunta la scheda "Piattaforme" con una card per
postazione dell'evento e l'elenco dei giochi disponibili. La scheda Tornei
mostra l'orario di inizio in evidenza: il conto alla rovescia compare solo
nell'ultima ora, il cronometro solo a torneo avviato. I tornei elencati sono
gia soltanto quelli con `event_id` dell'evento mostrato.

**Eventi.** L'elenco non contiene piu il form di creazione: "Nuovo evento"
porta a `/admin/eventi/nuovo`. "Duplica" ora funziona con un solo clic e crea
una copia in bozza non pubblicata. "Archivia" e sostituito da "Elimina", che
cancella evento, tornei, prenotazioni e check-in previa conferma. Tolto il
pulsante "Catalogo evento": postazioni e giochi si scelgono dentro il wizard.

**Wizard evento.** Tre schede: Info (solo i campi della giornata), Piattaforme
(card con casella di selezione e giochi espandibili dentro la card), Tornei
(elenco piu creazione). Il primo "Avanti" salva la bozza, perche postazioni e
tornei hanno bisogno di un `event_id` (DEC-033). La creazione di un torneo
dell'evento filtra le postazioni su quelle scelte e i giochi su quelli resi
disponibili per quella postazione; l'orario eredita il giorno dell'evento.

**Spaziature mobile.** Dieci pagine avevano un `<main>` con padding proprio
dentro il `<main>` gia spaziato della shell: 40 px per lato e 64 px sopra su
uno schermo da 375. Rimosso il doppio contenitore e ridotto il padding della
shell a 16 px.

### File principali modificati

- `app/pages/admin/index.vue`, `app/pages/admin/eventi/`
- `app/components/admin/EventInfoForm.vue`,
  `app/components/admin/EventPlatformPicker.vue`
- `app/composables/useEventForm.ts`
- `app/layouts/admin.vue`, `app/layouts/app.vue`, `app/assets/css/main.css`
- `server/api/admin/dashboard.get.ts`,
  `server/api/admin/events/[id].delete.ts`
- `shared/types/admin-dashboard.ts`
- dieci pagine ripulite dal contenitore con padding duplicato

### Difetti trovati durante la verifica funzionale e corretti

- `overflow-x: hidden` sulla radice delle shell annullava `position: sticky`
  sui discendenti: l'header della console non restava in alto su mobile e le
  barre di schede non si sarebbero agganciate (DEC-034).
- Selezionando una postazione la card non si apriva sui giochi: lo stato veniva
  riletto dal model subito dopo l'assegnazione, quando ancora conteneva il
  valore precedente.

### Verifiche

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck` -> PASS
- `pnpm test` -> PASS, 10 test
- `pnpm exec playwright test --workers=1` -> PASS, 8/8
- `pnpm build` -> PASS
- Verifica funzionale nel browser: dashboard con tre schede e schede
  agganciate, creazione evento completa dal wizard fino al torneo,
  duplicazione, eliminazione con dipendenze, viste a 375 px.

### Stato finale della sessione

Console e flusso eventi rivisti come richiesto, documentazione allineata, tutti
i gate verdi. I due eventi di prova creati durante la verifica sono stati
eliminati.

## 2026-09-12 - Tema scuro, scheda evento e dati dimostrativi

Terzo giro di modifiche sulla console, piu la giornata di prova richiesta per
guardare tabellone e gironi con numeri veri.

**Componenti.** I campi di Nuxt UI rendevano il tema chiaro (caselle bianche su
pagina nera, tendine bianche su bianco) perche la classe `dark` non arrivava
mai sull'elemento radice. Impostato `colorMode` su `dark` con preferenza su
cookie e riportati i token della libreria sulla palette VRSUS; le select native
hanno ora una forma sola (`.vrsus-select`) e la pagina dichiara
`color-scheme: dark`, senza la quale la tendina di sistema resta chiara
(DEC-035).

**Dashboard.** Tolto il pulsante "Aggiorna". Le azioni sono due e si alternano:
`Modifica` con `Start evento` prima dell'avvio, `Modifica` con `Check-in` dopo,
entrambe in taglia grande.

**Scheda evento.** La card di un evento in elenco ora apre `/admin/eventi/[id]`
con lo stesso riepilogo della dashboard e senza comandi; il wizard si e
spostato su `/admin/eventi/[id]/modifica`. Il riepilogo e un componente solo
(`AdminEventOverview`) alimentato da `buildEventOverview`, condiviso fra
dashboard e scheda.

**Tornei.** La lista ha tre schede: In corso (nascosta se vuota), In programma,
Storico. Nella scheda di un torneo la testata mostra di suo solo stato,
piattaforma, nome e vincitore, con il resto dietro a "Mostra dettagli".

**Giochi.** Griglia a due colonne gia da telefono: a colonna singola le card
erano enormi.

**Dati dimostrativi.** Sedici utenti demo creati con l'Auth Admin API e la
giornata "VRSUS Showcase": tre postazioni con i loro giochi, sedici
prenotazioni di cui dodici gia presenti, un torneo a eliminazione diretta da
sedici concluso (quindici incontri) e un girone da sedici giocato per due terzi
(ottanta incontri su centoventi). Lo script sta in
`supabase/dev/demo_showcase.sql` e si puo rieseguire.

### File principali modificati

- `nuxt.config.ts`, `app/assets/css/main.css`
- `app/components/admin/EventOverview.vue`, `app/pages/admin/index.vue`
- `app/pages/admin/eventi/[id]/index.vue`,
  `app/pages/admin/eventi/[id]/modifica.vue`
- `app/pages/admin/tornei/index.vue`, `app/components/tournament/Summary.vue`
- `server/utils/event-overview.ts`,
  `server/api/admin/events/[id]/overview.get.ts`
- `shared/types/event-overview.ts` (era `admin-dashboard.ts`)
- `supabase/dev/demo_showcase.sql`

### Difetti trovati durante la verifica e corretti

- `--ui-radius` non e una variabile della sola libreria: da li dipende tutta la
  scala `rounded-*` di Tailwind. Portarla a 0.75rem aveva triplicato gli angoli
  di ogni card dell'applicazione.
- In tema scuro il colore primario di Nuxt UI usa la tinta 400: il rosso del
  marchio diventava rosa sui pulsanti pieni.
- Il test E2E della home asseriva il titolo dell'evento di fixture: con una
  giornata dimostrativa piu vicina nel tempo falliva senza che nulla fosse
  rotto. Ora verifica che la locandina esista e porti alla scheda, non quale
  evento sia (DEC-030).

### Verifiche

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck` -> PASS
- `pnpm test` -> PASS, 10 test
- `pnpm exec playwright test --workers=1` -> PASS, 8/8
- `pnpm db:test` -> PASS, 211/211
- `pnpm build` -> PASS
- Verifica funzionale: dashboard live con le due azioni, scheda evento in sola
  lettura, tabellone a sedici su quattro round, girone a sedici con classifica,
  select scure, giochi a due colonne su telefono.

### Stato finale della sessione

Console allineata alle richieste, dati dimostrativi disponibili in locale,
documentazione aggiornata, tutti i gate verdi.

## 2026-09-13 - Plancia Live: pallino, scheda richiudibile e tab bar

### Lavoro svolto

- La dashboard della console diventa la plancia della serata. L'intestazione a
  evento avviato dice `Live` con il pallino rosso lampeggiante al posto di
  `Evento in corso`.
- Nuovo `UiVrsusLiveDot` piu le classi `.vrsus-live-dot` in `main.css`: un solo
  pallino per tutta l'applicazione, con dimensione parametrica. Lo usano
  intestazione, pastiglia di stato, pastiglia dei tornei in corso e tab bar.
- Riscritta la scheda della giornata in `AdminEventOverview`: stato e sede in
  alto, giorno e fascia oraria come titolo, il numero che conta in grande
  (presenti su prenotati a evento avviato, prenotati su capienza prima), il
  resto in una griglia di dati richiudibile con il comando `Dettagli`. Le
  azioni stanno in un piede separato e restano sempre visibili.
- La scheda `Partecipanti` mostra `12/36` a evento avviato; il riepilogo
  numerico che stava sotto le schede e stato tolto perche ripeteva lo stesso
  dato due volte.
- I tornei della giornata sono ordinati per stato: prima quelli in corso, poi
  quelli da giocare, in fondo i conclusi, che restano visibili ma attenuati.
- Pagina Postazioni a due colonne anche su telefono, in vetrina e in console.
- La prima voce della tab bar della console si chiama `Live` e accende il
  pallino quando c'e un evento in corso, letto da `GET /api/admin/live-state`
  tramite `useAdminLiveEvent()` (DEC-036).
- `Altro` non elenca piu `Live evento` e `Check-in`; i gruppi senza voci
  visibili per il ruolo corrente non vengono piu resi.

### File principali modificati

- `app/assets/css/main.css`
- `app/components/ui/VrsusLiveDot.vue` (nuovo)
- `app/components/ui/VrsusTabBar.vue`
- `app/components/ui/VrsusTabs.vue`
- `app/components/admin/EventOverview.vue`
- `app/composables/useAdminLiveEvent.ts` (nuovo)
- `app/layouts/admin.vue`
- `app/pages/admin/index.vue`
- `app/pages/admin/altro.vue`
- `app/pages/admin/piattaforme/index.vue`
- `app/pages/postazioni/index.vue`
- `server/api/admin/live-state.get.ts` (nuovo)

### Verifiche

- `pnpm lint`, `pnpm typecheck` -> PASS
- `pnpm test` -> PASS, 10 test
- `pnpm build` -> PASS
- Verifica funzionale in locale con la giornata dimostrativa in corso, a 375 px
  e su desktop: intestazione `Live` con pallino, scheda che si apre e si
  chiude, `Partecipanti 12/16`, tornei con il torneo in corso in cima e quello
  concluso in fondo, `Postazioni` a due colonne in vetrina e in console, `Altro`
  senza il gruppo `Operazioni`, pallino acceso sulla voce `Live` della tab bar.

### Stato finale della sessione

Richieste del proprietario implementate e verificate a schermo. Nessuna
modifica al database.

## 2026-09-13 - Motore tornei elastico

### Lavoro svolto

- Un torneo non ha piu un "formato" ma tre domande indipendenti: chi gioca
  (singolo, coppia, squadra), come ci si affronta (eliminazione, tutti contro
  tutti, manche, uno alla volta) e come si vince (vittoria, punti, tempo,
  ordine di arrivo). DEC-037.
- Una partita non ha piu due lati: `match_participants` tiene una riga per
  posto, con punteggio, piazzamento, esito e punti assegnati. Via
  `entry_a_id`, `entry_b_id` e `score_payload`.
- Un solo generatore di calendario (`generate_tournament_schedule`), una sola
  registrazione di risultato (`record_match_results`) e una sola classifica
  (`tournament_standings`) per tutti i formati. La classifica restituisce
  giocate, vinte, pari, perse, punti, miglior risultato, tempo totale e round
  di eliminazione: l'ordinamento segue `standing_metric`.
- Manche: i gruppi si formano scegliendo ogni volta chi si e incontrato di
  meno, cosi nessuno rigioca contro lo stesso avversario finche esistono
  combinazioni libere. In alternativa i gruppi seguono la classifica, e in quel
  caso la manche successiva nasce quando la precedente e chiusa.
- Squadre: `create_tournament_team`, `join_tournament_team` (per id o per
  codice di invito), `leave_tournament_team`, piu l'endpoint service-role per
  il completamento manuale da parte dello staff. Una squadra incompleta
  blocca la generazione del calendario con un errore esplicito.
- I punti di piazzamento VRSUS si assegnano dalla classifica finale, per
  qualunque formato: `_award_knockout_placements` e stata ritirata.
- Slug dei tornei generato dal database come `piattaforma-gioco-data`
  (DEC-039); campo tolto dalle maschere.
- Maschere di creazione e modifica riorganizzate nei tre blocchi, con preset,
  frase di riepilogo e anteprima del calendario. Descrizione e regole sono
  textarea anche nella console tornei.
- Scheda partita nelle tre forme: duello, manche con ordine di arrivo e punti,
  tentativo a cronometro con distacco. Classifica con colonne diverse secondo
  il criterio del torneo.
- App utente: iscrizione a squadre (crea, entra, codice), scheda "Squadre" con
  il codice visibile al solo capitano.
- Guardia degli incontri: il risultato si registra anche senza chiamata e
  avvio (DEC-038). Le notifiche di chiamata puntano ora a `/app/tornei/<id>`,
  non piu alla rotta ritirata `/tornei/<slug>`.
- Difetto trovato e corretto: la policy di lettura dei check-in confrontava
  `member.entry_id` con se stesso, quindi qualunque utente autenticato leggeva
  i check-in altrui.

### File principali modificati

- `supabase/migrations/20260913100000_tournament_engine_schema.sql` (nuovo)
- `supabase/migrations/20260913110000_tournament_engine_functions.sql` (nuovo)
- `shared/types/tournament-view.ts`, `shared/utils/tournament-standings.ts`
- `server/utils/tournament-detail.ts`, `server/api/admin/users/[id].get.ts`
- `server/api/admin/tournaments/[id]/entries/[entryId]/members.post.ts` (nuovo)
- `app/composables/useTournamentForm.ts` (nuovo), `useTournaments.ts`,
  `useTournamentView.ts`
- `app/components/admin/TournamentRulesFields.vue` (nuovo)
- `app/components/tournament/MatchCard.vue` (nuovo), `Matches.vue`,
  `Bracket.vue`, `Standings.vue`, `Summary.vue`
- `app/pages/admin/tornei/index.vue`, `app/pages/admin/tornei/[id].vue`,
  `app/pages/admin/eventi/[id]/tornei/nuovo.vue`
- `app/pages/app/tornei/[id]/index.vue`, `app/pages/app/tornei/[id]/prenota.vue`
- `supabase/seed.sql`, `supabase/dev/demo_showcase.sql`
- `supabase/tests/tournament_engine.test.sql` (nuovo) e i test pgTAP toccati
  dalla transizione

### Difetti trovati durante la verifica e corretti

- La prima versione della rotazione delle manche usava una matrice con
  sfalsamento: con quattro gruppi ripeteva otto coppie su settantadue. La
  scelta greedy per "chi si e incontrato meno" ne ripete zero.
- I trigger di normalizzazione e dello slug leggono `games` e `platforms`, che
  non hanno grant per il browser: senza `security definer` la creazione di un
  torneo dalla console falliva con "permission denied for table platforms".
- `position` non si puo usare come nome di colonna in un `returns table`:
  la classifica espone `standing_position`.

### Verifiche

- `pnpm lint`, `prettier --check`, `pnpm typecheck` -> PASS
- `pnpm test` -> PASS, 14 test (4 nuovi sulla classifica e sul riepilogo)
- `pnpm db:test` -> PASS, 238 test pgTAP (26 nuovi sul motore)
- `pnpm build` -> PASS
- Verifica funzionale in locale: torneo a manche con sedici iscritti
  (generazione, registrazione di un ordine di arrivo dalla console, punti e
  classifica), scheda utente dello stesso torneo, creazione di un torneo a
  coppie dalla maschera con preset, creazione di una squadra e codice di
  invito nell'app.

### Stato finale della sessione

Motore elastico in funzione e verificato a schermo. I dati dimostrativi locali
usano il nuovo formato a manche per Mario Kart.

## 2026-09-14 - Uscita dalla console, schede prenotati/partecipanti, tessera ARCI

### Lavoro svolto

Tre richieste del proprietario, in una sessione sola.

**Uscire dalla console.** Non esisteva nessun logout per chi amministra: il
comando viveva solo in `/app/impostazioni` e la console non porta all'area
personale (DEC-031). Le voci di secondo piano sono state estratte in
`useAdminMenu`, usato sia dalla pagina `/admin/altro` sia dalla colonna di
sinistra. Su schermo largo la voce "Altro" sparisce dalla barra e le sue voci
si leggono in colonna, con account e comando `Esci` nel piede; su telefono la
pagina Altro resta e guadagna la sezione Sessione (DEC-040).

**Prenotati e partecipanti sono due domande diverse.** Il riepilogo evento
aveva una sola scheda che cambiava significato con lo stato dell'evento.
Adesso `Prenotati` c'e sempre e `Partecipanti` compare a evento in corso o
concluso, cosi si legge insieme quanti avevano prenotato e chi e entrato
davvero. Il riepilogo distingue una giornata conclusa (`mode: 'past'`) da una
ancora da avviare.

**Tessera ARCI.** Nuovo dominio: stato del socio sul profilo, requisito sulla
giornata, validita derivata dalla stagione associativa invece che da un lavoro
schedulato (DEC-041). Lo staff spunta la tessera dalla scheda utente o dal
check-in, l'admin sposta la data di rinnovo o chiude la stagione da
`/admin/impostazioni`. Vetrina, conferma prenotazione, biglietto, impostazioni
utente e scheda torneo dicono quando la tessera serve.

### File principali modificati

- `supabase/migrations/20260914100000_arci_membership.sql` (nuovo)
- `supabase/tests/arci_membership.test.sql` (nuovo, 20 test)
- `app/composables/useAdminMenu.ts`, `app/composables/useArci.ts` (nuovi)
- `app/components/ui/VrsusTabBar.vue`, `VrsusSessionCard.vue` (nuovo),
  `VrsusArciChip.vue` (nuovo)
- `app/layouts/admin.vue`, `app/layouts/app.vue`, `app/pages/admin/altro.vue`
- `app/components/admin/EventOverview.vue`, `app/components/admin/EventInfoForm.vue`
- `app/components/profile/Header.vue`, `app/components/tournament/Summary.vue`
- `app/pages/admin/utenti/[id].vue`, `app/pages/admin/checkin.vue`,
  `app/pages/admin/impostazioni/index.vue`
- `app/pages/eventi/[slug].vue`, `app/components/public/EventCard.vue`
- `app/pages/app/index.vue`, `app/pages/app/impostazioni.vue`,
  `app/pages/app/prenota/[eventId].vue`, `app/pages/app/prenotazioni/[id].vue`,
  `app/pages/app/tornei/[id]/prenota.vue`
- `app/composables/useEventForm.ts`, `useTournamentView.ts`
- `server/utils/event-overview.ts`, `server/utils/event-admin.ts`,
  `server/utils/tournament-detail.ts`,
  `server/api/admin/events/[id]/overview.get.ts`,
  `server/api/admin/users/[id].get.ts`
- `shared/types/event-overview.ts`, `profile-view.ts`, `tournament-view.ts`

### Difetti trovati durante la verifica e corretti

- `reset_arci_cards` usava `now()`: nella stessa transazione l'azzeramento
  coincideva con la verifica e lasciava valide le tessere appena registrate.
  Con `clock_timestamp()` l'azzeramento supera sempre quanto gia scritto.
- Il messaggio vuoto della scheda Partecipanti diceva "non ha ancora passato il
  QR code" anche su una giornata conclusa, dove non c'e nessun "ancora".

### Verifiche

- `pnpm lint`, `prettier --check`, `pnpm typecheck` -> PASS
- `pnpm test` -> PASS, 14 test
- `pnpm db:test` -> PASS, 258 test pgTAP (20 nuovi sulla tessera)
- `pnpm build` -> PASS
- Verifica funzionale nel browser (account super-admin, ambiente locale):
  colonna con voci e `Esci` a 1280px, pagina Altro con Sessione a 375px,
  schede Prenotati/Partecipanti su evento live e su evento concluso, colonna
  ARCI e avviso sui prenotati senza tessera, registrazione e revoca della
  tessera dalla scheda utente, sezione Tessere ARCI in impostazioni, casella
  del wizard salvata sul database, chip e avviso in vetrina e in conferma
  prenotazione.

### Stato finale della sessione

Migration applicata in locale con `supabase migration up`, tipi rigenerati.
Resta da provare a schermo il pannello ARCI del check-in, che richiede un QR
reale: la RPC e coperta dai test pgTAP.

## 2026-09-14 - App utente: bacheca, eventi, serata e ranking come sfide

### Lavoro svolto

Riorganizzazione dell'area personale chiesta dal proprietario mentre provava
l'app da cliente.

**La home diventa la bacheca.** `/app` porta annunci e sondaggi, con in cima
l'invito compatto alla prossima data pubblica: nome, giorno e ora, prezzo,
tessera ARCI e un comando che apre la scheda dell'evento. Senza date
programmate resta la sola bacheca. La voce Bacheca separata e sparita dalla
barra, che adesso e Bacheca, Eventi, Ranking, Tornei, Impostazioni (DEC-042).

**Eventi.** Nuovo elenco in sola lettura diviso in in corso, in programma e
storico, e nuova scheda della giornata: informazioni, tornei, postazioni e
prenotazione con finestra di conferma. La vecchia pagina `/app/prenota/[id]`
e stata ritirata: si prenota dove si leggono le informazioni.

**Live.** Compare come prima voce, con il pallino rosso, solo mentre una serata
e in corso. Mostra il biglietto con il QR finche non si passa la porta; dopo il
check-in il biglietto lascia il posto a "I tuoi tornei", con la prossima
partita, l'avversario e quante partite mancano. Sotto, le sole schede Tornei e
Piattaforme: di chi ha prenotato e chi e presente non si dice niente.

**Ranking come entita.** Nuova tabella `game_rankings`: una sfida lunga su un
gioco, con regolamento in chiaro, punteggio o tempo, direzione e scadenza
facoltativa (DEC-043). I punteggi appartengono alla sfida. Le sfide si creano
dalla pagina del gioco in console e ognuna ha la sua scheda, con classifica,
registrazione dei record e impostazioni. In app la pagina Ranking si legge
postazione -> gioco -> sfida -> classifica, senza "tutte" e senza "tutti", e
parte dai Punti VRSUS.

### File principali modificati

- `supabase/migrations/20260914120000_game_rankings.sql` (nuovo)
- `supabase/tests/game_rankings.test.sql` (nuovo, 13 test)
- `supabase/dev/demo_rankings.sql` (nuovo)
- `app/layouts/app.vue`, `app/composables/useLiveEvent.ts` (nuovo)
- `app/pages/app/index.vue` (bacheca + invito), `app/pages/app/bacheca.vue`
  e `app/pages/app/prenota/[eventId].vue` (ritirate)
- `app/pages/app/eventi/index.vue`, `app/pages/app/eventi/[id].vue` (nuove)
- `app/pages/app/live.vue` (nuova), `shared/utils/live-day.ts` (nuovo),
  `tests/unit/live-day.test.ts` (nuovo)
- `app/pages/app/ranking.vue`, `shared/utils/ranking.ts` (nuovo)
- `app/components/ui/VrsusConfirmDialog.vue` (nuovo)
- `app/pages/admin/giochi/[id]/index.vue` (sezione Ranking),
  `app/pages/admin/giochi/[id]/rank/[rankId].vue` (nuova)
- `server/api/admin/rankings/[id].get.ts`,
  `server/api/admin/rankings/[id]/scores.post.ts`,
  `server/api/admin/rankings/[id]/scores/[scoreId].delete.ts` (nuovi)
- `server/api/admin/ranking-users.get.ts` (aperta anche allo staff)
- `app/pages/index.vue` (la locandina porta alla scheda in area personale)

### Difetti trovati durante la verifica e corretti

- Nella scheda "I tuoi tornei" i nomi degli avversari di una manche da quattro
  uscivano dal bordo su telefono: la riga adesso va a capo.
- La registrazione di un punteggio dalla console falliva: `game_scores` non ha
  grant per il browser (DEC-005). Spostata su endpoint service-role, che
  rifiuta anche le sfide chiuse o scadute.
- Due test pgTAP contavano righe di tutto il database invece che le proprie:
  con i dati dimostrativi caricati fallivano (DEC-030).

### Verifiche

- `pnpm lint`, `prettier --check`, `pnpm typecheck` -> PASS
- `pnpm test` -> PASS, 19 test (5 nuovi su "quando tocca a me")
- `pnpm db:test` -> PASS, 271 test pgTAP (13 nuovi sulle sfide)
- `pnpm build` -> PASS
- Verifica funzionale nel browser con un account cliente creato per la prova:
  bacheca con invito, elenco eventi, scheda evento, prenotazione con conferma,
  Live con biglietto, Live dopo il check-in con "Manca una partita alla tua",
  pagina Ranking con le tre tende, scheda sfida in console con registrazione ed
  eliminazione di un record.

### Stato finale della sessione

Migration applicata in locale, tipi rigenerati, dati dimostrativi delle sfide
caricati con `supabase/dev/demo_rankings.sql`. L'account di prova e i suoi dati
sono stati rimossi al termine della verifica.


## 2026-09-15 — Preparazione del deploy beta

### Lavoro svolto

- Aggiunto lo script `build:cloudflare` (`nuxt build --preset=cloudflare_pages`)
  per non far ridigitare il preset nel dashboard del provider.
- Rimosso `package-lock.json` dal versionamento e aggiunto a `.gitignore`
  insieme a `yarn.lock`: con due lockfile i provider di deploy potevano
  installare con npm invece che con pnpm.
- Scritta la procedura completa di deploy su Cloudflare Pages in
  `docs/dev/guideline_implementations.md`, con variabili, flag `nodejs_compat`,
  URL di redirect Supabase, verifiche e limiti del piano free.
- Registrata DEC-044: la configurazione di deploy vive nel dashboard del
  provider, il repository non contiene `wrangler.toml`.
- Allineati `CURRENT_STATE.md` e `NEXT_STEPS.md`.

### File principali modificati

- `package.json`
- `.gitignore`
- `docs/dev/guideline_implementations.md`
- `docs/ai/DECISIONS.md`
- `docs/ai/CURRENT_STATE.md`
- `docs/ai/NEXT_STEPS.md`
- `docs/ai/TEST_REPORT.md`

### Verifiche

- `corepack pnpm run build:cloudflare` → PASS
- `corepack pnpm run format:check` → PASS

### Problemi emersi

- Il deploy effettivo e USER ACTION REQUIRED: servono account Cloudflare e
  credenziali del progetto Supabase remoto, che l'agente non deve usare.

## 2026-09-15 (seconda) — PWA riparata, passaggio di area, slug automatici

### Lavoro svolto

- **PWA.** Il service worker generato registrava una `NavigationRoute` legata a
  un URL non presente nel precache: Workbox sollevava un errore e la
  registrazione falliva, quindi online l'app non era installabile e non aveva
  gestione offline. La navigazione ora e `NetworkOnly` con ripiego sulla pagina
  `/offline`, che viene prerenderizzata per finire nel precache. Sistemata
  anche una regola di `runtimeCaching` ancorata a `^/`, che non aveva mai
  corrisposto a niente (DEC-046).
- **Icone.** Generate da `public/favicon.svg` le icone PNG 192, 512 e maskable
  512 in `public/icons/`, dichiarate nel manifest: senza icone raster Chrome
  non considera installabile il sito e `beforeinstallprompt` non arriva mai.
- **Invito a installare.** Nuovo `usePwaInstall` e `UiVrsusInstallPrompt`,
  montato nella shell dell'app: compare al primo accesso da un dispositivo, usa
  il bottone `Installa` quando il browser lo permette e altrimenti spiega il
  gesto (iPhone compreso). La scelta resta in `localStorage`.
- **Passaggio fra aree.** Nuovo `UiVrsusWorkspaceSwitch` dentro
  `UiVrsusSessionCard`, quindi sempre accanto all'uscita: colonna di sinistra
  su schermo largo, pagina Altro della console, sezione Sessione delle
  impostazioni su telefono. Rimossi il collegamento `Console`
  nell'intestazione dell'app e i due collegamenti nelle impostazioni (DEC-045).
- **Slug.** Tolti tutti i campi slug compilabili (postazioni, giochi, bacheca,
  servizi, eventi). Lo slug nasce dal nome e la collisione si risolve con un
  progressivo tramite `uniqueSlug` in `shared/utils/slug.ts`; in modifica lo
  slug salvato non cambia (DEC-047).
- **Shell dell'app.** `await loadRoles()` nel layout metteva l'intera shell
  dietro a Suspense: dopo il login la pagina poteva restare in caricamento
  finche la chiamata non tornava. Ora i ruoli si caricano da `onMounted` senza
  bloccare il rendering.

### File principali modificati

- `nuxt.config.ts`, `public/icons/*`
- `app/composables/usePwaInstall.ts`, `app/components/ui/VrsusInstallPrompt.vue`
- `app/components/ui/VrsusWorkspaceSwitch.vue`, `app/components/ui/VrsusSessionCard.vue`
- `app/layouts/app.vue`, `app/layouts/admin.vue`, `app/pages/app/impostazioni.vue`
- `shared/utils/slug.ts`, `tests/unit/slug.test.ts`
- maschere admin: postazioni, giochi, bacheca, servizi, `EventInfoForm.vue`, `useEventForm.ts`
- endpoint: `platforms/index.post.ts`, `board/index.post.ts`, `events/index.post.ts`

### Verifiche

- Unit 23/23, lint, format, typecheck, build Node e build Cloudflare → PASS.
- Prove a schermo in locale: login, invito installazione, toggle in entrambe le
  aree, maschera postazione senza slug, doppio nome con slug progressivo.

### Problemi emersi

- Il browser integrato usato per le prove non consente la registrazione di un
  service worker: la verifica a runtime della PWA resta da fare su un browser
  reale.
- Il blocco dopo il login non e riproducibile in locale; la causa probabile e
  stata rimossa ma va confermata sul sito pubblicato.

## 2026-09-15 (terza) — Registrazione via email

### Lavoro svolto

- Diagnosi: il progetto remoto ha `mailer_autoconfirm: false`, quello locale lo
  aveva a `true`. Il percorso della conferma non era mai stato eseguito e aveva
  tre difetti insieme: nessun `emailRedirectTo` nella chiamata `signUp` (quindi
  Supabase usava il `Site URL` del progetto, rimasto all'ambiente di sviluppo),
  nessuna pagina `/confirm` benche fosse dichiarata come `callback` in
  `nuxt.config.ts`, e una navigazione verso `/app` subito dopo la
  registrazione, che senza sessione faceva rimbalzare su `/login` in silenzio.
- `signUp` ora chiede il ritorno su `${APP_BASE_URL}/confirm`.
- Nuova pagina `/confirm`: aspetta lo scambio del codice, entra in bacheca, e
  distingue il link scaduto da quello gia usato.
- La pagina di registrazione mostra "Controlla la posta" quando la sessione non
  arriva, e avvisa il minorenne che il consenso si completa dopo il primo
  accesso (DEC-048).
- `supabase/config.toml`: `enable_confirmations = true` e Redirect URLs con il
  carattere jolly, per esercitare il percorso anche in locale.

### Ambiente locale

Il riavvio dello stack ha fatto emergere che il volume del database era su
PostgreSQL 15 mentre la CLI 2.117 avvia solo la 17 e ignora `major_version`.
Backup completo del vecchio database in `supabase/.temp/` (rimontando il volume
con l'immagine 15.8), poi stack ricreato, migration, seed e ricreazione degli
account di servizio con ruoli.

### File principali modificati

- `app/pages/registrati.vue`, `app/pages/confirm.vue`
- `supabase/config.toml`
- `docs/dev/guideline_implementations.md`

### Verifiche

- Flusso completo provato in locale con la casella Mailpit: registrazione,
  mail, link verso `/confirm`, sessione attiva in bacheca.
- Lint, format, typecheck, unit 23/23, build Cloudflare → PASS.

### Problemi emersi

- Il flusso remoto resta bloccato finche `Site URL` e `Redirect URLs` del
  progetto Supabase non vengono corretti: e USER ACTION REQUIRED.

## 2026-10-02 — Prenotazione evento prima del torneo

### Lavoro svolto

- Eliminata la prenotazione evento implicita dalle tre RPC di iscrizione al
  torneo. Ogni torneo collegato a un evento richiede una prenotazione
  `confirmed`; la lista d'attesa non basta (DEC-049).
- Aggiunti trigger che coprono anche l'inserimento manuale dei membri e
  impediscono di togliere una prenotazione confermata mentre l'iscrizione al
  torneo ospitato e attiva.
- Scheda e conferma torneo spiegano il prerequisito e portano all'evento;
  la scheda evento conserva il torneo di provenienza e, a prenotazione
  confermata, riporta alla sua iscrizione.
- Aggiornati i test pgTAP esistenti e aggiunta la regressione per iscrizioni
  singole, squadre, lista d'attesa, cancellazione e torneo autonomo.

### File principali modificati

- `supabase/migrations/20261002100000_tournament_event_booking_required.sql`
- `supabase/migrations/20261002101000_preserve_booking_for_active_tournament.sql`
- `supabase/tests/tournament_event_booking_required.test.sql`
- `app/pages/app/tornei/[id]/index.vue`, `prenota.vue`
- `app/pages/app/eventi/[id].vue`, `app/pages/app/prenotazioni/[id].vue`
- Documenti AI e guideline di test.

### Verifiche

- Migration locali applicate, pgTAP 284/284, unit 23/23, lint dei componenti
  modificati, typecheck e build `node-server` → PASS.
- Percorso UI in browser → da provare. Nessun deploy remoto eseguito.

### Problemi emersi

- Le iscrizioni preesistenti prive di prenotazione evento non sono mutate in
  automatico per non occupare capienza senza consenso del cliente. La scheda
  torneo le segnala e offre il passaggio all'evento.

### Stato finale della sessione

Correzione implementata e verificata localmente a livello database/build;
restano prova UI e pubblicazione della beta.

## 2026-10-02 — Filtri, biglietto e annullamento evento con tornei

### Lavoro svolto

- La lista tornei usa tab In corso/Prossimi/Storico, un pannello filtri dal
  basso e chip rimovibili; le iscrizioni ritirate non risultano piu attive.
- Il biglietto mette QR, stato, prezzo e pagamento sul posto nella prima
  schermata. Il QR si ingrandisce a schermo intero con codice prenotazione.
- La conferma di annullamento mostra i tornei collegati. La RPC ritira le
  iscrizioni e annulla la prenotazione in un'unica transazione (DEC-050).
- Aggiunte RPC di lettura del biglietto e dei tornei limitate al proprietario.

### File principali modificati

- `app/pages/app/tornei/index.vue`, `app/pages/app/tornei/[id]/index.vue`
- `app/pages/app/prenotazioni/[id].vue`, `app/components/ui/VrsusBottomSheet.vue`
- `app/composables/useBookings.ts`, `app/types/database.types.ts`
- `supabase/migrations/20261002102000_cancel_booking_with_tournaments.sql`
- `supabase/tests/tournament_event_booking_required.test.sql`

### Verifiche

- Migration locale applicata; pgTAP 294/294, unit 23/23, lint sui file
  modificati, typecheck e build `node-server` → PASS.
- Prova visuale mobile e percorso cliente completo → ancora da eseguire.

### Problemi emersi

- La beta richiede la verifica/applicazione delle migration prima dell'uso
  della nuova UI; nessuna pubblicazione eseguita in questa sessione.

### Stato finale della sessione

Intervento implementato e verificato localmente con test automatici;
checklist manuale e stato remoto documentati in `NEXT_STEPS.md`.

## 2026-10-02 — Riduzione dei riferimenti ARCI lato cliente

### Lavoro svolto

- Rimossi gli avvisi e gli stati ARCI da home, impostazioni, profilo,
  biglietto, conferme e tornei dell'area cliente.
- Il chip delle card evento e stato abbreviato a `Arci` e conserva l'icona
  tessera; il dettaglio evento mantiene il requisito solo nella sua griglia
  informativa.
- La console conserva i controlli ARCI per operatore, check-in e gestione.

### File principali modificati

- `app/components/ui/VrsusArciChip.vue`
- `app/pages/app/eventi/[id].vue`, `app/pages/app/index.vue`
- `app/pages/app/impostazioni.vue`, `app/pages/app/prenotazioni/[id].vue`
- `app/pages/app/tornei/[id]/prenota.vue`

### Verifiche

- Ricerca statica dei riferimenti cliente, lint, typecheck e build
  `node-server` → PASS.

### Stato finale della sessione

Riduzione UI applicata e verificata; resta la prova visuale mobile.

## 2026-10-02 — Semplificazione della lista eventi admin

### Lavoro svolto

- Card di `/admin/eventi` ridotte alle informazioni utili per scegliere
  l'evento e rese interamente cliccabili.
- Spostati Modifica, Duplica ed Elimina nella scheda evento, prima delle tab.
- Conservata la duplicazione in bozza e aggiunta conferma modale alla
  cancellazione nella nuova posizione.

### File principali modificati

- `app/pages/admin/eventi/index.vue`
- `app/pages/admin/eventi/[id]/index.vue`
- `docs/dev/guideline_test_features.md`

### Verifiche

- ESLint, typecheck e build `node-server` → PASS.

### Stato finale della sessione

Intervento implementato e verificato tecnicamente; resta la prova manuale
autenticata della console.

## 2026-10-02 — Shell mobile e float menu

### Lavoro svolto

- Separati toolbar fissa, contenuto scrollabile, menu azioni contestuali e
  navbar nei layout cliente e admin.
- La toolbar mostra logo, titolo della rotta e accesso alle notifiche gia
  presenti. Il menu compare solo per le pagine che registrano azioni.
- Spostate nel menu le azioni principali di evento, torneo, iscrizione,
  biglietto, plancia admin ed elenco/scheda evento admin.
- Navbar console filtrata per admin, staff e responsabile tornei.

### File principali modificati

- `app/layouts/app.vue`, `app/layouts/admin.vue`, `app/assets/css/main.css`
- `app/components/ui/VrsusAppToolbar.vue`, `VrsusFloatMenu.vue`
- `app/composables/usePageActions.ts`, `useShellPageTitle.ts`
- Pagine evento, torneo, biglietto e plancia admin.

### Verifiche

- ESLint, typecheck e build `node-server` → PASS.
- Prova mobile con account reale → ancora da eseguire.

### Stato finale della sessione

Shell e prime azioni contestuali implementate; verifica visuale registrata
in `NEXT_STEPS.md`.

## 2026-10-02 — Completamento float menu admin

### Lavoro svolto

- Spostate nel float menu le azioni globali delle viste admin con moduli e
  operazioni di pagina, inclusi wizard evento e scheda torneo.
- Nel wizard evento la disponibilita dei pulsanti segue la tab; il salvataggio
  si abilita solo se i dati superano la validazione del payload.
- I comandi relativi a righe, squadre e partite restano nel contenuto.

### File principali modificati

- `app/pages/admin/` (wizard, tornei, postazioni, giochi, bacheca, servizi,
  ranking, live, check-in, impostazioni, scheda utente)
- `app/components/admin/EventInfoForm.vue`, `EventPlatformPicker.vue`
- `app/components/ui/VrsusFloatMenu.vue`

### Verifiche

- Typecheck ed ESLint delle pagine admin → PASS.
- Build `node-server` → PASS alla ripetizione con permessi di lettura;
  prima esecuzione bloccata dal sandbox su `EPERM readlink C:\Users\User`.
- Prova visuale su mobile → pendente.

### Stato finale della sessione

Modifiche implementate; prova autenticata del flusso admin da eseguire.
