# Technical Decisions

Le decisioni architetturali di base sono nella Technical Specification. Questo
file registra solo decisioni aggiuntive persistenti prese durante il lavoro.

## DEC-001 — Ambiente DEV locale con Supabase CLI

**Status:** Accepted

### Decisione

Lo sviluppo locale usa Supabase CLI e Docker con `supabase/config.toml` nella
root del progetto. QUALITY e PROD restano progetti Supabase remoti separati.

### Motivazione

La strategia mantiene stesso codice e migration tra ambienti, consente reset
riproducibili e impedisce di usare credenziali remote durante lo sviluppo.

### Conseguenze

Le feature database richiedono Docker e `.env` locale. Le variabili pubbliche
possono arrivare al client; il service role resta esclusivamente server-only.

## DEC-002 — Typecheck come gate dedicato

**Status:** Accepted

### Decisione

Nuxt mantiene `typescript.typeCheck: false` durante il bundling; il controllo
TypeScript viene eseguito esplicitamente tramite `pnpm typecheck`.

### Motivazione

Il checker Vite watcher della combinazione corrente Nuxt/vue-tsc produceva
`TS5042` in build, mentre `nuxt typecheck` dedicato passa correttamente.

### Conseguenze

CI e sviluppo devono eseguire entrambi `pnpm typecheck` e `pnpm build`; la build
non va considerata sufficiente a dimostrare l'assenza di errori TypeScript.

## DEC-003 — Redirect Supabase disabilitato sulle pagine pubbliche

**Status:** Accepted

### Decisione

Il redirect auth globale di `@nuxtjs/supabase` resta disabilitato nel bootstrap
pubblico. Le aree protette future definiranno middleware e policy per ruolo.

### Motivazione

Landing, SEO e pagina evento devono essere accessibili senza autenticazione.

### Conseguenze

Quando saranno introdotte console staff o account, l'accesso dovra essere
protetto esplicitamente sulle route interessate e verificato con RLS.

## DEC-004 — Porte Supabase locali dedicate a VRSUS

**Status:** Accepted

### Decisione

L'istanza DEV locale usa API `54331`, database `54332`, Studio `54333`,
Inbucket `54334` e SMTP Inbucket `54335`. Analytics locale resta disabilitato.

### Motivazione

Le porte predefinite erano già utilizzate da altri stack Supabase locali nella
workstation di sviluppo. La configurazione evita conflitti senza influire su
QUALITY o PROD.

### Conseguenze

`.env.example`, test E2E e documentazione devono riferirsi all'API `54331`.
I comandi Supabase restano identici perché le porte sono definite in
`supabase/config.toml`.

## DEC-005 — Contratti pubblici Supabase tramite view sicure

**Status:** Accepted

### Decisione

Le letture browser pubbliche di eventi, stazioni e attività avvengono tramite
view `public_*`; le tabelle raw non ricevono grant diretti ad `anon` e
`authenticated` quando includono campi non pubblici.

### Motivazione

Capacity, visibilità della capacity, note amministrative e token QR non devono
diventare esposti per errore in query future o payload REST.

### Conseguenze

Le feature pubbliche devono usare le view previste. Le operazioni proprietarie
o staff passano da RLS/RPC/server code strettamente autorizzati.

## DEC-006 — Cookie SSR Supabase rinviati alla Phase 2

**Status:** Superseded by DEC-007

### Decisione

`useSsrCookies` è disabilitato nel bootstrap pubblico. La sessione SSR verrà
abilitata e verificata insieme ai middleware autenticati della Phase 2.

### Motivazione

La landing pubblica non richiede una sessione e il round-trip auth SSR ha
aggiunto latenza durante l'avvio locale prima che esistessero route protette.

### Conseguenze

La Phase 2 ha riesaminato questa impostazione e l'ha sostituita con DEC-007.

## DEC-007 — Cookie SSR attivi per le route autenticate

**Status:** Accepted

### Decisione

`useSsrCookies` è abilitato per permettere a Nuxt di leggere la sessione
Supabase durante il rendering server-side delle route protette. Il redirect
globale resta disabilitato: `/app` e `/admin` usano middleware espliciti.

### Motivazione

