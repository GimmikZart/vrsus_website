# Test Report

Ultimo aggiornamento: 2026-08-30

## Stato verifiche

| Verifica | Comando | Esito |
| --- | --- | --- |
| Reset database DEV | `pnpm db:reset` | PASS — migration e seed applicati |
| Tipi database | `pnpm db:types` | PASS — generati da Supabase locale |
| Test database/RLS | `pnpm db:test` | PASS — 169 test pgTAP |
| Lint | `pnpm lint` | PASS — nessun errore o warning |
| Formattazione | `pnpm format:check` | PASS |
| Typecheck | `pnpm typecheck` | PASS |
| Unit tests | `pnpm test` | PASS — 1 test |
| E2E | `pnpm test:e2e` | PASS — 7 test Chromium |
| Build standard | `pnpm build` | PASS — `node-server` |
| Build Cloudflare | `pnpm exec nuxt build --preset=cloudflare_pages` | PASS — worker Pages generato |
| Smoke SSR pubblico | bundle `node .output/server/index.mjs` + richieste HTTP | PASS — route pubbliche, CMS, robots e sitemap |
| Smoke lead servizi | bundle preview + POST invalido | PASS — form SSR presente e payload invalido restituisce 400 |
| Protezione route CMS admin | bundle preview + richieste anonime | PASS — `/admin/news`, `/admin/servizi` e `/admin/richieste` restituiscono redirect al login |
| Build console eventi | `pnpm build` | PASS — route `/admin/eventi` compilata nel bundle server |
| Build console catalogo | `pnpm build` | PASS — route `/admin/catalogo` compilata nel bundle server |
| Build configurazione evento | `pnpm build` | PASS — route dinamica `/admin/eventi/[id]` compilata nel bundle server |
| Typecheck configurazione evento | `vue-tsc --noEmit -p .nuxt/tsconfig.json` | PASS — nessun errore TypeScript; warning Volar non bloccante |
| Build override evento | `pnpm build` | PASS — override attività/postazioni compilati nel bundle server |
| Storage asset locale | `pnpm db:reset` | PASS — bucket `vrsus-assets` e policy storage applicati |
| Typecheck uploader asset | `vue-tsc --noEmit -p .nuxt/tsconfig.json` | PASS — nessun errore TypeScript; warning Volar non bloccante |
| Build uploader asset | `pnpm build` | PASS — componente e integrazioni CMS compilati nel bundle |
| Verifica manuale landing | Procedura in guideline | DA ESEGUIRE |
| Verifica manuale database | Procedura in guideline | DA ESEGUIRE |

| Database V1/V2 | `corepack pnpm db:test` | PASS — 169 test pgTAP, inclusi booking, waiting list, QR, check-in, bracket, push, ranking, capienza, workflow eventi e guardie di stato |
| Build V1/V2/PWA | `corepack pnpm build` | PASS — route booking, live, tornei, ranking e fallback offline compilate |
| Build Cloudflare | `corepack pnpm exec nuxt build --preset=cloudflare_pages` | PASS — worker Pages generato; warning Node compatibility non bloccante |

### Verifica conclusiva precedente 2026-08-30

- `corepack pnpm db:test` -> PASS, 87 test pgTAP.
- `corepack pnpm lint` -> PASS, 10 warning HTML non bloccanti.
- `corepack pnpm format:check` -> PASS.
- `corepack pnpm typecheck` -> PASS, warning Volar/vue-router non bloccante.
- `corepack pnpm test` -> PASS, 1 test unitario.
- `corepack pnpm exec playwright test --workers=1` -> PASS, 6/6 test
  Chromium.
- `corepack pnpm build` -> PASS, preset `node-server`, con route V1/V2 e PWA.

### Verifica estensione V2 2026-08-30

- `corepack pnpm db:reset` -> PASS, migration push/operations applicate.
- `corepack pnpm db:test` -> PASS, 122 test pgTAP: booking, torneo V2,
  operazioni match, notifiche/preferenze push, ranking e torneo demo a 8
  partecipanti.
