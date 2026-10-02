# Test Report

Ultimo aggiornamento: 2026-10-02

## Verifica 2026-10-02 — notifiche Realtime e predisposizione push

- Migration `20261002103000` e `20261002104000` applicate al database DEV
  locale con `supabase migration up --local`: PASS.
- `supabase test db --local`: PASS, 301/301 pgTAP su 14 file, compresi
  publication Realtime, isolamento inbox per utente, aggiornamento consentito
  solo su `read_at` e divieto di riassociare un device push attivo.
- ESLint sui file applicativi modificati: PASS. `nuxt typecheck`: PASS con il
  warning noto Volar/vue-router. Vitest: PASS, 23/23. Build `node-server`:
  PASS alla ripetizione con accesso al symlink `C:\Users\User`; prima
  esecuzione bloccata dal sandbox (`EPERM readlink`).
- Push reale, webhook esterno e aggiornamento UI su due browser: **NON
  ESEGUITI**, credenziali OneSignal e configurazione QUALITY assenti.
- Integrazione Realtime locale con due account usa e getta: INSERT e UPDATE
  arrivati in tempo reale solo all'account destinatario, lettura cross-user
  negata; `node tests/integration/notification-realtime.mjs` → PASS.
- Build `cloudflare_pages` → PASS; il bundle include
  `/onesignal/OneSignalSDKWorker.js` e la route webhook.

## Verifica 2026-10-02 — shell e azioni contestuali

- Toolbar, contenuto scrollabile, float menu e navbar implementati nei due
  layout autenticati; navbar della console filtrata per ruolo.
- ESLint sui file modificati: PASS.
- `nuxt typecheck`: PASS, con il warning noto Volar/vue-router.
- `nuxt build`: PASS, preset `node-server`.
- Prova visuale mobile e desktop, compresa verifica delle aree fisse e dei
  flussi di prenotazione/admin: **DA ESEGUIRE**.

## Verifica 2026-10-02 — card e azioni della console eventi

- Lista `/admin/eventi`: card semplificate a titolo, data e ora, sede, costo e
  stato Pubblico/Bozza; verifica statica dei comandi rimossi dalla lista.
- Scheda `/admin/eventi/[id]`: Modifica, Duplica ed Elimina sono nel blocco
  sopra le tab; l'eliminazione usa la conferma esplicita esistente.
- ESLint e formattazione dei file modificati: PASS.
- `nuxt typecheck`: PASS, con il warning noto Volar/vue-router.
- `nuxt build`: PASS, preset `node-server`.
- Prova manuale con account admin: **DA ESEGUIRE** con la checklist aggiornata
  in `docs/dev/guideline_test_features.md`.

## Verifica 2026-10-02 — presenza compatta del requisito ARCI

- Riferimenti cliente ricontrollati: il chip `Arci` con icona tessera resta
  solo nelle card evento; la riga completa resta solo nella griglia
  informativa della pagina evento (DEC-051).
- ESLint e formattazione dei file modificati: PASS.
- `nuxt typecheck`: PASS, con il warning noto Volar/vue-router.
- `nuxt build`: PASS, preset `node-server`.
- Prova visuale mobile: **DA ESEGUIRE** con la checklist aggiornata in
  `docs/dev/guideline_test_features.md`.

## Verifica 2026-10-02 — filtri tornei, biglietto e rinuncia contestuale

- Migration locale `20261002102000`: applicata con `supabase migration up --local`.
- `supabase test db --local`: PASS, 294/294 pgTAP su 13 file. I nuovi casi
  coprono preview dei tornei, rinuncia singola e di squadra, rollback se il
  torneo e gia iniziato e lettura del biglietto limitata al proprietario.
- `vitest run`: PASS, 23/23 unit test.
- ESLint sui sei file applicativi modificati: PASS.
- `nuxt typecheck`: PASS, con il warning noto Volar/vue-router.
- `nuxt build`: PASS, preset `node-server`.
- Prova a schermo su telefono e percorso completo con un account cliente:
  **DA ESEGUIRE** con la checklist in `docs/dev/guideline_test_features.md`.
- Nessun test di pagamento online: fuori scope per scelta del proprietario;
  il biglietto mostra il metodo attualmente supportato.

## Verifica 2026-10-02 — prenotazione evento prima del torneo

- Migration locali `20261002100000` e `20261002101000`: applicate con
  `supabase migration up --local` (PASS; nessun reset del database DEV).
- `supabase test db --local`: PASS, 284/284 pgTAP. Casi nuovi: iscrizione
  singola e a squadre senza posto, lista d'attesa, posto confermato,
  inserimento manuale, annullamento e `no_show` con iscrizione attiva,
  torneo autonomo.
- `vitest run`: PASS, 23/23 unit test.
- `nuxt typecheck`: PASS, con il warning noto Volar/vue-router.
- ESLint sui quattro componenti Vue modificati: PASS.
- `nuxt build`: PASS, preset `node-server`.
- `git diff --check`: PASS; solo avvisi Git sui fine riga.
- Prova manuale del percorso evento → torneo e della lista d'attesa:
  **DA ESEGUIRE** secondo `docs/dev/guideline_test_features.md`.

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

## Sessione 2026-09-10 - Ripristino ambiente locale

- `supabase start` -> FAIL iniziale: `must be owner of table buckets`
  (SQLSTATE 42501) sulla migration `20260829230000_storage_assets.sql`.
- `supabase start` post-correzione -> PASS: 12 migration e `seed.sql` applicati,
  stack locale attivo su API `54331`, DB `54332`, Studio `54333`,
  Inbucket/Mailpit `54334`.
