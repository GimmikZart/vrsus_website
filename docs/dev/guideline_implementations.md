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

### Conferma email in locale

Dal 2026-09-15 `supabase/config.toml` ha `enable_confirmations = true`, come il
progetto remoto. Un account appena registrato **non** e utilizzabile finche non
si apre il link di conferma.

In locale le mail non escono davvero: si leggono da
`http://127.0.0.1:54334`. Il link porta a `/confirm`, che apre la sessione e
manda in bacheca.

Per creare un account gia confermato senza passare dalla mail, usare
l'endpoint admin con `"email_confirm": true`, come nella procedura degli
account di prova.

### Versione di PostgreSQL

La CLI Supabase dalla 2.117 avvia soltanto PostgreSQL 17 e **ignora**
`major_version` in `config.toml`. Un volume creato con PostgreSQL 15 non
riparte piu: il container resta `unhealthy` con
`database files are incompatible with server`.

Se dovesse ricapitare su un'altra workstation, i dati non sono persi: il volume
si rimonta con l'immagine vecchia e si salva prima di ricreare lo stack.

```bash
docker run -d --name pg15_rescue -e POSTGRES_PASSWORD=postgres   -v supabase_db_<progetto>:/var/lib/postgresql/data   public.ecr.aws/supabase/postgres:15.8.1.085
docker exec pg15_rescue pg_dumpall -U postgres > supabase/.temp/backup.sql
```

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

### Attivazione completa delle notifiche (2026-10-02)

L'inbox funziona senza OneSignal. Per ricevere **ogni** nuova riga di
`public.notifications` anche come push occorrono l'app OneSignal, le variabili
Cloudflare e un Database Webhook Supabase. Le notifiche di prenotazione e
iscrizione sono create da trigger SQL: senza il webhook arrivano nell'inbox ma
non possono avviare da sole una chiamata HTTP a OneSignal. Il codice del sito
e la migration sono gia preparati; i valori seguenti appartengono ai rispettivi
account esterni e devono essere inseriti dal proprietario.

1. In OneSignal creare un'app **Web Push QUALITY** con Site URL uguale
   all'origine HTTPS esatta della PWA di test (per esempio
   `https://vrsus-app.pages.dev`, senza percorso). In **Settings → Keys & IDs**
   copiare App ID e REST API Key. Usare app separate per QUALITY e PRODUCTION,
   cosi un test non raggiunge dispositivi reali. Per DEV locale creare una terza
   app riferita all'origine locale effettivamente aperta nel browser.
2. Applicare sul Supabase QUALITY le migration ancora pendenti, comprese
   `20261002103000_notifications_realtime.sql` e
   `20261002104000_push_subscription_owner_guard.sql` e
   `20261002105000_manual_notifications.sql`, usando il normale
   workflow `supabase db push` verso il progetto esplicitamente collegato.
   Non usare `db reset` sul progetto remoto. Controllare in **Database →
   Publications → supabase_realtime** che `public.notifications` sia presente.
3. In Cloudflare Pages, impostare per l'ambiente di test e ridistribuire:
   `NUXT_PUBLIC_ONESIGNAL_APP_ID` = App ID (**PUBLIC**),
   `ONESIGNAL_REST_API_KEY` = REST API Key (**SERVER-ONLY / SECRET**),
   `NOTIFICATION_WEBHOOK_SECRET` = stringa casuale lunga almeno 32 caratteri
   (**SECRET**), `APP_BASE_URL` = origine HTTPS della PWA (**PUBLIC**):
   `https://vrsus-app.pages.dev` per la beta attuale.
   Inserire i secret nelle variabili protette, mai nel repository. Verificare
   che `https://<origine>/onesignal/OneSignalSDKWorker.js` restituisca
   JavaScript; il worker ha uno scope separato da quello offline della PWA.
4. In **Supabase QUALITY → Database → Webhooks**, creare un solo webhook
   `notifications_push`: tabella `public.notifications`, evento **INSERT**,
   metodo **POST**, URL
   `https://vrsus-app.pages.dev/api/notifications/webhook`, header
   `Content-Type: application/json` e header
   `x-vrsus-webhook-secret` con lo stesso secret di Cloudflare. Il payload
   standard di Supabase include `record.id`; il server rilegge la riga dal DB
   e non si fida di titolo, destinatario o testo nel payload. Limitare
   l'accesso amministrativo al webhook, perche il suo header contiene un
   secret. In locale l'URL del webhook e
   `http://host.docker.internal:3000/api/notifications/webhook` (il database
   e in Docker, quindi `localhost` indicherebbe il container).
