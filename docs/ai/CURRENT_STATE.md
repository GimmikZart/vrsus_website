# Current Project State

## Stato sintetico

Phase 3 e in corso: il sito pubblico legge eventi e contenuti editoriali dalle
view Supabase `public_*`, con catalogo, dettagli, stati di
caricamento/errore/vuoto e metadata SEO. Phase 2 resta completata e verificata.

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
  `/servizi/[slug]`, con dettaglio editoriale e canonical URL.
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

## Lavoro in corso

Restano da implementare nella Phase 3 l'upload asset e i contenuti editoriali
reali/assets di QUALITY e produzione.

## Verifiche

- `pnpm db:reset` -> PASS: migration e seed applicati localmente.
- `pnpm db:types` -> PASS: tipi generati dal database locale.
- `pnpm db:test` -> PASS: 39 test pgTAP.
- `pnpm lint` -> PASS.
- `pnpm format:check` -> PASS.
- `pnpm typecheck` -> PASS; resta warning non bloccante Volar/vue-router.
- `pnpm test` -> PASS, 1 test unitario.
- `pnpm test:e2e` -> PASS, 5 test Chromium, inclusi catalogo -> dettaglio e
  pagine CMS pubbliche.
- `pnpm build` -> PASS, preset `node-server`.
- Build di produzione successiva alla console eventi -> PASS; route `/admin/eventi`
  inclusa nel bundle server.
- Smoke SSR bundle -> PASS: tutte le route pubbliche, robots e sitemap
  rispondono 200; fixture evento/news/servizio presenti; JSON-LD evento presente.
- Smoke lead -> PASS: form servizio presente, payload invalido rifiutato con
  400 e route admin richieste protetta.

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

## Ultimo aggiornamento

2026-08-29