- Smoke SSR con `.env` locale -> PASS: `/`, `/eventi`, `/esperienze`, `/news`,
  `/servizi`, `/tornei`, `/ranking`, `/login`, `/robots.txt` e `/sitemap.xml`
  rispondono 200; la sitemap contiene gli slug delle fixture DEV.
- Login manuale `super_admin` -> PASS: sessione SSR, `/app` mostra ruolo e
  accesso alla console admin.
- `/admin/catalogo` autenticato -> PASS: attivita e postazioni caricate.
- `/admin/live` autenticato -> PASS: endpoint service-role e selettore eventi.
- `/admin/eventi` autenticato -> FAIL: `permission denied for table events`
  (SQLSTATE 42501). Vedere "Problemi aperti" in `CURRENT_STATE.md`.
- Probe REST autenticata su attivita, postazioni, categorie, news, servizi,
  tornei, entry, match, ledger ranking, impostazioni, profili, ruoli, notifiche
  e richieste -> PASS: nessun altro `42501`.

## Sessione 2026-09-10 - Dominio evento admin su endpoint service-role

- `/admin/eventi` autenticato -> PASS: la lista carica dall'endpoint
  `/api/admin/events`; il precedente `permission denied for table events` non
  si ripresenta.
- Creazione, aggiornamento, slug duplicato, intervallo date invalido, stato
  fuori enum ed evento inesistente -> PASS: 200, 200, 409, 400, 400, 404.
- `PUT /api/admin/events/[id]/configuration` -> PASS: override postazione e
  attivita persistiti; associazioni molti-a-molti scritte e rilette; la
  rimozione di una postazione elimina anche le sue associazioni.
- Payload invalidi sulla configurazione (uuid malformato, entry di catalogo
  sconosciuta, `access_mode` fuori enum) -> PASS: 400.
- Autorizzazione -> PASS: anonimo 401 su tutti gli endpoint; utente
  autenticato senza ruolo admin 403 su lista, creazione, modifica, lettura e
  scrittura configurazione e postazioni torneo.
- Round-trip associazioni dalla UI reale -> PASS: le associazioni esistenti
  ora compaiono selezionate, una modifica salvata sopravvive al reload.
- Rotte annidate dopo la rinomina a `index.vue` -> PASS: `/app/eventi`,
  `/app/profilo`, `/app/notifiche`, `/app/tornei`, `/esperienze/[slug]`,
  `/admin/eventi/[id]` e `/admin/tornei/[id]` renderizzano la propria pagina.
- `pnpm lint` -> PASS. `pnpm typecheck` -> PASS (exit 0, resta il warning
  Volar/vue-router). `pnpm test` -> PASS (1). `pnpm exec playwright test
  --workers=1` -> PASS (7 Chromium).
- `pnpm db:test` -> PASS, 169 test pgTAP su database resettato.
- `pnpm build` -> PASS. `nuxt build --preset=cloudflare_pages` -> PASS.

### Nota sullo stato DEV

Durante la sessione interattiva e comparsa una prenotazione `confirmed` sulla
fixture `vrsus-demo` che ha fatto fallire l'asserzione "exact visibility
exposes the confirmed count" di `public_capacity.test.sql`, che presuppone
zero prenotazioni. L'origine non e stata attribuita con certezza; i nuovi
endpoint non scrivono su `bookings`. `pnpm db:reset` ha ripristinato le
fixture e la suite e tornata verde. I test pgTAP che dipendono dallo stato
delle fixture vanno eseguiti dopo un reset.

## Sessione 2026-09-11 - Implementazione V2

### Database (fase A)

- `pnpm db:reset` da zero -> PASS con 18 migration, dominio piattaforme/giochi,
  schemi di punteggio, bacheca, consensi e hardening dei grant.
- `pnpm db:types` -> PASS.
- `pnpm db:test` -> PASS, 211 test pgTAP (erano 169).
- Regressione DEC-005 dopo la rinomina -> PASS: nessun grant diretto per
  `anon`/`authenticated` su `events`, `bookings`, `event_checkins`,
  `platforms`, `event_platforms`, `event_platform_games`,
  `platform_categories`.
- Hardening grant -> PASS: nessuna tabella base concede TRUNCATE, REFERENCES o
  TRIGGER ai ruoli del browser.

### Verifiche funzionali sull'ambiente reale

- Vetrina: `/`, `/postazioni`, `/postazioni/[slug]`, `/chi-siamo`, `/servizi`,
  `/servizi/[slug]`, `/eventi`, `/eventi/[slug]`, `/login`, `/registrati`,
  `/regolamento`, `/sitemap.xml` -> tutte 200 con il titolo corretto.
- Redirect delle rotte ritirate -> PASS: `/esperienze` e `/evento` 301,
  `/news`, `/tornei` e `/ranking` 302.
- Prenotazione evento end-to-end -> PASS: dashboard, pagina di conferma,
  conferma, biglietto con QR generato nella dashboard.
- Iscrizione torneo end-to-end -> PASS: dettaglio, conferma, ritorno con
  etichetta "Iscritto", contatore 1/8 e bordo verde in lista.
- Bordi di stato dei tornei -> PASS, sempre accompagnati dall'etichetta
  testuale.
- Sondaggio bacheca -> PASS: opzioni votabili, percentuali dopo il voto.
- Nickname -> PASS: duplicato rifiutato, valido accettato, storico scritto.
- Consenso genitoriale -> PASS: minorenne bloccato in interfaccia, bloccato
  anche chiamando direttamente la RPC (`GUARDIAN_CONSENT_REQUIRED`, 400),
  sbloccato dopo la registrazione del consenso dalle impostazioni.