5. Con due account cliente distinti, aprire la PWA QUALITY sul dispositivo A,
   entrare in `/app/notifiche`, premere **Abilita push** e accettare il
   permesso. Su iPhone/iPad aprire la PWA installata dalla schermata Home
   (iOS/iPadOS 16.4 o successivo): la scheda Safari non riceve web push come
   una PWA installata. Verificare in OneSignal **Audience → Subscriptions** che il
   dispositivo sia `Subscribed`. Nel Supabase QUALITY verificare che
   `push_subscriptions.user_id` sia l'ID dell'account A e
   `notification_preferences.push_enabled = true`. Non copiare qui gli ID.
6. Da una console con ruolo `tournament_admin`/`admin`, chiamare una partita
   che includa A e non B, oppure creare un evento di prova che produca una
   notifica. Lasciare la PWA aperta per vedere il badge e la inbox aggiornarsi
   senza refresh; poi metterla in background per verificare la push. B non
   deve ricevere nulla. Controllare **Database → Webhooks → Logs** in Supabase
   e **Delivery → Sent Messages** in OneSignal se la push non arriva. Una
   risposta `configured: false` indica credenziali mancanti sul server;
   `recipientCount: 0` indica preferenza/dispositivo non attivo.
7. Premere **Segna tutte come lette** e verificare che il badge sparisca anche
   su un secondo dispositivo collegato allo stesso utente. Poi provare
   **Disabilita push** e **Esci**: il device non deve ricevere nuove push.

Per DEV locale usare le stesse tre variabili in `.env` non committato,
aggiungendo `NOTIFICATION_WEBHOOK_SECRET`; riavviare Nuxt dopo la modifica.
L'origine OneSignal deve coincidere con quella usata dal browser. La push su
un dispositivo remoto richiede la PWA HTTPS di QUALITY; `127.0.0.1` non e
raggiungibile dal telefono. La URL del worker e
`/onesignal/OneSignalSDKWorker.js` in tutti gli ambienti.

- [ ] OneSignal QUALITY creato con origine corretta; App ID e API Key recuperati.
- [ ] Migration applicate su Supabase QUALITY e publication verificata.
- [ ] Variabili Cloudflare impostate, deploy terminato e worker raggiungibile.
- [ ] Webhook INSERT protetto configurato e chiamate riuscite visibili nei log.
- [ ] Test A/B su push, badge Realtime, inbox e lettura completato.

### Verifica

La configurazione è completa solo quando i checklist di deploy e test QUALITY
sono compilati dal responsabile dell’ambiente. Nessun valore reale va inserito
qui o committato nel repository.

### Correzione dell'origine QUALITY (2026-10-02)

L'URL reale fornito per la PWA e `https://vrsus-app.pages.dev/app/notifiche`.
Le vecchie istruzioni indicavano per errore `vrsus-website.pages.dev`.
Per questo ambiente tutti i riferimenti devono usare l'origine
`https://vrsus-app.pages.dev` (senza `/app/notifiche`):

1. In **OneSignal → Settings → Push & In-App → Web**, selezionare
   **Custom Code** e impostare **Site URL** su
   `https://vrsus-app.pages.dev`. Mantenere l'App ID della stessa app nella
   variabile Cloudflare `NUXT_PUBLIC_ONESIGNAL_APP_ID`. Salvare.
2. In **Cloudflare Pages → Settings → Variables and Secrets**, impostare
   `APP_BASE_URL=https://vrsus-app.pages.dev` nell'ambiente del deploy usato
   dalla PWA e avviare un nuovo deploy. Le variabili `ONESIGNAL_REST_API_KEY`
   e `NOTIFICATION_WEBHOOK_SECRET` devono essere **Secret**, non Text.
3. In **Supabase → Database Webhooks → notifications_push**, cambiare l'URL in
   `https://vrsus-app.pages.dev/api/notifications/webhook`. Verificare
   **INSERT**, POST e l'header `x-vrsus-webhook-secret` uguale al secret
   Cloudflare. Salvare. Il webhook serve alla consegna delle push dopo la
   creazione delle notifiche; non interviene nella pressione di Abilita push.
