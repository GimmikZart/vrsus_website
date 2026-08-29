# Handoff

## Stato

Phase 2 e completata e verificata. La Phase 3 e in corso: eventi pubblici, SEO
tecnico, pagine pubbliche CMS, console editoriale news/servizi e flusso lead
servizi sono implementati; la gestione eventi/catalogo resta da completare.
Non inserire `IMPLEMENTAZIONE COMPLETATA`.

## Ultimo lavoro

- Login email/password e sessione Supabase SSR.
- Profile bootstrap al primo utente Auth.
- Middleware `auth` e `role` con route `/app`, `/admin` e `/admin/utenti`.
- RPC database `get_my_roles()` e `set_user_role()`; la seconda richiede
  `super_admin` e crea audit log.
- Endpoint server `/api/admin/users` e `/api/admin/roles`; service role usato
  esclusivamente dopo verifica del ruolo.
- Test RLS reali con user A/B e test super-admin/utente normale.
- Catalogo eventi pubblico e dettaglio `/eventi/[slug]` da view `public_*`.
- Pagine pubbliche `/esperienze`, `/news`, `/servizi` e relativi dettagli da
  view Supabase pubblicate; `/regolamento` esplicita l'attesa del testo ufficiale.
- Console `/admin/news` e `/admin/servizi` per authoring e pubblicazione protetti
  da middleware, ruolo e RLS.
- Form pubblico servizi, endpoint server validato e console `/admin/richieste`
  per gestione stato/note interne.
- `robots.txt`, sitemap dinamica e JSON-LD evento.

## File importanti

- `app/composables/usePublicEvents.ts`
- `app/pages/index.vue`, `app/pages/eventi/`, `app/pages/evento.vue`
- `server/routes/robots.txt.ts`, `server/routes/sitemap.xml.ts`
- `app/composables/useVrsusAuth.ts`
- `app/middleware/auth.ts`, `app/middleware/role.ts`
- `app/pages/login.vue`, `app/pages/app.vue`, `app/pages/admin/`
- `server/utils/authorization.ts`, `server/api/admin/`
- `supabase/migrations/`, `supabase/tests/database_foundation.test.sql`

## Verifiche

Consultare `docs/ai/TEST_REPORT.md`. Ultimi gate lint, format, typecheck, unit,
build, 39 test pgTAP e 5 test E2E sono PASS. Smoke Auth, role management e SSR
pubblico sono PASS; gli utenti locali temporanei sono stati rimossi.

## Prossima azione

Implementare la gestione admin di eventi/catalogo. Eseguire anche il test
manuale autenticato della console CMS e del flusso lead. Seguire
`docs/ai/NEXT_STEPS.md`.

## Note ambiente

- `.env` locale e ignorato da Git; non copiare valori nella documentazione.
- Non eseguire reset o push su QUALITY/PROD.
- Reset password, SMTP custom e Google OAuth sono configurazioni successive.