- Console admin -> PASS: dashboard con metriche, eventi, tornei, postazioni,
  giochi, altro e bacheca tutte raggiungibili e popolate.

### Gate

- `pnpm lint` -> PASS. `pnpm format:check` -> PASS. `pnpm typecheck` -> PASS
  (exit 0). `pnpm test` -> PASS (2). `pnpm exec playwright test --workers=1` ->
  PASS (8 Chromium). `pnpm build` -> PASS.
  `nuxt build --preset=cloudflare_pages` -> PASS.

### Difetti trovati e corretti durante la verifica

- La navigazione client-side cambiava rotta e titolo senza aggiornare il
  contenuto: incompatibilita fra `pageTransition` e le pagine con `await` di
  primo livello (DEC-029).
- `app/pages/app/tornei/[id].vue` affiancava la cartella `[id]/`, ripetendo il
  problema di DEC-019. Aggiunto `tests/unit/route-structure.test.ts` che
  impedisce la ricomparsa del conflitto.
- Cinque pagine avevano `v-if` sulla radice del template: sostituito con una
  radice stabile.
- `public_capacity.test.sql` dipendeva dall'assenza di prenotazioni sulla
  fixture demo (DEC-030).

### Difetto trovato dopo la verifica principale

- Le card dei tornei mostravano "Iscritto" a un amministratore non iscritto:
  la query delle proprie iscrizioni si affidava alle RLS, ma la policy
  `tournament_members_admin_select` lascia leggere agli admin anche le
  iscrizioni altrui. Aggiunto il filtro esplicito sul proprio id in
  `/app/tornei` e `/app/tornei/[id]`. Verificato che un admin non iscritto non
  veda piu il bordo verde e che l'utente realmente iscritto continui a vederlo.

## Verifica console dinamica e schede condivise 2026-09-12

### Gate automatici

- `pnpm lint` -> PASS.
- `pnpm format:check` -> PASS (eseguito `pnpm format`).
- `pnpm typecheck` -> PASS, exit 0; warning Volar/vue-router noto e non
  bloccante.
- `pnpm test` -> PASS, 10 test: aggiunto
  `tests/unit/tournament-standings.test.ts` con 8 casi su ordinamento della
  classifica, lettura dei punteggi ed etichette dei round.
- `pnpm exec playwright test --workers=1` -> PASS, 8/8 Chromium. Estese le
  liste protette con `/api/admin/dashboard`, `/api/admin/users/[id]`,
  `/api/admin/tournaments/[id]`, `/admin/utenti` e `/admin/tornei`.
- `pnpm db:test` -> PASS, 211/211 pgTAP (nessuna migration modificata).
- `pnpm build` -> PASS, preset `node-server`.

### Verifica funzionale nel browser (locale, account super_admin DEV)

| Prova | Esito |
| --- | --- |
| Shell console senza collegamento all'area personale | PASS |
| Dashboard su evento programmato: data, prezzo, postazioni, prenotati | PASS |
| Scheda Prenotati con nome, cognome, eta, tornei e "prima volta" | PASS |
| Scheda Tornei con orario, stato e iscritti | PASS |
| `Start evento` con conferma, passaggio a live e notifica a 2 iscritti | PASS |
| Dashboard live: partecipanti presenti, countdown, cronometro, partite | PASS |
| Iscrizione manuale di un utente al torneo | PASS |
| Rimozione iscritto e candidati gia iscritti esclusi dal selettore | PASS |
| Check-in di un iscritto dalla classifica | PASS |
| Avvio torneo con generazione del tabellone (2 e 4 iscritti) | PASS |
| Chiamata giocatori, avvio incontro, registrazione risultato | PASS |
| Classifica con corona oro/argento e riga anagrafica | PASS |
| Tabellone a due round con collegamenti fra semifinali e finale | PASS |
| Scheda utente: intestazione, eventi, tornei con piazzamento, ranking | PASS |
| Scheda torneo lato app utente: soli nickname, nessun comando | PASS |
| Viste mobile 375px: liste a card, tab bar, nessuno scroll orizzontale | PASS |

### Difetti trovati e corretti durante la verifica

- Il tabellone non mostrava i collegamenti: `overflow: hidden` sul riquadro
  dell'incontro tagliava gli pseudo-elementi. Rimosso, arrotondando la riga in
  fondo per non perdere gli angoli.
- "Salva risultato" era attivo su incontri in stato `ready`, dove la guardia di
  transizione rifiuta il salto a `completed`. Ora il salvataggio si abilita solo
  a match avviato e l'interfaccia spiega la sequenza.
- Conto alla rovescia in ore a tre cifre per eventi lontani giorni: sopra le
  ventiquattro ore si contano i giorni.
- Un torneo avviato prima dell'orario mostrava il conto alla rovescia invece
  dello stato "In corso".

### Limiti noti confermati dalla prova

- La registrazione di un risultato richiede sempre la sequenza chiama -> avvia
  -> risultato: `record_match_result` accetta anche `ready` e `called`, ma il
  trigger di transizione ammette solo `running -> completed`.
- A incontro concluso si corregge solo il punteggio, non il vincitore.

### Stato dei dati DEV dopo la verifica

L'evento demo e stato riportato a `scheduled` e il torneo di prova creato per
il tabellone a quattro iscritti e stato eliminato. Resta concluso il torneo
"Tekken 8 Arena", con vincitore e punti a ledger: `pnpm db:reset` riporta la
fixture allo stato iniziale.