4. Aprire nel browser
   `https://vrsus-app.pages.dev/onesignal/OneSignalSDKWorker.js`: deve
   apparire la riga `importScripts(...)`, senza login o pagina HTML. Poi
   aggiornare la PWA e riprovare Abilita push. In caso di errore, leggere il
   messaggio specifico della nuova versione e la console del browser.
   Se la pagina mostra un avviso con origine pagina e APP_BASE_URL diversi,
   usare quei valori per individuare l'ambiente Cloudflare ancora errato.
   L'avviso non blocca piu l'attivazione delle push.

- [ ] Site URL OneSignal corretto e App ID corrispondente.
- [ ] APP_BASE_URL corretto e nuovo deploy Cloudflare completato.
- [ ] URL webhook corretto e secret header verificato.
- [ ] Worker pubblico verificato e dispositivo visibile in OneSignal.

## BETA — deploy su Cloudflare Pages

**Stato:** USER ACTION REQUIRED.

**Serve per:** avere l'app su un URL HTTPS pubblico (`*.pages.dev`) che si
ridistribuisce da solo a ogni push su `main`, cosi da provarla con altre
persone, su telefono, con PWA e fotocamera funzionanti. HTTPS non e un
dettaglio: senza, il browser non installa la PWA e non apre la fotocamera per
lo scanner QR, quindi la prova in rete locale non copre quelle due funzioni.

L'hosting e Cloudflare Pages per decisione della specifica tecnica (sezione
Hosting) e la build con quel preset e gia verificata (`docs/ai/TEST_REPORT.md`).
Il piano free di Cloudflare consente l'uso commerciale; il piano Hobby di
Vercel no, ed e la ragione per cui non e un'alternativa per questo progetto.

### Prerequisiti

- Repository GitHub raggiungibile (`GimmikZart/vrsus_website`).
- Un account Cloudflare (basta email e password, nessuna carta).
- Progetto Supabase remoto gia creato, con le migration applicate.

In beta il progetto Supabase remoto e uno solo. La separazione QUALITY /
PRODUCTION prevista dalla specifica resta da fare prima dell'apertura al
pubblico: fino ad allora il deploy Cloudflare punta a quell'unico progetto.

### Procedura

- [ ] 1. Accedere a `dash.cloudflare.com`, sezione **Workers & Pages**, e
      creare un'applicazione di tipo **Pages** collegata a GitHub. Autorizzare
      Cloudflare sul repository `vrsus_website` e scegliere `main` come
      **Production branch**.
- [ ] 2. Impostare i **Build settings**:
      - Framework preset: `Nuxt.js` oppure `None` (le voci sotto valgono in
        entrambi i casi e vanno verificate una per una);
      - Build command: `pnpm run build:cloudflare`;
      - Build output directory: `dist`;
      - Root directory: vuota.
- [ ] 3. Aggiungere fra le variabili di build `NODE_VERSION` = `22.21.1`
      (stesso valore di `.nvmrc`). Senza, l'immagine di build usa una versione
      diversa da quella provata in locale.
- [ ] 4. Inserire le variabili d'ambiente dell'ambiente **Production** secondo
      la tabella sotto. Marcare come **Secret** (valore cifrato, non piu
      visibile) `SUPABASE_SERVICE_ROLE_KEY` e `ONESIGNAL_REST_API_KEY`.
- [ ] 5. Avviare il primo deploy e annotare l'URL assegnato, nella forma
      `https://<nome-progetto>.pages.dev`.
- [ ] 6. Tornare nelle variabili e correggere `APP_BASE_URL` con l'URL reale
      appena ottenuto, poi rilanciare il deploy (**Retry deployment**): il
      valore serve a costruire i link assoluti e non e noto prima del passo 5.
- [ ] 7. In **Settings** -> **Functions** (o **Runtime**) aggiungere il
      compatibility flag `nodejs_compat` sia per Production sia per Preview, e
      una compatibility date pari o successiva a `2024-09-23`. E il flag che
      risolve il warning "Node compatibility" visto nei build report.
- [ ] 8. Nel dashboard Supabase, **Authentication** -> **URL Configuration**:
      impostare `Site URL` su `https://<nome-progetto>.pages.dev` e aggiungere
      ai **Redirect URLs** `https://<nome-progetto>.pages.dev/**`.

      Servono **entrambi** e non e un dettaglio: e il motivo per cui le mail di
      conferma puntavano a `localhost:3000`. L'applicazione chiede il ritorno
      su `/confirm` (`emailRedirectTo`), ma Supabase accetta un indirizzo di
      ritorno solo se compare fra i Redirect URLs; se non c'e, lo scarta e usa
      `Site URL`, che di suo resta quello di sviluppo. Il carattere jolly
      finale serve perche l'indirizzo di ritorno ha un percorso.
