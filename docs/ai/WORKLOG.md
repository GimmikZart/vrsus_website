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
