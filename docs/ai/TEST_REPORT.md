# Test Report

Ultimo aggiornamento: 2026-08-29

## Stato verifiche

| Verifica | Comando | Esito |
| --- | --- | --- |
| Reset database DEV | `pnpm db:reset` | PASS — migration e seed applicati |
| Tipi database | `pnpm db:types` | PASS — generati da Supabase locale |
| Test database/RLS | `pnpm db:test` | PASS — 39 test pgTAP |
| Lint | `pnpm lint` | PASS |
| Formattazione | `pnpm format:check` | PASS |
| Typecheck | `pnpm typecheck` | PASS |
| Unit tests | `pnpm test` | PASS — 1 test |
| E2E | `pnpm test:e2e` | PASS — 5 test Chromium |
| Build standard | `pnpm build` | PASS — `node-server` |
| Build Cloudflare | `pnpm exec nuxt build --preset=cloudflare_pages` | PASS — Phase 0 |
| Smoke SSR pubblico | bundle `node .output/server/index.mjs` + richieste HTTP | PASS — route pubbliche, CMS, robots e sitemap |
| Smoke lead servizi | bundle preview + POST invalido | PASS — form SSR presente e payload invalido restituisce 400 |
| Protezione route CMS admin | bundle preview + richieste anonime | PASS — `/admin/news`, `/admin/servizi` e `/admin/richieste` restituiscono redirect al login |
| Build console eventi | `pnpm build` | PASS — route `/admin/eventi` compilata nel bundle server |
| Build console catalogo | `pnpm build` | PASS — route `/admin/catalogo` compilata nel bundle server |
| Verifica manuale landing | Procedura in guideline | DA ESEGUIRE |
| Verifica manuale database | Procedura in guideline | DA ESEGUIRE |

## Feature verificate

- Landing pubblica VRSUS: rendering SSR, titolo, CTA e navigazione verificati
  con Playwright.
- Catalogo pubblico: `/eventi` e `/eventi/vrsus-demo` leggono il fixture locale
  dalle view Supabase; il dettaglio include JSON-LD `Event`.
- SEO tecnico: canonical sul dettaglio, `robots.txt` environment-aware e sitemap
  con slug degli eventi, news e servizi pubblici.
- Contenuti pubblici CMS: esperienze, news, dettaglio news, servizi e dettaglio
  servizio leggono fixture pubblicate dalle view Supabase; i dettagli hanno
  canonical e le news includono metadata editoriali.
- Console CMS: `/admin/news` e `/admin/servizi` espongono form strutturati per
  admin/super-admin; scritture, stato di pubblicazione e attivazione usano le
  tabelle raw protette da RLS.
- Lead servizi: il form pubblico invia a un endpoint server validato; il pannello
  `/admin/richieste` permette aggiornamento di stato e note interne.
- Console eventi: `/admin/eventi` gestisce il ciclo editoriale/operativo di base
  dell’evento e mantiene privata la capienza salvo configurazione esplicita.
- Console catalogo: `/admin/catalogo` gestisce attività e postazioni globali con
  categorie, stato attivo e capienza standard.
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
- Reset password, SMTP custom e Google OAuth in ambiente QUALITY.