## Verifica wizard evento e revisione dashboard 2026-09-12

### Gate automatici

- `pnpm lint` -> PASS.
- `pnpm format:check` -> PASS.
- `pnpm typecheck` -> PASS, exit 0.
- `pnpm test` -> PASS, 10 test.
- `pnpm exec playwright test --workers=1` -> PASS, 8/8 Chromium.
- `pnpm build` -> PASS, preset `node-server`.

Nota: `pnpm build` non va lanciato mentre il server di sviluppo e attivo.
Condividono la cartella `.nuxt` e il processo di sviluppo si e chiuso durante
la prova.

### Verifica funzionale nel browser (locale, account super_admin DEV)

| Prova | Esito |
| --- | --- |
| Dashboard senza le card di riepilogo in fondo | PASS |
| Schede dashboard agganciate in alto sotto l'header (misurato: top 56 px) | PASS |
| Scheda Piattaforme con card postazione e giochi disponibili | PASS |
| Scheda Tornei con orario di inizio invece del conto alla rovescia lungo | PASS |
| Elenco eventi senza form inline e senza pulsante catalogo | PASS |
| "Nuovo evento" apre la vista di creazione | PASS |
| Wizard: Info -> salvataggio bozza -> Piattaforme | PASS |
| Selezione postazione con apertura automatica dei giochi | PASS |
| Salvataggio postazioni e passaggio a Tornei | PASS |
| Creazione torneo con postazioni e giochi filtrati sull'evento | PASS |
| Card torneo con piattaforma, gioco, orario, tipo e massimo iscritti | PASS |
| "Salva evento" e ritorno all'elenco con l'evento programmato | PASS |
| Duplica: copia in bozza non pubblicata con postazioni e giochi copiati | PASS |
| Elimina: evento con torneo collegato rimosso, nessun orfano a database | PASS |
| Viste a 375 px: elenco eventi e wizard senza margini eccessivi | PASS |
| `document.documentElement.scrollWidth > clientWidth` a 375 px | false, nessuno sbordamento |

### Difetti trovati e corretti durante la verifica

- `overflow-x: hidden` sulla radice delle shell annullava `position: sticky`
  sui discendenti: header della console e barre di schede non si agganciavano
  (DEC-034).
- L'apertura automatica dei giochi alla selezione di una postazione non
  scattava: il model veniva riletto subito dopo l'assegnazione.

### Stato dei dati DEV dopo la verifica

I due eventi di prova ("Serata Wizard DEV" e la sua copia) sono stati
eliminati dall'interfaccia. Restano l'evento demo e l'evento "Test" creato
dall'utente. Nessun torneo o postazione orfana a database.

## Verifica tema scuro, scheda evento e dati dimostrativi 2026-09-12

