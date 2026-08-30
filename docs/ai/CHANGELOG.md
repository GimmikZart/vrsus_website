# Changelog

## 2026-08-29

- Bootstrap Nuxt 4 VRSUS completato.
- Landing pubblica e route `/evento` aggiunte.
- Toolchain, test, PWA, Supabase CLI e build Cloudflare configurati.
- Documentazione di stato e handoff aggiornata.
- Foundation database V1, RLS, tipi generati e test pgTAP aggiunti.
- Stack Supabase DEV locale configurato su porte dedicate e avviato con Docker.
- Login email/password, sessione SSR, middleware auth/RBAC e route `/app` e
  `/admin` aggiunti.
- Gestione ruoli super-admin con RPC auditabile, endpoint server e pagina
  `/admin/utenti` aggiunta.

## 2026-08-30

- Booking V1 completato con waiting list FIFO, QR hash-only, check-in
  idempotente, pagamento sul posto e dashboard live.
- Aggiunta inbox notifiche utente.
- Tournament V2 completato con iscrizione, check-in, bracket
  single-elimination, risultati e ranking ledger.
- Aggiunte route pubbliche tornei/ranking e console admin torneo.
- Aggiunto fallback offline PWA e checklist manuali per V1/V2/QUALITY.
- Completata estensione V2: stato check-in, assegnazione postazione, chiamata
  giocatori, avvio match, modifica score auditabile e realtime bracket.
- Aggiunto adapter OneSignal server-side con preferenze e fallback inbox,
  ranking per attività, riepilogo personale e adjustment admin auditabile.
- Aggiunta la console `/admin/ranking` per applicare gli adjustment senza
  modificare lo storico dei tornei.
- Aggiunti test pgTAP per operazioni/push e torneo demo a 8 partecipanti; suite
  locale aggiornata a 122 test.
- Completate le route protette area utente per eventi, tornei e profilo e la
  console admin `/admin/impostazioni` per `site_settings`.
- Aggiunta regression E2E sui redirect anonimi; suite Chromium aggiornata a 7
  test.
- Aggiunto il dettaglio pubblico `/esperienze/[slug]` con canonical, fallback
  visuale e test E2E indice -> dettaglio.
- Corretta la proiezione pubblica della capienza: `hidden` non espone segnali,
  `status` espone solo lo stato derivato, `exact` espone confermati/capienza;
  aggiunti 11 test pgTAP dedicati, per un totale di 133.
- Aggiunti workflow admin per duplicazione e archiviazione eventi, con copia
  delle associazioni e audit senza duplicare prenotazioni o check-in.
- Aggiunta gestione `no_show` in `/admin/live`, con revoca QR e audit.
- Aggiunte guardie database delle transizioni operative e corretto il calcolo
  dei bye nei bracket single-elimination; suite aggiornata a 169 test pgTAP.
