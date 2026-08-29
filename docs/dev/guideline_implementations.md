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