### Gate automatici

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck` -> PASS.
- `pnpm test` -> PASS, 10 test.
- `pnpm exec playwright test --workers=1` -> PASS, 8/8 Chromium.
- `pnpm db:test` -> PASS, 211/211 pgTAP, con i dati dimostrativi presenti.
- `pnpm build` -> PASS, preset `node-server`.

### Verifica funzionale nel browser

| Prova | Esito |
| --- | --- |
| Classe `dark` sull'elemento radice e campi scuri in tutte le maschere | PASS |
| Select native scure, opzioni leggibili (`color-scheme: dark`) | PASS |
| Pulsante primario nel rosso del marchio, non rosa | PASS |
| Angoli delle card invariati dopo il ripristino di `--ui-radius` | PASS |
| Dashboard senza pulsante "Aggiorna" | PASS |
| Evento live: solo `Modifica` e `Check-in`, in taglia grande | PASS |
| Card evento in elenco: apre la scheda in sola lettura, senza comandi | PASS |
| Lista tornei con le tre schede, "In corso" presente solo se popolata | PASS |
| Testata torneo compressa con "Mostra dettagli" | PASS |
| Giochi a due colonne su telefono | PASS |
| Tabellone a sedici partecipanti: quattro round, collegamenti corretti | PASS |
| Girone a sedici: centoventi incontri, classifica ordinata per vittorie | PASS |

### Dati dimostrativi creati

Sedici utenti demo (`nickname@vrsus.local`, password uguale agli account DEV) e
la giornata "VRSUS Showcase" con:

- tre postazioni con i rispettivi giochi;
- sedici prenotazioni confermate, dodici gia presenti in sede;
- torneo Tekken 8 a eliminazione diretta, concluso, quindici incontri;
- torneo Mario Kart 8 Deluxe a girone, in corso, ottanta incontri su centoventi.

Si ricreano con `supabase/dev/demo_showcase.sql`.

### Difetti trovati e corretti durante la verifica

- Tema chiaro di Nuxt UI su pagina scura: campi e tendine illeggibili
  (DEC-035).
- `--ui-radius` alzata a 0.75rem aveva triplicato la scala `rounded-*` di tutta
  l'applicazione.
- Colore primario dei pulsanti pieni sulla tinta 400, quindi rosa.
- Il test E2E della home dipendeva dal titolo dell'evento di fixture.

## 2026-09-13 - Plancia Live e scheda della giornata richiudibile

### Gate automatici

| Verifica | Comando | Esito |
| --- | --- | --- |
| Lint | `pnpm lint` | PASS |
| Formattazione | `prettier --write` su `app/` e `server/` | PASS |
| Typecheck | `pnpm typecheck` | PASS |
| Unit tests | `pnpm test` | PASS - 10 test |
| Build standard | `pnpm build` | PASS - `node-server` |

E2E e pgTAP non rieseguiti in questa sessione: la modifica e di sola interfaccia
della console e non tocca database, RPC o rotte pubbliche coperte dagli E2E.

### Verifica funzionale nel browser

Ambiente locale con la giornata dimostrativa "VRSUS Showcase" in corso, account
super-admin, viewport 375 px e desktop.

| Prova | Esito |
| --- | --- |
| Intestazione della plancia: `Live` con pallino rosso lampeggiante | PASS |
| Scheda della giornata: stato, sede, giorno, fascia oraria, `12/16 presenti` | PASS |
| Comando `Dettagli`: la griglia si chiude e la scheda si accorcia | PASS |
| Dettagli aperti: prezzo, postazioni, tornei, capienza | PASS |
| Azioni `Modifica` e `Check-in` nel piede della scheda | PASS |
| Scheda `Partecipanti` con `12/16` e nessun riepilogo ripetuto sotto | PASS |
| Tornei: quello in corso in cima, il concluso in fondo e attenuato | PASS |
| Evento programmato (`/admin/eventi/<id>`): `Da avviare`, `2/40 prenotati` | PASS |
| Tab bar console: prima voce `Live` con il pallino acceso | PASS |
| `Altro` senza il gruppo `Operazioni` (live evento e check-in) | PASS |
| Postazioni a due colonne su telefono, in vetrina e in console | PASS |
| Animazione del pallino attiva (`vrsus-live-blink`, 1.4s) | PASS |

### Note

Il pallino della tab bar compare dopo l'idratazione, perche lo stato live e
letto dal client (`useAdminLiveEvent()`, `server: false`): per una frazione di
secondo si vede l'icona di riserva.

## 2026-09-13 - Motore tornei elastico

### Gate automatici

| Verifica | Comando | Esito |
| --- | --- | --- |
| Lint | `pnpm lint` | PASS |
| Formattazione | `pnpm format:check` | PASS |
| Typecheck | `pnpm typecheck` | PASS |
| Unit tests | `pnpm test` | PASS - 14 test |
| Test database | `pnpm db:test` | PASS - 238 test pgTAP |
| Build standard | `pnpm build` | PASS - `node-server` |

`pnpm db:reset` non e stato eseguito: cancellerebbe gli account DEV di questo
workspace. Le due migration sono state applicate con `supabase migration up`,
cioe nella stessa sequenza che userebbe un reset, e il seed e stato eseguito
dentro una transazione annullata per verificarne la sintassi. Il primo reset
utile va fatto quando gli account si possono ricreare.

### Nuovi test pgTAP (`tournament_engine.test.sql`)

| Prova | Esito |
| --- | --- |
| Slug generato da piattaforma, gioco e data | PASS |
| Configurazione incoerente corretta dal trigger (tempo -> `best_time`, `asc`) | PASS |
| Sedici iscritti, gruppi da quattro, tre manche: dodici partite | PASS |
| Ogni iscritto corre in ogni manche | PASS |
| La rotazione non ripete mai una coppia di avversari | PASS |
| Punti per posizione assegnati dalla tabella dello schema | PASS |
| I punti si sommano fra le manche e chiudono il torneo | PASS |
| Time attack a coppie: sedici tentativi, classifica dal tempo piu basso | PASS |
| Squadra incompleta: il calendario non parte (`INCOMPLETE_TEAMS`) | PASS |
| Quattro squadre complete: tabellone da tre partite | PASS |
| Squadra a invito: l'id non basta, serve il codice | PASS |
| Il codice fa entrare e la squadra passa da `forming` a `registered` | PASS |

### Verifica funzionale nel browser

Ambiente locale, account super-admin, dati dimostrativi con Mario Kart a manche.

| Prova | Esito |
| --- | --- |
| Scheda torneo: chip "Singolo · 3 manche da 4 · punti per posizione: 10/8/6/4 · avversari sempre diversi" | PASS |
| Classifica a punti con colonne Punti, Giocate, Vinte | PASS |
| Partite: schede Manche 1/2/3, card con ordine di arrivo e punti (+10/+8/+6/+4) | PASS |
| Registrazione di un ordine di arrivo dalla console: piazzamenti e punti applicati | PASS |
| Scheda utente dello stesso torneo: soli nickname, chip e classifica coerenti | PASS |
| Creazione torneo a coppie con preset: campi adattati e anteprima aggiornata | PASS |
| Torneo creato con `entry_size` 2, `team_formation` invito, slug automatico | PASS |
| App: creazione squadra, badge Iscritto, scheda Squadre | PASS |
| App: codice di invito visibile al solo capitano | PASS |

### Difetti trovati e corretti durante la verifica

- Rotazione delle manche a matrice: otto coppie ripetute su settantadue.
  Sostituita dalla scelta greedy, zero ripetizioni.
- Trigger di normalizzazione e slug senza `security definer`: la creazione di
  un torneo dalla console falliva con "permission denied for table platforms".
- `position` non e utilizzabile come nome di colonna in un `returns table`.

## Sessione 2026-09-14 — Uscita console, prenotati/partecipanti, tessera ARCI

### Suite

| Verifica | Comando | Esito |
| --- | --- | --- |
| Migration locale | `supabase migration up --local` | PASS — `20260914100000_arci_membership` applicata |
| Tipi database | `supabase gen types typescript --local` | PASS — rigenerati |
| Lint | `pnpm lint` | PASS |
| Formattazione | `pnpm format:check` | PASS |
| Typecheck | `pnpm typecheck` | PASS — zero errori TS |
| Unit tests | `pnpm test` | PASS — 14 test |
| Database/RLS | `pnpm db:test` | PASS — 258 test pgTAP, 20 nuovi |
| Build | `pnpm build` | PASS — `node-server` |

E2E Chromium non rieseguiti: le rotte pubbliche coperte non cambiano
comportamento, cambia solo il testo dell'evento quando la tessera e richiesta.

### pgTAP — `arci_membership.test.sql`

| Caso | Esito |
| --- | --- |
| Le RPC e la colonna `events.arci_required` esistono | PASS |
| Un evento nuovo richiede la tessera senza dirlo | PASS |
| Un utente non puo scriversi la tessera sul proprio profilo | PASS |
| Un utente non puo chiamare `set_arci_card` | PASS |
| Un profilo senza verifica non risulta socio | PASS |
| Il check-in dichiara che la giornata richiede la tessera | PASS |
| Il check-in dichiara la tessera mancante | PASS |
| Lo staff registra la tessera vista alla porta | PASS |
| Il check-in successivo vede la tessera appena registrata | PASS |
| Il socio legge la propria tessera come valida | PASS |
| Una verifica di una stagione passata non vale | PASS |
| Lo staff non puo chiudere la stagione | PASS |
| La data di rinnovo e validata (mese 13 rifiutato) | PASS |
| L'admin chiude la stagione sul posto | PASS |
| Dopo l'azzeramento ogni tessera va rimostrata | PASS |
| Registrazione e azzeramento lasciano audit | PASS |

### Verifica funzionale nel browser

Ambiente locale, account super-admin, evento dimostrativo "VRSUS Showcase" in
corso.

| Prova | Esito |
| --- | --- |
| Colonna a 1280 px: voci principali, gruppi Contenuti e Amministrazione, niente "Altro" | PASS |
| Piede della colonna con `admin@vrsus.local` e comando `Esci` (console e area utente) | PASS |
| A 375 px la barra in basso mantiene "Altro"; la pagina Altro chiude con la sezione Sessione | PASS |
| Evento in corso: schede `Prenotati 16` e `Partecipanti 12`, partecipanti in apertura | PASS |
| Evento concluso (`mode: past`): stato "Conclusa", entrambe le schede, vuoto coerente | PASS |
| Evento da avviare: la scheda Partecipanti non compare | PASS |
| Scheda della giornata: riga "Tessera ARCI — Obbligatoria" | PASS |
| Lista prenotati: colonna ARCI e avviso "16 prenotati non hanno la tessera" | PASS |
| Scheda utente: badge "Senza tessera", registrazione, badge "Tessera ARCI" e data, revoca | PASS |
| Impostazioni: sezione Tessere ARCI con conteggio, stagione corrente, data di rinnovo, azzeramento | PASS |
| Wizard evento: casella "Tessera ARCI obbligatoria" salvata sul database | PASS |
| Vetrina evento: chip "Tessera ARCI richiesta" e avviso sopra la prenotazione | PASS |
| Conferma prenotazione: riga "Tessera ARCI — Obbligatoria" e avviso personale | PASS |
| Impostazioni utente: stato della propria tessera | PASS |

### Non verificato a schermo

- Pannello della tessera nel check-in: serve un QR reale, quindi va guardato
  nella prova su dispositivo fisico gia in `NEXT_STEPS.md`. La RPC che lo
  alimenta e coperta dai test pgTAP.
- Comando `Esci`: non premuto per non perdere la sessione dell'ambiente
  locale; usa la stessa `signOut()` gia in uso in `/app/impostazioni`.

### Difetti trovati e corretti durante la verifica

- `reset_arci_cards` con `now()` non invalidava le tessere registrate nella
  stessa transazione: sostituito con `clock_timestamp()`.
- Messaggio vuoto della scheda Partecipanti al passato ("non ha ancora passato
  il QR code") su una giornata gia conclusa.

## Sessione 2026-09-14 (seconda) — App utente e ranking

### Suite

| Verifica | Comando | Esito |
| --- | --- | --- |
| Migration locale | `supabase migration up --local` | PASS — `20260914120000_game_rankings` applicata |
| Tipi database | `supabase gen types typescript --local` | PASS |
| Lint | `pnpm lint` | PASS — zero warning |
| Formattazione | `pnpm format:check` | PASS |
| Typecheck | `pnpm typecheck` | PASS |
| Unit tests | `pnpm test` | PASS — 19 test, 5 nuovi su `buildMyLiveTournaments` |
| Database/RLS | `pnpm db:test` | PASS — 271 test pgTAP, 13 nuovi sulle sfide |
| Build | `pnpm build` | PASS — `node-server` |

### pgTAP — `game_rankings.test.sql`

| Caso | Esito |
| --- | --- |
| Tabella, colonna `ranking_id` e view pubbliche esistono | PASS |
| Un cliente legge le sfide dalla view pubblica | PASS |
| La classifica tiene il tentativo migliore (tempo piu basso) | PASS |
| I tentativi vengono contati | PASS |
| I punteggi grezzi restano chiusi al browser | PASS |
| Un cliente non vede la tabella delle sfide | PASS |
| Un cliente non puo creare una sfida | PASS |
| Lo staff legge le sfide (deve registrare i record) | PASS |
| Lo staff non puo cambiare le regole di una sfida | PASS |
| Un admin chiude la sfida | PASS |

### Verifica funzionale nel browser

Account cliente creato per la prova (poi rimosso), serata "VRSUS Showcase" in
corso, sfide dimostrative caricate.

| Prova | Esito |
| --- | --- |
| Barra: Live (pallino) · Bacheca · Eventi · Ranking · Tornei · Impostazioni | PASS |
| `/app`: invito compatto (nome, data, prezzo, tessera) sopra la bacheca | PASS |
| Invito assente quando non ci sono date programmate | PASS (nessun evento programmato in lista storico) |
| `/app/eventi`: sezioni In corso e In programma, badge Live, Sei prenotato, tessera | PASS |
| Scheda evento: informazioni, tornei della giornata, postazioni | PASS |
| Prenotazione con finestra di conferma e riepilogo | PASS |
| Dopo la conferma la scheda mostra "Sei prenotato" e il biglietto | PASS |
| `/app/live` prima del check-in: biglietto con QR | PASS |
| `/app/live` dopo il check-in: "I tuoi tornei" con "Manca una partita alla tua", avversari e turno | PASS |
| `/app/live`: schede Tornei e Piattaforme, badge Iscritto | PASS |
| Ranking: tenda Postazione con Punti VRSUS + sole postazioni con sfide | PASS |
| Ranking: tenda Gioco senza "tutti", solo giochi con sfide | PASS |
| Ranking: tenda Sfida con le sfide del gioco, apre sull'ultima aperta | PASS |
| Ranking: regolamento della sfida e classifica con tempi formattati (6:36.402) | PASS |
| Console: sezione Ranking nella pagina del gioco, creazione sfida | PASS |
| Console: scheda sfida con classifica, registrazione record ed eliminazione | PASS |

### Difetti trovati e corretti durante la verifica

- Avversari di una manche da quattro fuori dal bordo su telefono: riga a capo.
- `game_scores` senza grant per il browser: registrazione spostata su endpoint
  service-role, con rifiuto delle sfide chiuse o scadute.
- Due test pgTAP contavano righe di tutto il database: ora contano le proprie.

### Non verificato

- Notifiche sul turno durante la serata: non implementate, da progettare.
- E2E Chromium non rieseguiti: le rotte pubbliche toccate sono solo il link
  della locandina.


## Sessione 2026-09-15 — Preparazione deploy Cloudflare Pages

### Suite

| Verifica | Comando | Esito |
| --- | --- | --- |
| Build Cloudflare via script | `corepack pnpm run build:cloudflare` | PASS — `dist/_worker.js`, `_routes.json`, `_headers`, `_redirects` generati; 3.45 MB (1.06 MB gzip) |
| Format check | `corepack pnpm run format:check` | PASS |

### Non verificato

- Il deploy vero su Cloudflare non e stato eseguito: richiede account e
  credenziali dell'utente (USER ACTION REQUIRED, vedere
  `docs/dev/guideline_implementations.md`).
- Di conseguenza restano non provati l'URL pubblico, il login con Supabase
  remoto, l'installazione PWA e lo scanner QR su dispositivo fisico.

## Sessione 2026-09-15 (seconda) — PWA, passaggio di area, slug

### Suite

| Verifica | Comando | Esito |
| --- | --- | --- |
| Unit | `corepack pnpm test` | PASS — 23 test, 5 file (nuovo `slug.test.ts`) |
| Lint | `corepack pnpm lint` | PASS |
| Format | `corepack pnpm format:check` | PASS |
| Typecheck | `corepack pnpm typecheck` | PASS |
| Build Node | `corepack pnpm build` | PASS |
| Build Cloudflare | `corepack pnpm run build:cloudflare` | PASS |

### Service worker, analisi dell'artefatto generato

| Controllo | Prima | Dopo |
| --- | --- | --- |
| `NavigationRoute` su URL non precacheato | presente (`/offline`, poi `/`) | assente |
| Pagina offline in precache | no | si (`offline`) |
| Voci in precache | 3, nessuna pagina | 138 |
| Ripiego offline | non raggiungibile | `PrecacheFallbackPlugin` su `/offline` |
| Icone raster nel manifest | nessuna | 192, 512 e maskable 512 |

### Verifica funzionale nel browser (ambiente locale)

| Caso | Esito |
| --- | --- |
| Login da `/login` con account super-admin: arriva a `/app` senza restare in caricamento | PASS |
| Invito a installare l'app al primo accesso, con istruzioni per la piattaforma | PASS |
| L'invito non ricompare dopo "Ho capito" (memoria su `localStorage`) | PASS |
| Passaggio Cliente/Console nel piede della colonna, accanto all'uscita | PASS |
| Da `/app` a `/admin` con il toggle, posizione attiva corretta | PASS |
| Da `/admin` a `/app` con il toggle | PASS |
| "Nuova postazione" non ha piu il campo Slug | PASS |
| Due postazioni con lo stesso nome: slug `test-agente` e `test-agente-2` | PASS (verificato a database) |

### Non verificato

- **Registrazione del service worker a runtime.** Il browser integrato usato
  per le prove rifiuta `navigator.serviceWorker.register` con "An unknown error
  occurred when fetching the script" anche per uno script servito
  correttamente (200, `text/javascript`, scaricabile con `fetch` dalla stessa
  pagina): e un limite dell'ambiente di prova, non dell'artefatto. La
  registrazione, la comparsa del bottone `Installa` e il ripiego offline vanno
  verificati su un browser reale, sul sito pubblicato.
- **Blocco del caricamento dopo il login in produzione.** Non riproducibile in
  locale (Supabase locale risponde in pochi millisecondi). La causa piu
  probabile e stata rimossa: l'`await loadRoles()` nel layout dell'app metteva
  l'intera shell dietro a Suspense. Da riverificare online.
- Prove su dispositivo fisico: installazione, fotocamera, scanner QR.

## Sessione 2026-09-15 (terza) — Registrazione con conferma via email

### Suite

| Verifica | Comando | Esito |
| --- | --- | --- |
| Unit | `corepack pnpm test` | PASS — 23 test |
| Lint / Format / Typecheck | `lint`, `format:check`, `typecheck` | PASS |
| Build Cloudflare | `corepack pnpm run build:cloudflare` | PASS |

### Flusso di registrazione, provato per intero in locale

Ambiente locale allineato al remoto (`enable_confirmations = true`), mail
lette da Mailpit.

| Passo | Esito |
| --- | --- |
| Registrazione di un account nuovo da `/registrati` | PASS |
| Compare "Controlla la posta" invece del rimbalzo silenzioso su `/login` | PASS |
| La mail arriva nella casella locale | PASS |
| Il link contiene `redirect_to=http://127.0.0.1:3000/confirm` e non la radice | PASS |
| Aprendo il link si passa da `/confirm` e si arriva in bacheca autenticati | PASS |
| L'account risulta confermato e la sessione e attiva | PASS |

