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