La Phase 2 richiede che sessione e autorizzazione siano applicate anche durante
le richieste SSR, prima che il markup di una pagina privata venga restituito.

### Conseguenze

Le route protette devono restare coperte da middleware e test E2E. Le API
server-side devono usare la sessione Supabase e RLS; il service-role key non va
mai usato per sostituire l'autorizzazione dell'utente.

## DEC-008 — Letture pubbliche eventi tramite composable tipizzato

**Status:** Accepted

### Decisione

Le pagine pubbliche degli eventi usano un composable client-side/SSR tipizzato
che interroga esclusivamente `public_events` e le view `public_event_*`. Il
frontend non interroga direttamente le tabelle raw per il contenuto pubblico.

### Motivazione

La stessa regola di esposizione deve valere durante SSR, navigazione client e
rendering del catalogo. Centralizzare query e formattazione riduce il rischio di
esporre accidentalmente capienza, note interne o altri campi non pubblici.

### Conseguenze

Nuove pagine pubbliche devono riusare i tipi generati e le view pubbliche. Se un
contenuto non ha ancora una view pubblica, va prima definito il relativo
contratto database e testato con RLS.

## DEC-009 — Contenuti editoriali pubblici tramite projection view

**Status:** Accepted

### Decisione

Le pagine pubbliche di esperienze, news e servizi interrogano esclusivamente le
view `public_activities`, `public_news_posts` e `public_service_pages`. Le view
filtrano i record con stato `published` e non espongono i campi editoriali
interni non necessari al sito pubblico.

### Motivazione

Il contenuto pubblico deve avere un contratto separato dalle tabelle raw del CMS:
questo rende esplicito il filtro di pubblicazione, mantiene RLS e permette di
aggiungere campi interni senza ampliare accidentalmente l'API browser.

### Conseguenze

La console amministrativa futura dovra scrivere sulle tabelle CMS protette e le
route pubbliche dovranno continuare a usare i tipi generati dalle projection
view. I fixture DEV sono contenuti tecnici temporanei e non copy di produzione.

## DEC-010 — Authoring CMS browser-side con RLS

**Status:** Accepted

### Decisione

La prima console CMS per news e servizi usa il client Supabase autenticato dal
browser per leggere e scrivere le tabelle raw, mentre middleware di ruolo e
policy RLS limitano l'accesso a `admin` e `super_admin`. Il service-role key non
viene usato per l'authoring editoriale.

### Motivazione

Le tabelle CMS hanno gia policy `admin_manage_*` e vincoli database sufficienti
per il CRUD strutturato della V1. Mantenere il service role fuori da questo
flusso riduce la superficie server-only e lascia alla futura API server solo le
operazioni che richiedono davvero privilegi elevati o side effect esterni.

### Conseguenze

Ogni nuova azione CMS deve rispettare RLS e validazione database; il frontend non
puo considerare la visibilita del pulsante una misura di sicurezza. Pubblicazione
e attivazione diventano effettive nelle projection view solo dopo il salvataggio.

## DEC-011 — Lead servizi tramite endpoint server dedicato

**Status:** Accepted

### Decisione

Le richieste dai dettagli servizio passano da `POST /api/services/inquiries`.
L'endpoint valida i dati, verifica che il servizio indicato sia attivo e usa il
service role soltanto server-side per inserire il lead; anon e authenticated non
possono leggere o inserire direttamente `service_inquiries` tramite RLS.

### Motivazione

I lead sono dati di contatto e non devono diventare una tabella pubblica del
client Supabase. Un endpoint dedicato consente validazione uniforme, anti-bot
minimo e un punto unico per aggiungere in futuro rate limit, notifiche o
integrazioni email.

### Conseguenze

Il frontend riceve solo un esito `ok` e non dati di lead. La console admin legge
e aggiorna le richieste con la sessione autenticata e le policy di ruolo; le
note interne non vengono mai incluse nelle projection view pubbliche.

## DEC-012 — Punteggio ranking V2 derivato dal ledger

**Status:** Accepted

### Decisione

Il primo formato torneo assegna 100 punti al vincitore e 60 al secondo
classificato. I punti vengono inseriti da `record_match_result` al completamento
della finale e protetti da un indice univoco per torneo, utente e motivo.

