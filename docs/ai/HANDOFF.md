# Handoff

## Stato

Le fasi V2 e le revisioni successive sono implementate in DEV. L'ultima
revisione (DEC-063) rifinisce l'esperienza Utenti, Ranking e Notifiche:
elenco utenti a righe, profilo compatto con informazioni richiudibili,
galleria Ranking condivisa con l'app cliente e assegnazione contestuale dei
risultati, pagina notifiche con destinatario singolo. Non inserire
`IMPLEMENTAZIONE COMPLETATA`: restano verifiche manuali
autenticate, device fisici, contenuti e configurazioni remote.

## Ultimo lavoro

- `app/pages/admin/utenti/index.vue` mostra nickname, ruolo effettivo e azione
  profilo in righe ricercabili.
- `app/pages/admin/utenti/[id].vue` espone notifica e Ranking a Staff/Admin;
  ARCI e dentro le info, ruoli e ban soltanto ad Admin.
- `app/components/profile/Header.vue` rende identita e accordion Info chiuso
  per default, senza bordi ridondanti e con tre statistiche.
- `app/components/ranking/Gallery.vue` e condiviso da `/app/ranking` e
  `/admin/ranking`.
- `/admin/ranking/[id]` conserva l'utente scelto nella query oppure lo cerca
  per nickname; i tempi accettano `m:ss.mmm`.
- `server/api/admin/users/[id]/ban.post.ts` usa Supabase Auth Admin, impedisce
  l'auto-ban e registra l'audit.
- Punti VRSUS resta di sola lettura: l'inserimento operativo riguarda
  `game_scores`, non il ledger dei tornei.
- `/admin/notifiche` supporta tutti, presenti e singolo utente; la migration
  `20261006160000` estende la RPC mantenendo audit e idempotenza.

## Verifiche

- ESLint completo: PASS.
- Prettier completo: PASS.
- `nuxt typecheck`: PASS, warning noto Volar/vue-router.
- Vitest: PASS, 30/30 in 7 file.
- pgTAP: PASS, 321/321 in 15 file.
- Build Nuxt `node-server`: PASS.
- `git diff --check`: PASS, soli warning CRLF attesi su Windows.
- Prova manuale autenticata: PENDENTE.

## File principali

- `app/pages/admin/utenti/`
- `app/pages/admin/ranking/`
- `app/components/profile/Header.vue`
- `app/components/ranking/Gallery.vue`
- `app/components/ranking/PositionBadge.vue`
- `app/pages/admin/notifiche.vue`
- `supabase/migrations/20261006160000_single_user_manual_notifications.sql`
- `server/api/admin/users/`
- `shared/utils/ranking.ts`
- `docs/dev/guideline_test_features.md`

## Prossima azione

Eseguire in DEV le checklist "Utenti e assegnazione dei risultati ranking" e
"Invio manuale delle notifiche dalla console" con account Staff/Admin e due
utenti. Poi riprendere il test push QUALITY indicato in
`docs/ai/NEXT_STEPS.md`.

## Note ambiente

- La migration `20261006160000` e applicata in DEV locale, non ancora in QUALITY.
- `.env` locale e ignorato da Git; non copiare valori nella documentazione.
- Non eseguire reset o push distruttivi su QUALITY/PRODUCTION.