### Ambiente locale ricostruito

Il volume del database locale era su PostgreSQL 15, incompatibile con l'immagine
PostgreSQL 17 imposta dalla CLI 2.117 (`major_version` in `config.toml` viene
ignorato). Backup completo in `supabase/.temp/` prima di ricreare lo stack,
poi migration, seed e ricreazione degli account DEV.

### Non verificato

- Il flusso sul progetto remoto: dipende da `Site URL` e `Redirect URLs` nel
  dashboard Supabase, che sono USER ACTION REQUIRED. Finche non sono corretti,
  `emailRedirectTo` viene scartato e il link continua a puntare all'indirizzo
  vecchio.
- I sedici utenti dimostrativi e i dati di prova creati a mano non sono stati
  ricreati dopo il reset.

## 2026-10-02 — Float menu su tutte le pagine admin con azioni globali

| Verifica | Esito |
| --- | --- |
| `nuxt typecheck` | PASS (warning noto Volar/vue-router) |
| ESLint sui componenti e sulle pagine admin | PASS |
| Build `node-server` | PASS alla seconda esecuzione con permessi di lettura; primo tentativo bloccato dal sandbox su `EPERM readlink C:\Users\User` |
| Prova manuale admin su mobile | PENDENTE |

Le azioni pagina sono state spostate nel float menu; le azioni di riga e
partita restano nel contesto. Il salvataggio evento viene disabilitato dalla
stessa validazione del payload usata al submit.