- [ ] 9. Quando OneSignal verra configurato, impostare come origin del sito lo
      stesso URL `*.pages.dev` e valorizzare le due variabili push.
- [ ] 10. Facoltativo: collegare anche il branch `quality` come preview. Le
      preview hanno un alias stabile `https://quality.<nome-progetto>.pages.dev`
      e variabili proprie, quindi possono puntare a un secondo progetto
      Supabase quando esistera.

### Variabili / valori richiesti

| Variabile | Tipo | Valore |
| --- | --- | --- |
| `APP_ENV` | PUBLIC | `quality` in beta, `production` all'apertura |
| `APP_BASE_URL` | PUBLIC | `https://<nome-progetto>.pages.dev` |
| `NUXT_PUBLIC_SUPABASE_URL` | PUBLIC | URL del progetto Supabase remoto |
| `NUXT_PUBLIC_SUPABASE_KEY` | PUBLIC | anon key del progetto remoto |
| `SUPABASE_SERVICE_ROLE_KEY` | SECRET | service role key del progetto remoto |
| `NUXT_PUBLIC_ONESIGNAL_APP_ID` | PUBLIC | App ID OneSignal, vuoto finche non c'e |
| `ONESIGNAL_REST_API_KEY` | SECRET | REST API key OneSignal, vuota finche non c'e |
| `NODE_VERSION` | build | `22.21.1` |

Sono gli stessi nomi di `.env.example`: `nuxt.config.ts` li legge da
`process.env` durante la build, e Cloudflare espone le variabili al processo di
build, quindi finiscono nel `runtimeConfig` del worker generato. La service
role key resta dentro `_worker.js`, che non e codice pubblico, ma cambiarla
richiede un nuovo deploy.

Per sostituire un valore **senza ricompilare** servono invece i nomi che Nitro
cerca a runtime, derivati dalle chiavi di `runtimeConfig`. Attenzione alla
conversione, che spezza `oneSignal` in due parole:

```text
NUXT_PUBLIC_APP_ENV
NUXT_PUBLIC_APP_BASE_URL
NUXT_PUBLIC_SUPABASE_URL
NUXT_PUBLIC_SUPABASE_KEY
NUXT_SUPABASE_SERVICE_ROLE_KEY
NUXT_PUBLIC_ONE_SIGNAL_APP_ID
NUXT_ONE_SIGNAL_REST_API_KEY
```

`NUXT_PUBLIC_ONESIGNAL_APP_ID` (senza lo stacco) funziona solo perche
`nuxt.config.ts` lo legge esplicitamente a build time: come override a runtime
non verrebbe visto.

### Verifica

1. La build su Cloudflare termina senza errori e pubblica un URL `*.pages.dev`.
2. La home carica in HTTPS e mostra i contenuti del Supabase remoto, non i
   segnaposto vuoti: se le card sono vuote, le variabili Supabase non sono
   arrivate alla build.
3. Registrazione e login funzionano da un dispositivo diverso dalla
   workstation, e la mail di conferma rimanda al dominio `*.pages.dev`.
4. Una pagina della console (`/admin`) risponde: e la prova che gli endpoint
   `server/api/**` girano davvero e che la service role key e configurata.
5. Da telefono: il browser propone l'installazione della PWA e lo scanner QR
   del check-in apre la fotocamera.
6. Un push su `main` produce un nuovo deploy automatico.

### Limiti noti del piano free

Il piano free di Cloudflare Workers concede **10 ms di CPU per richiesta**.
L'attesa su Supabase non conta (e I/O), ma il render SSR di una pagina pesante
puo superarli e restituire errore 1102 / "Exceeded CPU limit". Se succede in
modo sistematico le strade sono due: alleggerire il render lato server, oppure
passare a Workers Paid (5 $/mese).

Il progetto non e legato a Cloudflare: Nitro genera l'output dal preset, quindi
un eventuale spostamento su Netlify (free, uso commerciale consentito, runtime
Node senza quel limite di CPU) richiede di cambiare preset di build e
ricollegare il repository, non di toccare il codice applicativo.

### Note utente

Le credenziali vivono solo nel dashboard del provider. Non vanno inserite in
questo documento, nei file `.env` committati o nei messaggi di commit.

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

