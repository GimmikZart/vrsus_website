# Current Project State

## Stato sintetico

Phase 10 e implementata nel repository: le milestone V1 di eventi, prenotazioni,
QR, check-in e PWA sono implementate; il sistema V2 di tornei, bracket,
realtime, notifiche in-app/push e ranking e implementato nel repository. Sono
inoltre presenti duplicazione/archiviazione eventi, gestione no-show e guardie
database delle transizioni operative.
Restano prove manuali su account e dispositivi reali e il deploy
QUALITY/PRODUCTION.

## Lavoro completato

- Bootstrap Nuxt 4 e layout pubblico della Phase 0.
- Migration e seed DEV Supabase V1 con schema, vincoli, trigger, RLS e view
  pubbliche sicure.
- Stack Supabase locale Docker attivo su API `54331`, database `54332`, Studio
  `54333`, Inbucket `54334`.
- Tipi database generati e funzioni protette `get_my_roles()` e
  `set_user_role()`.
- Sessione Supabase SSR abilitata, login email/password, profilo bootstrap,
  middleware `auth`/`role` e route protette `/app`, `/admin` e `/admin/utenti`.
- Endpoint server di gestione utenti/ruoli con service role solo dopo verifica
  super-admin.
- Composable tipizzato per gli eventi pubblici, basato sulle view `public_*`.
- Homepage collegata al prossimo evento pubblicato.
- Route pubbliche `/eventi`, `/eventi/[slug]` e compatibilita `/evento`.
- Dettaglio con postazioni/attivita pubblicabili, JSON-LD `Event`, canonical URL.
- View pubbliche sicure per attivita, news e servizi, con fixture DEV pubblicate.
- Route pubbliche `/esperienze`, `/news`, `/news/[slug]`, `/servizi` e
  `/servizi/[slug]`, con dettaglio editoriale e canonical URL; aggiunto anche
  `/esperienze/[slug]` con immagine/placeholder, canonical e stati di errore.
- Regolamento pubblico con placeholder esplicito in attesa del testo ufficiale.
- Console admin `/admin/news` e `/admin/servizi` per creazione, modifica,
  pubblicazione/archiviazione news e attivazione/disattivazione servizi.
- Form pubblico per lead servizi con endpoint server validato e honeypot;
  console `/admin/richieste` per stato e note interne.
- Console `/admin/eventi` per creazione e modifica degli eventi, date, stato,
  prenotazioni, capienza privata/visibilità e dati del luogo.
- Console `/admin/catalogo` per attività e postazioni globali, categorie,
  stato attivo, capienza standard e metadati SEO.
- Configurazione `/admin/eventi/[id]` per selezionare attività/postazioni
  presenti e gestire le associazioni many-to-many per singolo evento.
- `robots.txt` e `sitemap.xml` dinamica; ambienti non production configurati
  come `noindex, nofollow` e disallow completo via robots.
- Override per evento di nomi, descrizioni, capienze, visibilita, stato,
  modalita d'accesso e orari delle attivita.
- Storage asset Supabase locale con bucket `vrsus-assets`, lettura pubblica e
  scrittura/modifica/cancellazione limitate a `admin` e `super_admin` tramite
  policy RLS.
- Componente `AssetUploader` riutilizzabile collegato alle console news,
  servizi, eventi e catalogo; il database memorizza il solo path dell'asset.
- Route area utente `/app/eventi`, `/app/tornei`, `/app/tornei/[id]` e
  `/app/profilo`, con dati filtrati dall'utente autenticato e azioni torneo
  collegate alle RPC esistenti.
- Console `/admin/impostazioni` per configurazioni leggere `site_settings`, con
  validazione JSON e accesso limitato ad admin/super-admin.
- Proiezione pubblica della disponibilita evento: capienza nascosta di default,
  stato derivato per `status` e numeri soltanto per `exact`, con soglia
  configurabile e fallback all'80%.
- Workflow admin eventi: duplicazione con copia della configurazione e delle
  associazioni, senza copiare prenotazioni/check-in/tornei, e archiviazione
  auditabile con pubblicazione e booking disabilitati.
- Gestione `no_show` da `/admin/live` tramite RPC staff/admin, con revoca del QR
  e audit dell'operazione.
- Guardie database per le transizioni evento/torneo/match e avanzamento bracket
  corretto per distinguere un bye reale da un feeder ancora incompleto.

## Milestone V1/V2 implementate nel repository

- RPC booking atomiche per creazione, cancellazione, promozione waiting list,
  QR hash-only, check-in idempotente e pagamento sul posto.