## 2026-10-02 — Rifiniture app cliente

| Verifica | Esito |
| --- | --- |
| ESLint su Notifiche, Ranking, Tornei e Impostazioni | PASS |
| `nuxt typecheck` | PASS (warning noto Volar/vue-router) |
| Build `node-server` | PASS dopo la correzione dell'espressione nel template Ranking |
| Unit test Vitest | PASS — 23/23 (rieseguiti con permessi di lettura necessari) |
| Prova mobile autenticata | PENDENTE |

Ranking usa `public_game_rankings` e la `image_path` della view `public_games`:
nessuna modifica al database. La disponibilita effettiva delle copertine
dipende dai dati caricati nel catalogo.

Aggiornamento successivo: Punti VRSUS e una card sempre disponibile nella
stessa griglia delle sfide; ogni card apre la relativa pagina, dove stato e
regolamento precedono sempre la classifica.

Verifica della pagina dedicata al ranking: ESLint sulle due viste Ranking,
`nuxt typecheck` e build `node-server` → PASS. Il typecheck conserva il warning
noto di Volar su `vue-router/volar/sfc-route-blocks`, senza errori di tipo.

Correzione del click sulla card: la build precedente registrava
`/app/ranking/:id` come figlia di `ranking.vue`, che non aveva `<NuxtPage>`.
Dopo lo spostamento dell'elenco a `ranking/index.vue`, la build `node-server`
e PASS e la tabella delle rotte generata registra `/app/ranking` e
`/app/ranking/:id` come rotte sorelle. Click nel browser autenticato ancora
da verificare.