- `corepack pnpm format:check` -> PASS dopo le modifiche V2.
- `corepack pnpm typecheck` -> PASS dopo le modifiche V2; warning Volar noto.
- `corepack pnpm lint` -> PASS dopo le modifiche V2; 9 warning HTML noti.

### Verifica finale 2026-08-30

- `corepack pnpm db:reset` -> PASS.
- `corepack pnpm db:test` -> PASS, 133/133 test pgTAP.
- `corepack pnpm lint` -> PASS, nessun errore o warning.
- `corepack pnpm format:check` -> PASS.
- `corepack pnpm typecheck` -> PASS, warning Volar/vue-router non bloccante.
- `corepack pnpm test` -> PASS, 1 test unitario.
- `corepack pnpm exec playwright test --workers=1` -> PASS, 7/7 test
  Chromium seriali.
- `corepack pnpm build` -> PASS, preset `node-server`.
- `corepack pnpm exec nuxt build --preset=cloudflare_pages` -> PASS, worker
  Pages generato; warning Node compatibility non bloccante.
- La regression E2E include i redirect anonimi per `/app/eventi`, `/app/tornei`,
  `/app/tornei/[id]`, `/app/profilo` e `/admin/impostazioni`.
- La regression CMS include il dettaglio `/esperienze/demo-tekken-8`.
- `public_capacity.test.sql` verifica privacy e comportamento delle modalità
  `hidden`, `status` ed `exact` della proiezione pubblica.
- `event_admin_workflows.test.sql` verifica duplicazione, copia delle
  associazioni, archiviazione, audit e autorizzazioni.
- `booking_workflows.test.sql` verifica il no-show su evento terminato e il
  relativo audit.
- `state_machine_guards.test.sql` verifica transizioni valide/non valide per
  eventi, tornei e match; i test torneo a 4/8 entry verificano anche i bye.

## Feature verificate

- Landing pubblica VRSUS: rendering SSR, titolo, CTA e navigazione verificati
  con Playwright.
- Catalogo pubblico: `/eventi` e `/eventi/vrsus-demo` leggono il fixture locale
  dalle view Supabase; il dettaglio include JSON-LD `Event`.
- SEO tecnico: canonical sul dettaglio, `robots.txt` environment-aware e sitemap
  con slug degli eventi, news e servizi pubblici.
- Contenuti pubblici CMS: esperienze, news, dettaglio news, servizi e dettaglio
  servizio leggono fixture pubblicate dalle view Supabase; i dettagli hanno
  canonical e le news includono metadata editoriali. Le esperienze hanno anche
  un dettaglio dedicato con fallback visuale controllato.
- Capienza pubblica: la vista espone soltanto lo stato derivato o i numeri
  consentiti da `capacity_visibility`; la soglia quasi-completo è configurabile
  con fallback all'80%.
- Console CMS: `/admin/news` e `/admin/servizi` espongono form strutturati per
  admin/super-admin; scritture, stato di pubblicazione e attivazione usano le
  tabelle raw protette da RLS.
- Lead servizi: il form pubblico invia a un endpoint server validato; il pannello
  `/admin/richieste` permette aggiornamento di stato e note interne.
- Console eventi: `/admin/eventi` gestisce il ciclo editoriale/operativo di base
  dell’evento e mantiene privata la capienza salvo configurazione esplicita.
- Console catalogo: `/admin/catalogo` gestisce attività e postazioni globali con
  categorie, stato attivo e capienza standard.
- Configurazione evento: `/admin/eventi/[id]` gestisce selezione e associazioni
  many-to-many tra attività e postazioni.
- Override evento: la stessa console gestisce contenuti, capienze, visibilità,
  stato, modalità d'accesso e orari senza alterare il catalogo globale.
- Asset CMS: `AssetUploader` carica immagini nel bucket `vrsus-assets`, mostra
  preview e salva nel form soltanto il path Supabase Storage.