### Motivazione

La regola minima è deterministica, comprensibile nella beta e rende il risultato
idempotente senza introdurre una cache totale dei punteggi. Le future regole per
partecipazione, piazzamenti o attività possono aggiungere nuovi reason code senza
modificare i risultati storici.

### Conseguenze

La classifica pubblica deriva da `public_ranking`; ogni correzione passa da una
nuova procedura auditabile e non da una modifica manuale di un totale aggregato.

## DEC-013 — OneSignal dietro adapter server-side e inbox persistente

**Status:** Accepted

### Decisione

La UI registra il consenso e la subscription OneSignal tramite RPC protette,
mentre l'invio passa da `server/utils/push-provider.ts` e dalla route server di
dispatch. Ogni evento applicativo crea prima una riga in `notifications`; la
push e opzionale e non puo far fallire l'azione business.

### Motivazione

La separazione evita di esporre la REST API key nel browser, mantiene una fonte
consultabile anche senza permesso push e consente di sostituire OneSignal in
futuro. Retry limitati su 429/503 riducono gli errori transitori senza bloccare
le operazioni torneo.

### Conseguenze

La configurazione reale di App ID e REST API key resta un'azione manuale per
ambiente. In DEV senza credenziali la feature degrada alla sola inbox.

## DEC-014 — Operazioni torneo esplicite e ranking per attività

**Status:** Accepted

### Decisione

Le azioni operative di match (assegnazione postazione, chiamata giocatori,
avvio e correzione del solo payload score) sono RPC autorizzate e auditabili.
Il ranking conserva l'attività sottostante del torneo e viene esposto sia in
forma generale sia filtrabile per attività; il riepilogo personale e gli
adjustment admin derivano sempre dal ledger.

### Motivazione

Le azioni operative richiedono controlli atomici lato database e devono essere
idempotenti. Conservare l'attività reale evita di usare per errore l'ID della
configurazione evento al posto dell'ID del catalogo attività.

### Conseguenze

La modifica di un risultato completato non ricalcola vincitore o punti: la
correzione prevista in beta aggiorna soltanto il punteggio e registra un audit.

## DEC-015 - Proiezione pubblica della disponibilita evento

**Status:** Accepted

### Decisione

La vista `public_events` mantiene privati i campi amministrativi grezzi di
capienza. Espone invece una proiezione derivata secondo `capacity_visibility`:
nessun segnale in modalita `hidden`, il solo stato `available`, `almost_full` o
`full` in modalita `status`, e la coppia confermati/capienza soltanto in
modalita `exact`. La soglia `almost_full` viene letta da
`site_settings['booking.almost-full-threshold']`, e limitata tra 0 e 1 e vale
0.8 se non configurata.

### Motivazione

Il contratto UI richiede di comunicare la disponibilita senza rendere pubblica
la capienza di default. Calcolare lo stato lato database mantiene la fonte di
verita coerente con le prenotazioni e impedisce al client di ricostruire o
mostrare accidentalmente dati amministrativi.

### Conseguenze

Le pagine pubbliche usano esclusivamente `public_capacity_status`,
`public_confirmed_count` e `public_max_capacity`; nessuna pagina anonima legge
la tabella `events` o `bookings` grezza. Le modifiche alla soglia sono
configurazione applicativa amministrativa e richiedono test della proiezione.

## DEC-016 - Guardie database per transizioni operative e bye torneo

**Status:** Accepted

### Decisione

Le transizioni di stato di eventi, tornei e match sono validate da trigger
`before update` nel database. L'avanzamento di un bracket single-elimination
propaga un vincitore a valle, ma considera un match chiuso automaticamente solo
quando gli altri feeder sono vuoti o completati senza vincitore; un match
parzialmente alimentato resta `pending` fino al secondo risultato.

### Motivazione

Le UI e le RPC sono più sicure quando il vincolo è applicato anche al confine
del database. La distinzione tra bye reale e feeder ancora in corso evita di
chiudere prematuramente semifinali o finali nei bracket con più round.

### Conseguenze

Le RPC operative devono rispettare la macchina a stati esplicita e i test
pgTAP coprono transizioni valide, salti non consentiti e bracket a 4/8 entry.