Aggiornamento PWA Apple e Ranking: Prettier, ESLint sui file toccati,
`nuxt typecheck`, `git diff --check` e build `node-server` → PASS. Il typecheck
emette ancora il warning noto Volar/vue-router, senza errori. Il gesto
pull-to-refresh e limitato alla shell cliente in modalita standalone su iOS;
non e stato provato su hardware Apple. La checklist manuale e in
`docs/dev/guideline_test_features.md`.

## 2026-10-02 — Login iPhone e aggiornamento PWA globale

| Verifica | Esito |
| --- | --- |
| Prettier, ESLint sui file modificati, `nuxt typecheck` e `git diff --check` | PASS (warning noto Volar/vue-router nel typecheck) |
| Build Nuxt `node-server` | PASS |
| Playwright mobile simulato: gesture su `/login` | PASS |
| Playwright mobile simulato: errore di rete con pulsante di nuovo utilizzabile | PASS |
| Playwright mobile simulato: risposta di login positiva seguita da richiesta documento a `/app` | PASS |
| Login e gesture su PWA iPhone con Supabase remoto reale | PENDENTE |

I tre test Playwright usano Chrome con dimensioni e user agent iPhone. Il
terzo simula la risposta di Supabase e verifica la navigazione completa; non
dimostra ancora la lettura della sessione reale dal server remoto. Il primo
tentativo E2E era fallito perche il browser Playwright bundled non era
installato; i test sono stati eseguiti con il Chrome presente nel sistema.
