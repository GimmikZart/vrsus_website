# Handoff

## Stato

Phase 10 e implementata nel repository e verificata automaticamente. V1 copre
eventi, prenotazioni, waiting list, QR, check-in, live admin e PWA; V2 copre
tornei, iscrizioni, check-in torneo, bracket single-elimination, risultati,
realtime, notifiche in-app/push e ranking. Sono inclusi anche duplicazione e
archiviazione eventi, gestione no-show e guardie database delle transizioni.
Restano test manuali su dispositivi/account,
contenuti reali e configurazione remota QUALITY/PRODUCTION. Non inserire
`IMPLEMENTAZIONE COMPLETATA` finché questi gate non sono chiusi.

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
- Pagine pubbliche `/esperienze`, `/esperienze/[slug]`, `/news`, `/servizi` e
  relativi dettagli da view Supabase pubblicate; `/regolamento` esplicita
  l'attesa del testo ufficiale.
- Console `/admin/news` e `/admin/servizi` per authoring e pubblicazione protetti
  da middleware, ruolo e RLS.
- Form pubblico servizi, endpoint server validato e console `/admin/richieste`
  per gestione stato/note interne.
- Console `/admin/eventi` per gestione di base degli eventi e capienza privata.
- Console `/admin/catalogo` per gestione globale di attività, postazioni e
  categorie.
- Configurazione `/admin/eventi/[id]` per selezione e associazione many-to-many
  tra attività e postazioni.
- Override per evento di contenuti, capienze, visibilità, stato, orari e access
  mode.
- Bucket `vrsus-assets` e componente uploader CMS per news, servizi, eventi e
  catalogo; le policy storage consentono scritture soltanto ai ruoli admin.
- `robots.txt`, sitemap dinamica e JSON-LD evento.
- `supabase/migrations/20260830100000_booking_workflows.sql` per booking, QR,
  waiting list, check-in e pagamento.
- `supabase/migrations/20260830110000_tournament_v2.sql` per tornei, bracket,
  risultati, notifiche collegate e ranking ledger.
- `supabase/migrations/20260830120000_v2_operations_push.sql` per stato
  check-in, operazioni match, notifiche applicative, preferenze/subscription
  push, ranking per attività e correzioni auditabili.
- `app/pages/tornei/`, `app/pages/ranking.vue`, `app/pages/admin/tornei/` e
  `app/pages/admin/ranking.vue`, `app/pages/app/notifiche.vue` per le superfici
  V2; `server/utils/push-provider.ts` contiene l'adapter OneSignal.
- `app/pages/app/eventi.vue`, `app/pages/app/tornei.vue`,
  `app/pages/app/tornei/[id].vue`, `app/pages/app/profilo.vue` e
  `app/pages/admin/impostazioni/index.vue` completano le route protette
  previste dal contratto.
- `supabase/migrations/20260830130000_public_capacity_projection.sql` mantiene
  privati i dati grezzi di capienza e pubblica solo lo stato consentito dalla
  configurazione dell'evento.
- `supabase/migrations/20260830140000_booking_notifications_no_show.sql` aggiunge
  il no-show staff/admin con revoca QR e audit.
- `supabase/migrations/20260830150000_event_admin_workflows.sql` aggiunge
  duplicazione/archiviazione evento con copia delle associazioni e audit.
- `supabase/migrations/20260830160000_state_machine_guards.sql` applica le
  transizioni operative e corregge l'avanzamento dei bye nel bracket.

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
build e 169 test pgTAP sono PASS; il warning Volar/vue-router non è bloccante.
Gli E2E storici restano PASS, mentre i nuovi journey V1/V2 richiedono test
manuale autenticato.

## Verifica conclusiva 2026-08-30

Lint, format, typecheck, unit, build standard, build Cloudflare, E2E seriale
(7/7) e la suite aggiornata da 169 test pgTAP sono PASS. Restano test manuali
autenticati su account/device e la configurazione QUALITY/PRODUCTION dei
servizi esterni.

## Prossima azione

Eseguire i test manuali booking/QR/check-in/live/tornei/notifiche/PWA, poi
completare i test CMS e asset e configurare QUALITY seguendo le checklist.
Seguire
`docs/ai/NEXT_STEPS.md`.

## Note ambiente

- `.env` locale e ignorato da Git; non copiare valori nella documentazione.
- Non eseguire reset o push su QUALITY/PROD.
- Reset password, SMTP custom e Google OAuth sono configurazioni successive.