- Booking V1: RPC race-safe per conferma/lista d’attesa, cancellazione FIFO,
  QR hash-only, check-in idempotente e pagamento sul posto.
- Operazioni live: dashboard admin, scanner QR e inbox notifiche utente.
- Tornei V2: registrazione, check-in, bracket single-elimination deterministico,
  avanzamento, risultato finale, assegnazione postazione, chiamata giocatori,
  realtime e ledger ranking idempotente.
- Notifiche: inbox persistente, preferenze push, mapping OneSignal e fallback
  in-app quando il provider non e configurato o fallisce.
- Ranking: vista generale, vista per attività, riepilogo personale e adjustment
  admin auditabile tramite `/admin/ranking`.
- PWA: service worker auto-update e fallback offline per le route non admin.
- Schema V1: tabelle, vincoli, ruoli seed, trigger `updated_at` e mapping
  evento/stazione/attivita.
- Sicurezza della foundation: RLS abilitata, tabelle raw di eventi e booking
  non leggibili dai ruoli browser, view pubblica senza dati di capienza.
- Seed locale: evento VRSUS Demo, quattro stazioni, quattro attivita e mapping
  coerenti, più fixture pubblicate per news e servizi.
- Auth smoke: login email/password, bootstrap profilo, lookup ruolo e accesso UI
  a `/app` e `/admin` con utente temporaneo.
- Role management smoke: RPC super-admin accetta assegnazione ruolo e rifiuta la
  stessa operazione da utente normale.
- RLS multiutente: user A e user B vedono esclusivamente i propri profili e
  notifiche.

## Note

- `corepack pnpm exec playwright test --workers=1` -> PASS, 7 test Chromium;
  il run parallelo può andare in timeout durante il cold start Nuxt su Windows.

- Il test E2E avvia Nuxt con il Node 22 indicato in `.nvmrc`; su Windows usa
  `NVM_HOME` quando disponibile.
- Il cold start del dev server puo superare due minuti; il timeout Playwright e
  impostato a quattro minuti. Nuxt puo segnalare warning non bloccanti relativi
  al path Volar di `vue-router`; il typecheck termina correttamente.
- `supabase test db --local` segnala un aggiornamento CLI disponibile. La
  versione installata ha eseguito con successo reset e test.

## Test pendenti / bloccati

- Test manuale responsive/accessibilita della landing.
- Test manuale catalogo/dettaglio evento, responsive e stati vuoto/errore.
- Test manuale autenticazione/RBAC.
- Verifica manuale della gestione utenti in `/admin/utenti`.
- Verifica manuale autenticata della gestione news e servizi in `/admin/news` e
  `/admin/servizi`.
- Verifica manuale autenticata delle richieste in `/admin/richieste` e invio del
  form da un dettaglio servizio.
- Verifica manuale autenticata della creazione/modifica evento in `/admin/eventi`.
- Verifica manuale autenticata della gestione catalogo in `/admin/catalogo`.
- Verifica manuale autenticata delle associazioni evento in `/admin/eventi/[id]`.
- Verifica manuale autenticata degli override attività/postazioni in
  `/admin/eventi/[id]`.
- Verifica manuale autenticata dell'upload immagini in `/admin/news`,
  `/admin/servizi`, `/admin/eventi` e `/admin/catalogo`.
- Reset password, SMTP custom e Google OAuth in ambiente QUALITY.
- Test manuale autenticato booking/lista d’attesa/QR/check-in/live.
- Test manuale autenticato torneo, bracket, risultati e ranking.
- Test installazione PWA, fallback offline e fotocamera su dispositivo.
- Deploy/configurazione QUALITY di Supabase, Cloudflare e OneSignal; vedere
  `docs/dev/guideline_implementations.md`.
- Verifica manuale autenticata delle azioni admin di duplicazione/archiviazione
  eventi e no-show; vedere `docs/dev/guideline_test_features.md`.
