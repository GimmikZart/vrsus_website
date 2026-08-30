# Guideline Implementations

Questo documento contiene le operazioni manuali necessarie per configurare,
eseguire, testare o distribuire il progetto quando non possono o non devono
essere svolte direttamente dall'agente AI.

## DEV — Supabase locale e variabili ambiente

**Stato:** CONFIGURATO in questo workspace il 2026-08-29.

**Serve per:** avviare il database DEV locale e fornire a Nuxt i valori
Supabase senza committare `.env` o credenziali.

### Procedura per un nuovo ambiente

- [ ] 1. Installare e avviare Docker Desktop.
- [ ] 2. Verificare Supabase CLI con `supabase --version`.
- [ ] 3. Eseguire `pnpm db:start` dalla root del repository.
- [ ] 4. Eseguire `supabase status` e copiare URL API, anon key e service-role
      key soltanto nel file locale.
- [ ] 5. Copiare `.env.example` in `.env` e valorizzare le variabili DEV.
- [ ] 6. Eseguire `pnpm db:reset` per applicare schema e fixture demo locali.
- [ ] 7. Avviare Nuxt con `pnpm dev` e verificare `http://127.0.0.1:3000/`.

### Variabili / valori richiesti

```text
APP_ENV=development
APP_BASE_URL=http://127.0.0.1:3000
NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
NUXT_PUBLIC_SUPABASE_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
```

- `APP_ENV`, `APP_BASE_URL`: configurazione non sensibile.
- `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`: PUBLIC; la key anon
  è soggetta a RLS e può essere usata dal browser.
- `SUPABASE_SERVICE_ROLE_KEY`: SERVER-ONLY e SECRET; non deve mai comparire
  in componenti client, log o repository.

### Porte locali

| Servizio | Porta |
| --- | --- |
| API Supabase | `54331` |
| PostgreSQL | `54332` |
| Studio | `54333` |
| Inbucket web | `54334` |
| Inbucket SMTP | `54335` |

Analytics locale è disabilitato intenzionalmente per evitare conflitti di
porta con altri stack Supabase presenti nella workstation.

### Verifica

`supabase status` deve mostrare i servizi locali attivi; `pnpm db:test` deve
passare; `pnpm dev` deve caricare la landing senza warning di URL/key mancanti.
Studio è disponibile su `http://127.0.0.1:54333`.

### Note utente

Per QUALITY e PROD usare i progetti remoti separati definiti nella specifica;
non riutilizzare le credenziali DEV e non committare `.env`. Le fixture di
`supabase/seed.sql` sono esclusivamente fittizie e locali.

## Supabase Storage — asset CMS

**Stato:** CONFIGURATO in DEV locale il 2026-08-29.

La migration `20260829230000_storage_assets.sql` crea il bucket pubblico
`vrsus-assets` con limite di 5 MB e MIME type immagine consentiti. La lettura è
pubblica per gli asset pubblicati; upload, modifica e cancellazione richiedono
un ruolo `admin` o `super_admin`. Le console CMS memorizzano nel database solo
il path dell'oggetto, mai una credenziale o un URL segreto.

### Operazioni per QUALITY/PROD

- [ ] 1. Applicare la migration al progetto Supabase remoto corretto tramite il
      workflow di deploy approvato; non usare `db reset` su QUALITY/PROD.
- [ ] 2. Verificare nel dashboard Storage il bucket `vrsus-assets`, la lettura
      pubblica e il limite di 5 MB.
- [ ] 3. Verificare che le policy di insert/update/delete restino limitate ai
      ruoli admin e super-admin.
- [ ] 4. Configurare nell'app solo le variabili del progetto remoto indicato
      dall'ambiente; le chiavi restano nel secret manager o nel provider di
      deploy e non vanno inserite nei documenti.
- [ ] 5. Eseguire il test manuale dell’upload descritto in
      `docs/dev/guideline_test_features.md`.

## QUALITY/PRODUCTION — integrazioni esterne e deploy

**Stato:** USER ACTION REQUIRED.

L’agente ha preparato migrazioni, UI, adapter e checklist, ma non deve usare o
inventare credenziali di progetti remoti, provider push, DNS o secret manager.

- [ ] 1. Creare/verificare i progetti Supabase QUALITY e PRODUCTION separati,
      applicando le migration con il workflow approvato; non usare `db reset`.
- [ ] 2. Configurare nel secret manager `NUXT_PUBLIC_SUPABASE_URL`,
      `NUXT_PUBLIC_SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_ENV` e
      `APP_BASE_URL` per il rispettivo ambiente.
- [ ] 3. Configurare Cloudflare Pages/Workers con preset compatibile e dominio
      corretto; verificare HTTPS, redirect e variabili runtime.
- [ ] 4. Creare/verificare il progetto OneSignal e il sito web origin corretto;
      salvare App ID e REST API key esclusivamente nei secret del provider.
- [ ] 5. Impostare `NUXT_PUBLIC_ONESIGNAL_APP_ID` come variabile PUBLIC e
      `ONESIGNAL_REST_API_KEY` come SERVER-ONLY/SECRET. Non inserire la REST API
      key in `.env` committati, bundle client o documentazione.
- [ ] 6. Verificare l'abilitazione push da `/app/notifiche` e il flusso `Call
      players`: il record `notifications` deve restare disponibile anche se la
      chiamata OneSignal fallisce; gli errori sono restituiti/loggati dall'adapter.
- [ ] 7. Eseguire la suite manuale QUALITY, inclusi installazione PWA,
      fotocamera/QR, test multiutente e verifica privacy.

### Verifica

La configurazione è completa solo quando i checklist di deploy e test QUALITY
sono compilati dal responsabile dell’ambiente. Nessun valore reale va inserito
qui o committato nel repository.