- Area utente con lista prenotazioni, QR, stato waiting list e inbox notifiche.
- Console staff `/admin/checkin` e `/admin/live` per scanner, check-in e metriche
  operative senza esporre note interne.
- Modello V2 per tornei, iscrizioni, check-in, bracket single-elimination,
  risultati, assegnazione postazioni, chiamata giocatori, realtime e ledger
  ranking, con RPC e test pgTAP.
- Adapter OneSignal server-side, mapping delle subscription, preferenze push e
  fallback persistente nell'inbox notifiche.
- Route pubbliche `/tornei`, `/tornei/[slug]` e `/ranking`, console
  `/admin/tornei`, `/admin/tornei/[id]` e `/admin/ranking`.
- Fallback offline PWA su `/offline`; operazioni booking/check-in/risultati sono
  esplicitamente online-only.

## Lavoro in corso

Restano contenuti e asset reali di QUALITY/produzione, prove manuali autenticati
multiutente, verifica PWA/fotocamera su dispositivo e configurazione esterna del
deploy/push provider.

## Verifiche

- `pnpm db:reset` -> PASS: migration e seed applicati localmente.
- `pnpm db:types` -> PASS: tipi generati dal database locale.
- `pnpm db:test` -> PASS: 169 test pgTAP, inclusi workflow booking, torneo V2,
  operazioni match, push/preferenze, torneo demo a 8 partecipanti e proiezione
  pubblica della capienza.
- `pnpm lint` -> PASS, senza errori ne warning.
- `pnpm format:check` -> PASS.
- `pnpm typecheck` -> PASS; resta warning non bloccante Volar/vue-router.
- `pnpm test` -> PASS, 1 test unitario.
- `pnpm test:e2e` -> PASS, 7 test Chromium, inclusi catalogo -> dettaglio
  esperienza/evento e pagine CMS pubbliche.
- `pnpm build` -> PASS, preset `node-server`.
- `pnpm db:reset` post-storage -> PASS: bucket e policy asset applicati.
- Typecheck uploader post-storage -> PASS; resta warning non bloccante Volar.
- Build uploader post-storage -> PASS; componente incluso nel bundle server.
- Build di produzione successiva alla console eventi -> PASS; route `/admin/eventi`
  inclusa nel bundle server.
- Smoke SSR bundle -> PASS: tutte le route pubbliche, robots e sitemap
  rispondono 200; fixture evento/news/servizio presenti; JSON-LD evento presente.
- Smoke lead -> PASS: form servizio presente, payload invalido rifiutato con
  400 e route admin richieste protetta.
- `corepack pnpm build` -> PASS, preset `node-server`, incluse route torneo,
  check-in, live admin e fallback PWA.
- `corepack pnpm exec nuxt build --preset=cloudflare_pages` -> PASS; worker
  Pages generato, con warning non bloccante sulla compatibilita Node.
- Verifica finale 2026-08-30: migration da zero, 169 test pgTAP, lint pulito, format, typecheck,
  unit (1), E2E Chromium seriale (7/7), build `node-server` e build
  `cloudflare_pages` tutti PASS. Restano soltanto il warning Volar/vue-router e
  warning Cloudflare sulla compatibilità Node.

## Problemi aperti

- La CLI Supabase locale segnala una versione piu recente disponibile; non e un
  blocker.
- Reset password, SMTP custom e Google OAuth restano configurazioni future per
  QUALITY/produzione.
- I font vengono scaricati/cachati durante la build; valutare asset locali se la
  pipeline futura dovra essere completamente offline.
- Test manuale autenticato della creazione/pubblicazione in `/admin/news` e
  `/admin/servizi` ancora da eseguire con un account DEV.
- Test manuale autenticato della creazione/modifica evento in `/admin/eventi`
  ancora da eseguire con un account DEV.
- Test manuale autenticato di creazione/modifica attività e postazioni in
  `/admin/catalogo` ancora da eseguire con un account DEV.
- Test manuale autenticato delle associazioni in `/admin/eventi/[id]` ancora da
  eseguire con un account DEV.
- Test manuale autenticato degli override per evento ancora da eseguire con un
  account DEV.
- Typecheck diretto post-correzione della configurazione evento -> PASS (exit
  code 0); restano soltanto i warning non bloccanti Volar.
- Test automatici ranking/bracket/booking -> PASS; test manuali V1/V2 e PWA da
  eseguire con account e dispositivi DEV/QUALITY.
- `corepack pnpm exec playwright test --workers=1` -> PASS, 7 test Chromium.
- Test pgTAP guardie transizioni/bye -> PASS; test manuale delle nuove azioni
  admin duplicazione/archiviazione e no-show ancora da eseguire su account DEV.

## Ultimo aggiornamento

2026-08-30
