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
- [ ] 7. Avviare Nuxt con `pnpm dev --host 127.0.0.1 --port 3000` e verificare
      `http://127.0.0.1:3000/`. L'host esplicito e necessario perche Nuxt
      risolve `localhost` su `::1`: se un altro processo occupa `::1:3000`,
      Nuxt ripiega su `3001` e l'URL non corrisponde piu ad `APP_BASE_URL` ne
      al `site_url` configurato in `supabase/config.toml`.

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

## DEV — Account di prova locali

**Stato:** CONFIGURATO in questo workspace il 2026-09-10.

`supabase/seed.sql` non crea utenti: le fixture contengono solo contenuti.
Per provare login, RBAC, console admin e area utente servono account DEV
creati localmente. Gli account esistono soltanto nel database Docker locale e
spariscono con `supabase db reset` o `supabase stop --no-backup`.

### Procedura

- [ ] 1. Creare l'utente con l'endpoint admin di Auth locale, usando la
      service-role key letta da `supabase status` e `"email_confirm": true`
      (in DEV non c'e SMTP reale, la conferma va forzata):

```text
POST http://127.0.0.1:54331/auth/v1/admin/users
apikey: <local-service-role-key>
Authorization: Bearer <local-service-role-key>
Content-Type: application/json

{"email":"<email>","password":"<password>","email_confirm":true,
 "user_metadata":{"display_name":"<nome>"}}
```

- [ ] 2. Il trigger `on_auth_user_created` crea automaticamente il profilo.
- [ ] 3. Assegnare il ruolo inserendo la coppia in `public.user_roles`; il
      primo `super_admin` va creato via SQL perche `set_user_role()` richiede
      gia un super-admin autenticato:

```sql
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u
join public.roles r on r.code = '<role-code>'
where u.email = '<email>'
on conflict do nothing;
```

- [ ] 4. I ruoli successivi possono essere gestiti da `/admin/utenti` con
      l'account super-admin.

Codici ruolo disponibili: `user`, `staff`, `tournament_admin`, `admin`,
`super_admin`.

I metadati utente accettati dal trigger di registrazione sono `nickname`,
`first_name`, `last_name` e `birth_date` (formato `YYYY-MM-DD`). Il nickname e
unico: se quello richiesto e gia preso il trigger aggiunge un suffisso invece
di far fallire la registrazione.

Per provare il flusso del consenso genitoriale conviene creare anche un account
con una data di nascita da minorenne.

### Verifica

Il login da `/login` deve portare a `/app` mostrando il ruolo corretto; un
account senza ruolo admin non deve poter aprire `/admin`.

### Note utente

Password e chiavi reali non vanno mai scritte in questo documento: usare
soltanto placeholder. Gli account DEV non vanno riusati in QUALITY o
PRODUCTION.

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

## Dati dimostrativi locali (facoltativi)

Servono solo in DEV, per guardare tabellone e gironi con numeri realistici.
Non fanno parte del seed e non vanno mai eseguiti in QUALITY o PRODUCTION.

### 1. Sedici utenti di prova

Si creano con l'Auth Admin API della propria istanza locale, cosi il trigger
`handle_new_user` popola `profiles` con nickname, nome, cognome e data di
nascita. Uno script di esempio:

```js
// node crea-utenti-demo.mjs, con SUPABASE_SERVICE_ROLE_KEY preso da .env
await fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { apikey: key, Authorization: `Bearer ${key}`,
             'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'lucabianchi@vrsus.local',
    password: '<password di prova>',
    email_confirm: true,
    user_metadata: { nickname: 'lucabianchi', first_name: 'Luca',
                     last_name: 'Bianchi', birth_date: '1998-03-14' },
  }),
})
```

### 2. La giornata dimostrativa

```bash
docker exec -i supabase_db_vrsus-dev psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 < supabase/dev/demo_showcase.sql
```

Lo script crea l'evento "VRSUS Showcase" in corso, tre postazioni con i loro
giochi, sedici prenotazioni, un torneo a eliminazione diretta concluso e un
girone giocato per due terzi. E ripetibile: cancella la propria giornata prima
di ricrearla. Richiede almeno un account admin e gli utenti del passo 1.

### Checklist

- [ ] utenti demo creati (16 profili con nickname, nome, cognome, nascita)
- [ ] script `demo_showcase.sql` eseguito senza errori
- [ ] la dashboard mostra "VRSUS Showcase" come evento in corso
- [ ] il torneo a eliminazione diretta mostra il tabellone completo
- [ ] il girone mostra la classifica ordinata per vittorie

## Tessera ARCI — decisioni del circolo

Il software non sa quando scade la tessera del vostro circolo: sa confrontare
una data. Servono due decisioni, entrambe dalla console, nessun servizio
esterno e nessuna chiave da configurare.

### 1. Data di rinnovo

Console -> `Impostazioni sito` -> riquadro **Tessere ARCI**. Il valore di
partenza e **1 ottobre**, che e l'inizio dell'anno associativo piu diffuso.
Scegliete giorno e mese effettivi e premete `Salva data`.

Da quel momento, ogni anno, tutte le tessere tornano da mostrare alla data
scelta: non serve ricordarsene, non c'e nessun lavoro schedulato da tenere
acceso. Una tessera risulta valida se lo staff l'ha vista dopo l'inizio della
stagione corrente, scritta in chiaro nel riquadro.

### 2. Azzeramento immediato

Sempre nello stesso riquadro, `Azzera tessere adesso` chiude la stagione al
momento: da subito ogni socio deve rimostrare la tessera. Si usa quando la
scadenza arriva prima del previsto o quando volete ripartire puliti. Chiede
conferma, lascia una riga di audit e **non cancella lo storico**: resta
registrato chi era socio la stagione prima.

### 3. Chi spunta le tessere

Chiunque abbia ruolo `staff`, `admin` o `super_admin`, in due punti:

- scheda utente (`Console -> Utenti e ruoli -> Scheda`), comando
  `Registra tessera ARCI` / `Revoca tessera`;
- check-in: dopo la scansione del QR, se la giornata richiede la tessera e il
  socio non ce l'ha, compare il comando `Tessera vista`.

L'utente non puo spuntarsi la tessera da solo: il database rifiuta la
scrittura da chi non e staff. Non viene richiesto il numero di tessera, solo
la conferma di averla vista: se in futuro servira registrarlo, va aggiunta una
colonna e un campo.

### 4. Eventi che non la richiedono

Ogni giornata nasce con **Tessera ARCI obbligatoria** attiva. Per compleanni,
giornate private e in generale per chi non apre al pubblico, togliete la
casella nel primo passo del wizard evento. La scelta e visibile in vetrina,
nella conferma della prenotazione, sul biglietto e al check-in.

### Checklist

- [ ] data di rinnovo confermata o corretta in `Impostazioni sito`
- [ ] eventi gia in calendario controllati: compleanni e giornate private
      senza obbligo di tessera
- [ ] prova di registrazione tessera su un account di test e revoca
- [ ] verificato che la vetrina dell'evento mostra "Tessera ARCI richiesta"

## Dati dimostrativi delle sfide (locale)

Le sfide (ranking) non nascono dal seed: senza almeno una, in app la tenda
"Postazione" mostra solo i Punti VRSUS. Per vedere la pagina con numeri veri:

```bash
docker exec -i supabase_db_vrsus-dev psql -U postgres -d postgres   -v ON_ERROR_STOP=1 < supabase/dev/demo_rankings.sql
```

Crea due sfide a tempo su Gran Turismo 7 e una a punteggio su Beat Saber, con
qualche record gia registrato sugli utenti demo. E ripetibile: cancella le
proprie sfide prima di ricrearle. In produzione le sfide si creano a mano dalla
pagina del gioco in console.

