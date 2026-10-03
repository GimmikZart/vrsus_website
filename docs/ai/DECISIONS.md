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

## DEC-017 - Commento su storage.buckets applicato in modo condizionale

**Status:** Accepted

### Decisione

La migration `20260829230000_storage_assets.sql` applica il commento di
documentazione su `storage.buckets` dentro un blocco `do $$ ... exception when
insufficient_privilege then null; end $$;` invece che con un `comment on table`
diretto.

### Motivazione

Nelle immagini Supabase correnti `storage.buckets` appartiene a
`supabase_storage_admin` e non al ruolo `postgres` che applica le migration.
Il `comment on table` diretto interrompeva `supabase start` con
`must be owner of table buckets (SQLSTATE 42501)`, bloccando l'intero stack
locale prima delle migration successive.

### Conseguenze

Le migration non devono assumere la proprieta degli oggetti negli schemi
gestiti da Supabase (`storage`, `auth`, `realtime`). Bucket e policy restano
invariati; cambia solo il modo in cui viene applicata la documentazione.

## DEC-018 - Dominio evento amministrativo dietro endpoint service-role

**Status:** Accepted

### Decisione

Le console admin non interrogano piu direttamente `events`, `event_stations`,
`event_activities` e `event_station_activities` con il client browser. Le
letture e le scritture passano da endpoint Nitro sotto `/api/admin/events`,
che verificano il ruolo con `requireServerAnyRole` e poi usano il client
service-role. La configurazione di un evento viene salvata con una sola
richiesta `PUT .../configuration` che riceve lo stato desiderato.

### Motivazione

DEC-005 nega ogni grant su queste tabelle ad `anon` e `authenticated`: le
policy RLS `*_admin_manage` non venivano mai raggiunte perche il controllo di
grant precede RLS, e le pagine fallivano con `permission denied for table
events`. Concedere i grant avrebbe esposto capienza e note amministrative a
qualsiasi utente autenticato tramite `events_public_read`, contraddicendo
DEC-005. La singola richiesta di salvataggio elimina inoltre la sequenza di
delete/insert/update lato client, che poteva lasciare una configurazione
applicata a meta.

### Conseguenze

Gli endpoint sono l'unico confine di autorizzazione e validazione per questo
dominio: il service-role ignora RLS, quindi ogni payload va normalizzato in
`server/utils/event-admin.ts` prima di raggiungere il database. Nuove
funzionalita admin sul dominio evento devono seguire lo stesso pattern e non
possono tornare al client Supabase. Le RPC `duplicate_event` e `archive_event`
restano `security definer` e continuano a essere chiamate dal browser.

## DEC-019 - Pagina indice come `index.vue` dentro la cartella di rotta

**Status:** Accepted

### Decisione

Quando una rotta ha delle sottorotte, la pagina indice si chiama
`<rotta>/index.vue` e non `<rotta>.vue` accanto alla cartella omonima.

### Motivazione

In Nuxt una pagina `X.vue` affiancata alla cartella `X/` diventa il layout
genitore delle sottorotte e deve contenere `<NuxtPage />`. Nessuna di queste
pagine lo conteneva, quindi le sottorotte renderizzavano la pagina genitore:
`/app/*`, `/esperienze/[slug]`, `/admin/eventi/[id]` e `/admin/tornei/[id]`
erano irraggiungibili. Il resto del progetto usava gia `index.vue`
(`eventi/`, `news/`, `servizi/`, `tornei/`), quindi la convenzione era gia
prevalente.

### Conseguenze

Le rotte pubbliche restano invariate. Una nuova sottorotta non richiede piu
di ricordarsi di aggiungere `<NuxtPage />`. Se in futuro servisse davvero una
shell condivisa fra sottorotte, va introdotta esplicitamente come layout.

## DEC-020 - VRSUS_APP_SPEC_V2 come specifica operativa

**Status:** Accepted

### Decisione

`docs/technical/VRSUS_APP_SPEC_V2.md` e la specifica operativa di prodotto per
vetrina, app utente e console admin. Dove diverge da
`TECHNICAL_SPECIFICATION.md` su modello di dominio, rotte o UX, prevale il
documento V2. La Technical Specification resta valida su sicurezza, RLS,
semantica booking/check-in, QR senza PII e capienza privata.

### Motivazione

Il proprietario ha ridefinito esplicitamente prodotto e navigazione nella
sessione del 2026-09-10. L'istruzione esplicita del proprietario precede la
Technical Specification nell'ordine di autorita del progetto. Senza un
documento di riferimento unico le due fonti resterebbero in conflitto silente.

### Conseguenze

Ogni sessione legge il documento V2 insieme agli altri documenti di progetto.
Le divergenze introdotte dal V2 vanno registrate come decisioni, non applicate
in silenzio.

## DEC-021 - Piattaforma e postazione sono la stessa entita

**Status:** Accepted
**Supersedes:** il vincolo "non assumere che una station sia una console" di
`AGENT_START_HERE.md`

### Decisione

Esiste una sola entita: `platforms`. In vetrina si chiama "Postazione", nel
modello e nella console si chiama "Piattaforma". La tabella `stations` viene
rinominata in `platforms` e acquisisce `code` e `internal`. `station_categories`
diventa `platform_categories`, `event_stations` diventa `event_platforms`,
`event_station_activities` diventa `event_platform_games`,
`matches.event_station_id` diventa `matches.event_platform_id`.

### Motivazione

Decisione esplicita del proprietario in sessione, confermata su domanda
diretta. Il testo di prodotto usa "postazione" e "piattaforma" per la stessa
cosa: il filtro del Ranking parla di postazione, mentre il flag `internal` che
governa la visibilita pubblica sta sulle piattaforme e la pagina pubblica si
chiama "Postazioni". Due entita separate avrebbero raddoppiato le schermate
admin senza un bisogno reale.

### Conseguenze

Il vincolo storico e superato per decisione del proprietario, non per
adattamento al codice esistente. La distinzione fra le capienze resta intatta:
`events.max_capacity` != `platforms.default_capacity` !=
`event_platforms.capacity_override` != `tournaments.max_entries`. La migration
di rinomina deve ri-applicare esplicitamente i `revoke`/`grant` di DEC-005: le
tabelle rinominate altrimenti ereditano i grant di default e la capienza torna
leggibile da `authenticated`.

## DEC-022 - I giochi sostituiscono le attivita

**Status:** Accepted
**Supersedes:** DEC-009 limitatamente alle attivita

### Decisione

Il catalogo si basa su `games`, sempre figli di una `platform`. `activities` e
`station_activities` vengono ritirate. I tornei referenziano direttamente
`platform_id` e `game_id`. Il ledger ranking passa da `activity_id` a
`game_id`.

### Motivazione

Il prodotto ridefinito ragiona in termini di piattaforma e gioco, non di
attivita editoriali: un evento mette a disposizione piattaforme e, per
ciascuna, i giochi. Mantenere entrambi i modelli avrebbe significato due
cataloghi paralleli da tenere allineati.

### Conseguenze

Le view pubbliche delle attivita e le rotte `/esperienze` vengono ritirate con
redirect verso `/postazioni`. Le view `public_activities` sono sostituite da
`public_platforms` e `public_games`.

## DEC-023 - Ranking a due letture

**Status:** Accepted

### Decisione

Il Ranking espone due letture: i punti VRSUS dal ledger auditabile esistente
(classifica generale) e, filtrando per gioco, il record di punteggio assoluto
da `game_scores`. I punteggi delle sfide arcade sono inseriti esclusivamente da
staff o admin. I punteggi arcade non generano punti VRSUS.

### Motivazione

Scelta del proprietario su domanda diretta. Le due letture rispondono a
domande diverse: chi e il piu forte in generale e chi detiene il record su un
gioco. Limitare l'inserimento allo staff evita di costruire una coda di
moderazione e rimuove l'incentivo a gonfiare i punteggi.

### Conseguenze

`games.score_direction` determina l'ordinamento del record: i giochi a tempo
ordinano crescente, gli altri decrescente. Tenere separati punti e punteggi
preserva l'auditabilita del ledger, che resta l'unica fonte dei punti.

## DEC-024 - Si memorizza la data di nascita, non l'eta

**Status:** Accepted

### Decisione

La registrazione raccoglie la data di nascita in `profiles.birth_date`. L'eta e
sempre derivata alla lettura e non viene mai memorizzata.

### Motivazione

Il proprietario ha chiesto "eta" fra i campi di registrazione. Un intero
memorizzato diventa falso dopo il primo compleanno dell'utente e non esiste un
momento affidabile in cui aggiornarlo.

### Conseguenze

Resta aperta la questione dei minorenni: se VRSUS accetta iscritti sotto i 18
anni servono consenso genitoriale e regole di visibilita. Va deciso dal
proprietario prima di aprire le registrazioni in QUALITY.

## DEC-025 - Tre shell separate e navigazione per gruppo di rotte

**Status:** Accepted; navigazione per ruolo integrata da DEC-061

### Decisione

L'interfaccia ha tre gusci: `site` (vetrina, hamburger in alto a destra), `app`
(utente autenticato, tab bar inferiore a cinque icone) e `admin` (console, tab
bar con Dashboard, Eventi, Tornei, Piattaforme, Giochi e Altro). La shell si
sceglie per gruppo di rotte, non per ruolo. Su `lg` la tab bar inferiore
diventa una barra laterale.

### Motivazione

Il proprietario ha chiesto che dopo il login il sito prenda la forma di
un'app. Legare la shell al gruppo di rotte invece che al ruolo mantiene
prevedibile la navigazione: un admin che apre `/app` vede l'app utente, e il
passaggio alla console resta un gesto esplicito.

### Conseguenze

La tab bar deve rispettare `env(safe-area-inset-bottom)` in modalita PWA
standalone e il contenuto scrollabile deve riservare il padding corrispondente.
Lo stato dei tornei non puo essere veicolato dal solo bordo colorato: serve
sempre anche un'etichetta testuale.

## DEC-026 - Minorenni accettati con consenso di genitore o tutore

**Status:** Accepted
**Risolve:** questione aperta lasciata da DEC-024

### Decisione

VRSUS accetta iscritti minorenni. Un account con meno di 18 anni richiede il
consenso di un genitore o tutore, raccolto alla registrazione e conservato in
`guardian_consents` (nome, cognome, email, telefono facoltativo, relazione,
momento del consenso, eventuale verifica, eventuale revoca).

La minore eta e sempre derivata da `birth_date` tramite la funzione
`is_minor()`, mai memorizzata come flag. Un minore senza consenso registrato
non puo prenotare: il controllo vive nella RPC di prenotazione, non solo
nell'interfaccia. Il profilo di un minore non puo essere pubblico. Al
compimento dei 18 anni il consenso smette di essere richiesto ma il record
resta come traccia storica.

### Motivazione

Decisione esplicita del proprietario. Un flag booleano di minore eta
diventerebbe falso al diciottesimo compleanno senza che nulla lo aggiorni, per
lo stesso motivo per cui DEC-024 memorizza la data di nascita e non l'eta.
Mettere il controllo solo nell'interfaccia lo renderebbe aggirabile con una
chiamata diretta alla RPC.

### Conseguenze

`guardian_consents` contiene dati di un adulto che non e utente della
piattaforma: e la categoria di dati piu delicata del sistema. Nessuna view
pubblica, nessuna esposizione allo staff oltre l'esistenza del consenso,
cancellazione a cascata con il profilo del minore. La verifica via email al
genitore e predisposta con `verified_at` e si attivera quando l'SMTP sara
configurato in QUALITY. Informativa privacy, testo del consenso e soglie di eta
vanno validati da chi cura la privacy policy: la soglia italiana per il
consenso digitale e 14 anni (D.lgs. 101/2018) e non coincide con la maggiore
eta.

## DEC-027 - Punteggio dei tornei configurabile per schema

**Status:** Accepted
**Supersedes:** l'assegnazione punti cablata in `record_match_result`

### Decisione

I punti VRSUS di un torneo derivano da uno **schema di punteggio**
riutilizzabile, collegato al torneo con `tournaments.point_scheme_id`. Uno
schema raccoglie regole di tipo `placement` (posizione singola o intervallo),
`participation`, `match_win`, `match_draw`, `match_loss` e `bonus`. Un torneo
senza schema non assegna punti.

Modificare uno schema non ricalcola i punti gia assegnati: il ledger e uno
storico immutabile e le correzioni passano dalla rettifica auditabile
esistente.

### Motivazione

Il proprietario ha chiesto che la gestione del punteggio sia elastica perche
dipende dal torneo. Oggi i valori sono cablati dentro `record_match_result`
(100 al vincitore, 60 al secondo), coprono solo due posizioni e presuppongono
l'eliminazione diretta: non reggono i formati a girone. Uno schema unico e
riutilizzabile serve entrambe le famiglie di formato senza duplicare il motore.

### Conseguenze

La fase G deve **sostituire** la logica cablata, non affiancarla: lasciando
entrambe i punti verrebbero assegnati due volte. L'indice unico
`(tournament_id, user_id, reason_code)` gia esistente rende l'assegnazione
sicura se ripetuta. In interfaccia vanno distinti i due modi in cui un torneo
non assegna punti, `ranking_enabled = false` e assenza di schema, perche si
assomigliano ma nascono da scelte diverse.

## DEC-028 - Prettier tollerante sui fine riga

**Status:** Accepted

### Decisione

`prettier.config.mjs` usa `endOfLine: 'auto'`: Prettier accetta il fine riga
che il file gia possiede invece di imporre LF.

### Motivazione

Con `core.autocrlf=true` sulla workstation Git converte i file in CRLF al
checkout, mentre il default di Prettier (`endOfLine: 'lf'`) si aspetta LF.
`pnpm format:check` falliva quindi su tutti gli 84 file del repository, inclusi
quelli mai modificati. Un gate di verifica che fallisce sempre smette di essere
letto e finisce per nascondere i problemi veri.

Fra le opzioni disponibili, `'auto'` e l'unica che risolve senza effetti
collaterali: `'crlf'` romperebbe il gate per un collaboratore su macOS o Linux,
mentre normalizzare tutto a LF con `.gitattributes` avrebbe riscritto piu di
ottanta file senza cambiarne il contenuto, proprio mentre il repository ha
lavoro non committato.

### Conseguenze

Il gate torna utilizzabile immediatamente, con una modifica di una sola riga e
nessuna riscrittura. La consistenza dei fine riga nel repository non e imposta:
se in futuro il progetto avra collaboratori su sistemi diversi, va aggiunto un
`.gitattributes` con `* text=auto eol=lf` in un commit dedicato, tenuto separato
da quelli funzionali per non inquinare la storia.

## DEC-029 - Transizione di pagina disattivata

**Status:** Accepted

### Decisione

`app.pageTransition` resta disattivata in `nuxt.config.ts`. Le transizioni
interne alle pagine e ai componenti restano consentite e in uso.

### Motivazione

Con Nuxt 4.5 e Vue 3.5 il `<Transition>` applicato a `<NuxtPage>` non scambia
il componente quando la pagina di destinazione usa `await` di primo livello in
`<script setup>`, cioe la forma idiomatica per `useAsyncData` e `useFetch`. Il
sintomo era subdolo: la rotta e il titolo cambiavano, il contenuto no. Provate
e scartate entrambe le varianti `mode: 'out-in'` e senza `mode`, e verificata
l'irrilevanza della radice singola in `app.vue`.

L'alternativa era rinunciare all'`await` di primo livello su circa venticinque
pagine, aggiungendo stati di caricamento ovunque per riottenere
un'animazione di 180 ms.

### Conseguenze

Il progetto mantiene il vincolo "CSS/Vue/Nuxt transitions prima scelta" per il
movimento, applicato pero dentro le pagine e non fra una pagina e l'altra. Se
una versione futura di Nuxt risolvera l'incompatibilita, la transizione si
riattiva cambiando una riga.

## DEC-030 - I test non dipendono dallo stato mutabile delle fixture

**Status:** Accepted

### Decisione

Un test pgTAP che verifica un comportamento crea i propri dati invece di
appoggiarsi alle fixture condivise. Dove il dato condiviso serve davvero, si
asserisce la presenza della fixture e non un conteggio assoluto.

### Motivazione

`public_capacity.test.sql` asseriva zero prenotazioni confermate sull'evento
dimostrativo. Bastava usare l'applicazione in DEV, cioe fare esattamente cio
per cui l'ambiente esiste, per far fallire un test che non aveva nulla a che
vedere con il codice. E successo due volte in due sessioni diverse.

Un gate che fallisce per motivi estranei al codice smette di essere letto e
finisce per nascondere i problemi veri.

### Conseguenze

`public_capacity.test.sql` crea un proprio evento e le proprie prenotazioni, e
copre anche le soglie `almost_full` e `full` che prima non erano verificate.
Le asserzioni di `database_foundation.test.sql` sui conteggi di piattaforme,
giochi, post e servizi verificano la presenza delle fixture e l'invariante di
privacy, non il numero totale di righe.

## DEC-031 - La console ruota attorno all'evento corrente e non ha area personale

**Status:** Accepted (la rimozione del passaggio all'area personale e superata
da DEC-045)

### Decisione

La dashboard `/admin` non e piu un cruscotto di metriche generiche: mostra
l'evento in corso se esiste, altrimenti il prossimo evento programmato, con le
informazioni della giornata e due schede (prenotati o partecipanti, tornei).
Il passaggio dalla console all'area personale viene rimosso dalla shell admin.

### Motivazione

Chi amministra apre la console per governare la serata che sta per cominciare o
che e gia cominciata: quella deve essere la prima cosa a schermo, non un numero
di utenti registrati. L'account che amministra non ha un profilo di gioco, non
prenota e non si iscrive ai tornei, quindi il pulsante verso `/app` portava a
una sezione senza contenuto per quel ruolo.

Il passaggio in modalita live resta un'azione esplicita dell'operatore
(`Start evento`) e non una conseguenza dell'orario: l'evento comincia quando lo
staff dice che e cominciato, e in quel momento gli iscritti confermati ricevono
la notifica.

### Conseguenze

`/api/admin/dashboard` e l'unico punto che decide quale evento e "quello che
conta"; la pagina si limita a leggere `mode`. I contatori generali (utenti,
richieste, feedback) restano disponibili in fondo alla pagina come
scorciatoie. La shell `layouts/app.vue` conserva invece il collegamento verso
la console: serve a chi ci finisce per errore.

## DEC-032 - Scheda utente e scheda torneo hanno una struttura unica condivisa

**Status:** Accepted

### Decisione

La pagina di un utente e la pagina di un torneo hanno la stessa struttura
ovunque vengano aperte. La struttura vive in componenti condivisi
(`app/components/profile/*`, `app/components/tournament/*`) che leggono un tipo
normalizzato in `shared/types/`; la classifica e le etichette dei round sono
funzioni pure in `shared/utils/tournament-standings.ts`.

Le due sorgenti dati restano distinte: la console compone la vista lato server
con il ruolo di servizio e mostra nome, cognome ed eta; l'app utente la compone
nel browser dalle view pubbliche e mostra i soli nickname.

### Motivazione

Le stesse due schede vengono aperte da punti diversi dell'applicazione. Con due
implementazioni separate sarebbero divergute alla prima modifica, e la
differenza fra le due non e la forma della pagina ma quali dati e lecito
mostrare a chi guarda.

I dati anagrafici non possono passare dal browser: `profiles` espone in RLS solo
la riga dell'utente corrente e `tournament_entries` non ha una policy di
scrittura per gli admin. Iscrizione manuale, rimozione di un iscritto e lettura
dell'anagrafica passano quindi da endpoint service-role che verificano il ruolo,
come gia previsto da DEC-018.

### Conseguenze

Una modifica alla struttura della scheda si fa una volta sola. Un nuovo punto di
ingresso deve riusare i componenti invece di ridisegnare la pagina. La
classifica ha test unitari propri: e la parte con piu casi limite e non dipende
da Supabase.

La sequenza operativa di un incontro resta quella imposta dalla macchina a stati
(DEC-016): chiama i giocatori, avvia, poi registra il risultato. L'interfaccia
la rende esplicita e abilita il salvataggio solo a match avviato, invece di
lasciare che il trigger risponda con un errore opaco.

## DEC-033 - Wizard evento a tre passi con bozza salvata al primo passo

**Status:** Accepted

### Decisione

La creazione e la modifica di un evento passano da un wizard a tre schede
(Info, Piattaforme, Tornei) su una vista dedicata. L'elenco `/admin/eventi` non
contiene piu alcun form. Il primo "Avanti" salva l'evento come bozza e i passi
successivi lavorano sull'evento appena creato. La configurazione di postazioni
e giochi non ha piu una pagina propria: vive nel secondo passo. L'archiviazione
e sostituita dall'eliminazione definitiva, che rimuove anche tornei,
prenotazioni, check-in e postazioni dell'evento.

### Motivazione

Il form nella stessa vista dell'elenco costringeva a leggere due cose insieme e
il pulsante "Nuovo evento" non portava da nessuna parte: si limitava a svuotare
il form piu in basso. La configurazione del catalogo in una pagina separata
faceva la stessa domanda ("cosa c'e in questa giornata") in un posto dove
nessuno la cercava.

Il salvataggio al primo passo non e una comodita: postazioni e tornei sono
righe collegate a `event_id`, quindi hanno bisogno di un evento che esista. Le
alternative erano tenere tutto in memoria fino alla fine, rischiando di perdere
il lavoro, oppure impedire la creazione dei tornei durante la preparazione.

Lo stato dell'evento non compare come campo perche le uniche due condizioni che
l'operatore decide sono "e pubblicato" e "non lo e": il resto della macchina a
stati (in corso, concluso, annullato) lo muovono le azioni operative, non un
menu a tendina. Su un evento gia avviato o concluso la casella non tocca lo
stato, perche la guardia in database non ammette il ritorno indietro.

### Conseguenze

`archive_event` resta in database ma non e piu usata dall'interfaccia. La
cancellazione passa da un endpoint service-role che elimina i figli nell'ordine
imposto dalle chiavi esterne: prenotazioni e tornei sono `restrict`, quindi una
delete diretta fallirebbe.

I campi che il wizard non mostra piu (descrizioni lunghe, note interne, SEO,
visibilita della capienza) restano in tabella e vengono rimandati invariati a
ogni salvataggio: l'endpoint riscrive la riga intera e senza di loro il
salvataggio cancellerebbe dati che nessuno ha chiesto di cancellare.

## DEC-034 - Le shell non tagliano l'overflow orizzontale

**Status:** Accepted

### Decisione

I layout `app` e `admin` non usano `overflow-x: hidden` sul contenitore radice.
Il contenuto largo (tabelle, tabelloni) scorre dentro il proprio contenitore,
come gia previsto dalla specifica V2.

### Motivazione

Un antenato con `overflow` diverso da `visible` annulla `position: sticky` su
tutti i discendenti. Con quella regola l'header della shell non restava in alto
su mobile pur essendo dichiarato `sticky`, e le barre di schede agganciate non
avrebbero funzionato. Il difetto era silenzioso: nessun errore, solo un
comportamento che non si verificava.

### Conseguenze

Chi aggiunge un elemento largo deve dargli il proprio contenitore scorrevole,
perche non c'e piu una rete di sicurezza che nasconde lo sbordamento. La
verifica e una riga in console:
`document.documentElement.scrollWidth > clientWidth`.

## DEC-035 - Tema scuro imposto e token Nuxt UI allineati alla palette

**Status:** Accepted

### Decisione

`colorMode` e fissato su `dark` in `nuxt.config.ts`, con la preferenza salvata
su cookie. I token semantici di Nuxt UI (`--ui-bg*`, `--ui-border*`,
`--ui-text*`, `--ui-primary`, `--ui-secondary`) sono ridefiniti in
`app/assets/css/main.css` sulla palette VRSUS. Le select native usano tutte la
classe `.vrsus-select` e la pagina dichiara `color-scheme: dark`.

### Motivazione

Senza la classe `dark` sull'elemento radice Nuxt UI rende il tema chiaro: campi
di input bianchi su pagina nera e, nelle select native, testo bianco su tendina
bianca. Non era un problema di stile ma di leggibilita: intere maschere erano
inutilizzabili. La preferenza su cookie evita anche il lampo chiaro al primo
render, perche la classe arriva gia dal server.

`color-scheme: dark` e necessario a parte: la tendina di una select nativa la
disegna il sistema operativo e segue quella proprieta, non i colori CSS.

### Conseguenze

**`--ui-radius` non va toccata.** Nuxt UI la usa come base dell'intera scala
`--radius-*` di Tailwind: portarla da 0.25rem a 0.75rem ha triplicato ogni
`rounded-xl` e `rounded-2xl` dell'applicazione, non solo nei suoi componenti.
Per cambiare la forma dei campi si passa dalle classi, non da quella variabile.

In tema scuro Nuxt UI userebbe la tinta 400 come colore primario: sul rosso del
marchio diventa rosa. `--ui-primary` e quindi ancorato alla tinta 500 e
`--ui-text-inverted` torna bianco.

Una nuova select va scritta con `class="vrsus-select"`: le classi Tailwind
sparse davano cinque varianti diverse dello stesso controllo.

## DEC-036 - La prima voce della console e la plancia Live

**Status:** Superseded in parte da DEC-061

### Decisione

La prima voce della tab bar della console non si chiama piu `Home`: si chiama
`Live` e, quando esiste un evento in stato `running`, la sua icona diventa il
pallino rosso lampeggiante (`.vrsus-live-dot`, componente `UiVrsusLiveDot`).
Lo stato arriva da `GET /api/admin/live-state`, un endpoint deliberatamente
minimo che risponde solo se c'e una serata in corso; la shell lo legge con
`useAdminLiveEvent()` sulla chiave condivisa `admin-live-state`, senza SSR e
senza bloccare il rendering.

Le voci `Live evento` e `Check-in` spariscono dalla pagina `Altro`: le
operazioni della serata si fanno dalla plancia Live.

### Motivazione

La dashboard della console non e una home: e il posto dove si lavora durante
l'evento. Chiamarla `Home` la confondeva con la home dell'area utente e non
diceva nulla sullo stato della serata. Il pallino rosso si vede dall'altra
parte della sala, un'etichetta no.

Le due voci in `Altro` duplicavano comandi gia presenti sulla plancia e
portavano l'operatore fuori dal posto dove ha tutto il resto sotto mano.

### Conseguenze

`/admin/live` e `/admin/checkin` restano rotte valide e protette: la seconda si
apre dal pulsante `Check-in` della plancia, la prima resta raggiungibile solo
per URL diretto. Un account con il solo ruolo `staff` non vede piu ne l'una ne
l'altra dal menu, perche `/admin` richiede `admin` o `super_admin`: se in
futuro servira uno staff che fa solo check-in, la strada e abbassare i ruoli
richiesti dalla plancia, non rimettere le voci in `Altro`.

`useAdminLiveEvent()` e una lettura in piu per ogni pagina della console:
resta accettabile perche l'endpoint interroga solo `events` e non ricostruisce
il riepilogo. Chi cambia lo stato di un evento deve aggiornare la chiave con
`refreshNuxtData(ADMIN_LIVE_STATE_KEY)`, come fa `Start evento` sulla plancia.

## DEC-037 - Un torneo e tre domande indipendenti, non un formato

**Status:** Accepted

### Decisione

La configurazione di un torneo si scompone in tre assi separati, salvati come
colonne di `tournaments`:

| Asse | Colonne | Domanda |
| --- | --- | --- |
| Chi gioca | `entry_size`, `team_formation` | singolo, coppia o squadra da N |
| Come ci si affronta | `format`, `group_size`, `rounds_count`, `heat_seeding` | eliminazione, tutti contro tutti, manche, uno alla volta |
| Come si vince | `result_kind`, `score_direction`, `standing_metric`, `scoring_config`, `allow_draw` | vittoria, punti, tempo, ordine di arrivo |

Una partita smette di avere due lati: `matches.entry_a_id` e
`matches.entry_b_id` sono sostituite da `match_participants`, una riga per
posto in partita, con punteggio, piazzamento, esito e punti assegnati. Anche
`matches.score_payload` sparisce: il risultato vive sui posti.

Un solo generatore di calendario (`generate_tournament_schedule`), una sola
registrazione di risultato (`record_match_results`) e una sola classifica
(`tournament_standings`) servono tutti i formati. `standing_metric` decide come
si ordina la classifica e quali colonne mostra l'interfaccia.

I preset della maschera (duello, manche a punti, time attack, coppie) sono solo
prefill lato client: non esistono nel database, e il motore non li conosce.

### Motivazione

Il modello a due sfidanti reggeva solo i giochi in cui si gioca uno contro uno.
Mario Kart con sedici piloti che corrono quattro alla volta non e esprimibile
come otto duelli, e un tempo sul giro non e una vittoria. Ogni tentativo di
farci stare quei casi avrebbe prodotto formati cablati nel codice, uno per
gioco.

Con i tre assi la stessa configurazione descrive Tekken (eliminazione,
vittoria secca), Mario Kart (manche da quattro, ordine di arrivo, punti per
posizione), Gran Turismo (uno alla volta, tempo migliore) e i tornei a coppie,
senza un solo ramo dedicato nel motore.

### Conseguenze

Una configurazione incoerente non viene rifiutata ma corretta: il trigger
`tournaments_normalize_config` riempie i vuoti e sistema le combinazioni senza
senso (una manche da quattro non puo avere "vittoria o sconfitta", un tempo si
ordina sempre dal piu basso). Vale per ogni strada che scrive un torneo:
maschere, seed, fixture.

I punti di piazzamento VRSUS non dipendono piu dal tabellone: a torneo
concluso il piazzamento e la posizione in classifica, per qualunque formato.
`_award_knockout_placements` e stata ritirata.

La frase che spiega il torneo ai giocatori (`tournamentSummary`) si genera
dalla stessa configurazione che governa il motore: non puo descrivere una
dinamica diversa da quella che si gioca.

Restano fuori, deliberatamente: lo scarto della peggior manche e i tornei a
fasi (girone che qualifica a un tabellone). Il secondo ha gia il suo posto nello
schema, `matches.stage_number`, che oggi vale sempre 1.

## DEC-038 - Il risultato si registra anche senza chiamata e avvio

**Status:** Accepted, supersedes part of DEC-016

### Decisione

La guardia di stato degli incontri ammette `ready -> completed` e
`called -> completed`, oltre a `running -> completed`. Chiamare i giocatori e
avviare la partita restano disponibili ma non sono piu passaggi obbligati.

### Motivazione

Con i duelli la sequenza chiama, avvia, registra descriveva bene quello che
succede in sala. Con quattro manche di fila, o con dieci tentativi a
cronometro, obbligava a tre comandi per ogni risultato: un peso senza
contropartita, che durante la serata porta a non usare piu la console.

La nota rimasta aperta in `CURRENT_STATE.md` diceva gia che la correzione
andava fatta sulla guardia, non sull'interfaccia.

### Conseguenze

Chi vuole avvisare i giocatori usa ancora `call_tournament_match`, che manda le
notifiche. Il cronometro della partita (`started_at`) resta vuoto quando si
salta l'avvio: e un dato di servizio, non un requisito.

## DEC-039 - Lo slug di un torneo lo costruisce il database

**Status:** Accepted

### Decisione

`tournaments.slug` non si scrive piu da nessuna maschera. Un trigger lo genera
come `piattaforma-gioco-data` (per esempio
`nintendo-switch-mario-kart-8-20-09-2026`) alla creazione e quando cambia uno
degli ingredienti, con suffisso numerico nei casi limite. L'unicita passa da
`(event_id, slug)` a `slug`.

### Motivazione

Nessuna rotta usa lo slug: si naviga per id. Scriverlo a mano obbligava a
inventare codici diversi per tornei che si ripetono sullo stesso gioco, ed era
una trappola: due serate con lo stesso torneo andavano in conflitto. Il vecchio
indice per evento lasciava inoltre scoperti i tornei senza evento.

### Conseguenze

Le fixture non possono piu cercare un torneo per slug: seed, script dimostrativi
e test pgTAP lo cercano per nome. La colonna ha un default vuoto solo perche i
tipi generati non la rendano obbligatoria negli insert: il trigger la sostituisce
prima che la riga tocchi il disco.

## DEC-040 - La console si esce, e su schermo largo non ha una pagina "Altro"

**Status:** Accepted, integra DEC-025

### Decisione

Le voci di secondo piano della console (bacheca, servizi, richieste, rettifiche
ranking, utenti, impostazioni) nascono in un solo posto,
`app/composables/useAdminMenu.ts`. Su telefono restano nella pagina
`/admin/altro`, perche la barra in basso tiene cinque icone; da `lg` in su la
voce "Altro" sparisce dalla barra e le stesse voci si leggono direttamente
nella colonna di sinistra.

Il piede della colonna mostra l'account collegato e il comando `Esci`. La
stessa scheda compare in fondo alla pagina Altro, che su telefono e l'unico
punto della console sempre raggiungibile.

### Motivazione

La console non aveva nessun modo di uscire: chi amministra non passa
dall'area personale (DEC-031), e il logout viveva solo in
`/app/impostazioni`. Restava la cancellazione dei cookie.

La pagina Altro nasce da un vincolo del telefono. Su desktop la colonna ha
spazio per undici voci: obbligare a un passaggio in piu per arrivare alle
impostazioni era un costo senza motivo.

### Conseguenze

`VrsusTabBar` accetta gruppi di voci mostrati solo da `lg`, un flag
`mobileOnly` per le voci che spariscono su schermo largo e uno slot `footer`.
La colonna scorre quando le voci non ci stanno. La pagina `/admin/altro`
resta raggiungibile per URL anche su desktop: e la stessa lista, non una
destinazione diversa.

## DEC-041 - La tessera ARCI e una stagione, non un campo da azzerare

**Status:** Accepted

### Decisione

Il circolo e affiliato ARCI. Lo stato del socio vive sul profilo
(`profiles.arci_card_verified_at`, `arci_card_verified_by`); il requisito vive
sulla giornata (`events.arci_required`, default `true`).

La validita non e un booleano che qualcuno deve ricordarsi di azzerare: una
tessera vale se e stata vista dopo l'inizio della stagione associativa
corrente. La stagione comincia all'ultima ricorrenza della data di rinnovo
(1 ottobre di default, configurabile da `/admin/impostazioni`) oppure a un
azzeramento manuale piu recente, registrato in `site_settings` sotto la chiave
`arci.membership`. Il confronto sta in `public.arci_card_is_valid()` e
`public.arci_season_start()`.

Un torneo non ha un requisito proprio: eredita quello dell'evento che lo
ospita, e non dichiara nulla quando evento non ne ha.

### Motivazione

Il rinnovo annuale e l'unico automatismo richiesto, e derivare la validita
dalla stagione lo ottiene senza un lavoro schedulato: niente `pg_cron`, niente
funzione da tenere viva, nessuna finestra in cui il job non e partito e le
tessere risultano ancora valide. L'azzeramento immediato diventa la scrittura
di una data, quindi e reversibile e non distrugge lo storico di chi era socio
la stagione prima.

Il requisito sta sull'evento perche la tessera serve per entrare in sala: un
compleanno o una giornata privata non la chiedono, una serata pubblica si. Un
secondo interruttore sul torneo avrebbe creato due verita per la stessa porta.

### Conseguenze

`profiles_update_own` non distingue le colonne: un trigger
(`enforce_arci_card_authority`) rifiuta la scrittura delle colonne ARCI a chi
non e staff, cosi nessuno si autocertifica. La verifica passa da
`set_arci_card`, che lascia una riga di audit, e si fa dalla scheda utente o
dal check-in. `check_in_booking` restituisce `arci_required` e
`arci_card_valid`: alla porta si vede subito se manca.

`public_events` proietta `arci_required`, quindi vetrina, app e biglietto
dicono prima dell'arrivo se la tessera serve.

## DEC-042 - L'app del cliente ruota attorno alla bacheca e alla serata

**Status:** Superseded in parte da DEC-061, integra DEC-025

### Decisione

La home dell'area personale non e una home: e la **bacheca**, con la sua
etichetta e la sua icona. Quando esiste una data pubblica programmata, sopra
gli annunci compare un invito compatto con nome, giorno e ora, prezzo e
tessera ARCI, e un comando che porta alla scheda dell'evento. Senza date in
programma resta la sola bacheca.

La barra diventa: Bacheca, Eventi, Ranking, Tornei, Impostazioni. Quando una
serata e in corso, davanti a tutto compare **Live** con il pallino rosso.

`/app/eventi` elenca le giornate in sola lettura (in corso, in programma,
storico) e `/app/eventi/[id]` e l'unico posto dove il cliente prenota, con una
finestra di conferma che riepiloga evento, orario, costo e tessera.

`/app/live` mostra il biglietto con il QR finche non si passa la porta; dopo il
check-in il biglietto sparisce e lascia il posto a **I tuoi tornei**, con la
prossima partita, l'avversario e quante partite mancano. Sotto, due sole
schede: Tornei e Piattaforme. Nessun dato sugli altri clienti: prenotati e
presenti restano in console.

### Motivazione

L'area personale aveva una home che ripeteva il prossimo evento, una voce
Bacheca separata e nessun elenco degli eventi. Il cliente apriva l'app per due
motivi: sapere cosa succede e prenotare. La bacheca e il primo; l'invito in
cima e il secondo, e non ha bisogno di una pagina propria.

Durante la serata le domande cambiano: come entro, quando tocca a me, contro
chi. Una voce che compare solo quando serve dice da sola che c'e qualcosa in
corso, e costa niente quando non c'e.

Prenotare dalla scheda dell'evento invece che da una pagina dedicata mette la
decisione dove ci sono le informazioni per prenderla, e la finestra di
conferma evita la prenotazione per sbaglio con un dito.

### Conseguenze

`/app/bacheca` e `/app/prenota/[eventId]` sono state ritirate: la prima e
diventata `/app`, la seconda vive nella scheda evento. La locandina della
vetrina, per chi ha gia un account, porta a `/app/eventi/[id]`.

Il calcolo di "quando tocca a me" vive in `shared/utils/live-day.ts` come
funzione pura, non nella pagina: le stesse tre risposte serviranno alle
notifiche.

## DEC-043 - Il ranking e una sfida, non una proprieta del gioco

**Status:** Accepted; la selezione UI a tre tende e superseded by DEC-055

### Decisione

Il ranking diventa un'entita: `game_rankings`. Una sfida appartiene a un
gioco, ha un nome, un regolamento in chiaro (mappa, pista, vettura,
configurazione), dice se si registra un punteggio o un tempo e se vince il
valore piu alto o piu basso, e puo avere una scadenza. Lo stesso gioco puo
averne quante ne vuole; un gioco puo non averne nessuna.

I punteggi (`game_scores`) appartengono alla sfida, non solo al gioco. Li
registra lo staff, che c'era quando il record e stato fatto.

La pagina Ranking dell'app si legge dall'alto in basso: postazione, gioco,
sfida, classifica. La prima tenda ha come valore iniziale **Punti VRSUS**, la
classifica generale del circolo; le altre voci sono le sole postazioni che
hanno una sfida, e i soli giochi che ce l'hanno. La terza tenda sceglie fra le
sfide del gioco e parte dall'ultima aperta. Niente "tutte" e niente "tutti".

### Motivazione

Prima la classifica era una proprieta del gioco: un gioco, un record. Non
regge alla realta: su Gran Turismo la sfida e una pista con una vettura e
delle regole, e la stessa serata puo ospitarne tre diverse. Senza un'entita,
i tentativi di sfide diverse finivano nella stessa classifica.

"Tutte le postazioni" e "tutti i giochi" sommavano numeri che non si possono
sommare: un tempo sul Nurburgring e un punteggio a Beat Saber non stanno nella
stessa colonna. Mostrare solo cio che ha una sfida evita di promettere
classifiche che non esistono.

Un ranking e un torneo lungo: si apre, dura una serata o una stagione, e
chiunque puo provare a batterlo in qualunque momento. La scadenza facoltativa
e quello che distingue una sfida di giornata da una stagionale.

### Conseguenze

`game_rankings` segue la strada di `games`: grant al browser e policy RLS, cosi
la configurazione si fa dalla pagina del gioco. I punteggi seguono la strada di
`bookings`: nessun grant, scrittura da endpoint service-role
(`/api/admin/rankings/[id]/scores`), che rifiuta una sfida chiusa o scaduta.

`public_game_leaderboards` resta in database per lo storico dei punteggi senza
sfida, ma l'app non la usa piu.


## DEC-044 - Il deploy si configura nel provider, non nel repository

**Status:** Accepted

### Decisione

Cloudflare Pages resta l'hosting previsto dalla specifica, collegato al
repository GitHub con deploy automatico da `main`. La sua configurazione
(build command, output, variabili, compatibility flag `nodejs_compat`) vive nel
dashboard del provider: il repository non contiene un `wrangler.toml`.

Il repository espone soltanto lo script `pnpm build:cloudflare`
(`nuxt build --preset=cloudflare_pages`), e da oggi un solo lockfile,
`pnpm-lock.yaml`: `package-lock.json` e stato rimosso e aggiunto a
`.gitignore` insieme a `yarn.lock`.

### Motivazione

Un `wrangler.toml` in un progetto Pages diventa la fonte di verita per
binding, variabili e compatibility flag, e ignora in silenzio quello che e
stato impostato dal dashboard. Con la configurazione in un posto solo, un
valore sbagliato si vede dove lo si e scritto.

Il lockfile doppio e un problema concreto e non teorico: tutti i provider di
deploy scelgono il package manager dal lockfile presente, quindi con entrambi
in repository la build remota poteva installare con npm un albero diverso da
quello provato in locale con pnpm, che la specifica indica come package
manager del progetto.

Lo script dedicato evita che la stringa del preset venga ridigitata a mano nel
dashboard: se il preset cambiera, cambia in un punto solo, versionato.

### Conseguenze

Le credenziali degli ambienti remoti non entrano mai nel repository: stanno
nelle variabili del provider, e la procedura con i nomi esatti e in
`docs/dev/guideline_implementations.md`. Un ambiente nuovo si crea ripetendo
quella procedura, non copiando un file di configurazione.

Chi lavora al progetto usa `pnpm`. Un `npm install` rigenererebbe il lockfile
rimosso, che ora resta comunque fuori dal versionamento.

## DEC-045 - Un ruolo speciale non toglie l'area cliente

**Status:** Superseded in parte da DEC-061

### Decisione

Chi ha un ruolo `staff`, `admin` o `super_admin` resta un cliente del circolo a
tutti gli effetti: prenota, si iscrive ai tornei, ha i suoi punti. La console
non e un'identita alternativa ma un'area in piu.

Il passaggio fra le due aree e un interruttore a due posizioni,
`UiVrsusWorkspaceSwitch`, che vive dentro `UiVrsusSessionCard`, cioe sempre
accanto all'uscita: nel piede della colonna di sinistra su schermo largo, nella
pagina Altro della console e nella sezione Sessione delle impostazioni
dell'app su telefono. Chi ha il solo ruolo `staff` viene portato al check-in,
perche `/admin` chiede admin o super-admin.

Il collegamento `Console` nell'intestazione di telefono dell'app cliente e i
due collegamenti `Check-in operativo` e `Console amministrazione` nelle
impostazioni sono stati rimossi: erano tre porte diverse per lo stesso gesto,
tutte a senso unico.

### Motivazione

Sostituisce la parte di DEC-031 che toglieva il passaggio all'area personale
dalla shell della console. La motivazione di allora - "chi amministra non ha un
profilo di gioco" - e stata rettificata dal proprietario: l'account che
amministra il circolo e anche una persona che gioca, e obbligarlo a due account
separati per fare le due cose non ha senso.

Il ritorno mancava del tutto: dalla console non si tornava all'app se non
scrivendo l'indirizzo a mano, e su schermo largo non esisteva nemmeno l'andata.

### Conseguenze

`VrsusSessionCard` non e piu solo "chi sei e come esci" ma il blocco della
sessione: area corrente, identita, uscita. Chi aggiunge una shell nuova ottiene
il passaggio gratis mettendoci quella scheda.

DEC-031 resta valida per tutto il resto: la console ruota attorno all'evento
corrente e non ha una propria pagina di profilo.

## DEC-046 - La navigazione va in rete, la pagina offline e un ripiego

**Status:** Accepted

### Decisione

Il service worker non usa `navigateFallback`. Le richieste di navigazione
seguono una regola `NetworkOnly` con `PrecacheFallbackPlugin` su `/offline`, e
`/offline` viene prerenderizzata (`nitro.prerender.routes`) per esistere come
file statico dentro il precache.

Il manifest dichiara icone PNG da 192 e 512 piu una `maskable` dedicata,
generate dal logo SVG e conservate in `public/icons/`.

### Motivazione

`navigateFallback` e la configurazione di una SPA: Workbox registra una
`NavigationRoute` che risponde a **ogni** navigazione con un unico documento
precacheato. Qui il documento lo costruisce il server a ogni richiesta, quindi
quella regola e sbagliata in partenza.

Nella configurazione precedente era anche rotta: il documento indicato,
`/offline`, non era prerenderizzato e quindi non era in precache.
`createHandlerBoundToURL` solleva un errore su un URL non precacheato, il
service worker non superava l'avvio e la registrazione falliva. Il risultato
era un'app che online non era installabile e non aveva nessuna gestione
offline, pur avendo tutta la configurazione PWA al suo posto.

Le icone erano un secondo blocco indipendente: Chrome considera installabile
un sito solo se il manifest offre icone raster da 192 e 512, e ignora le SVG
per questo scopo. Con la sola `favicon.svg` l'evento `beforeinstallprompt` non
sarebbe arrivato mai, quindi nessun invito a installare avrebbe potuto
comparire.

### Conseguenze

Chi tocca la configurazione PWA deve ricordare che il modulo mette
`navigateFallback: '/'` quando la chiave non compare affatto: per disattivarlo
la chiave deve esserci e valere `undefined`.

Le regole di `runtimeCaching` che devono guardare il percorso usano una
funzione su `url.pathname` e non una regex ancorata a `^/`: Workbox confronta
l'URL completo, quindi le regex ancorate non corrispondono mai.

## DEC-047 - Gli slug non si scrivono a mano

**Status:** Accepted

### Decisione

Nessun modulo dell'applicazione ha un campo slug compilabile. Lo slug nasce
dal nome o dal titolo del record e, quando due record si chiamano allo stesso
modo, la collisione la risolve chi scrive con un numero progressivo
(`serata`, `serata-2`, `serata-3`), tramite `uniqueSlug` in
`shared/utils/slug.ts`.

Per postazioni, serate e post della bacheca il numero libero lo calcola
l'endpoint prima dell'insert; per giochi e pagine servizi, che si scrivono dal
browser, lo calcola la pagina prima dell'insert.

In modifica lo slug gia salvato non cambia, nemmeno se cambia il nome.

### Motivazione

Il campo era compilabile ma opzionale, e nessuno vuole scrivere a mano
l'indirizzo di ogni record. Toglierlo pero non bastava: senza un campo da
correggere, due postazioni con lo stesso nome sarebbero diventate impossibili
da creare, e l'operatore avrebbe visto un errore senza rimedio.

Lo slug resta fermo in modifica perche e un indirizzo pubblico: una serata gia
annunciata puo avere il suo link in giro, e un titolo corretto per un refuso
non deve rompere quel link.

### Conseguenze

I messaggi di conflitto delle maschere non parlano piu di slug: parlano di
codice, di nome o di conflitto generico, perche lo slug non e piu qualcosa che
l'operatore possa sbagliare.

`slugify` resta duplicato in tre punti (`app/utils`, `server/utils`, la copia
locale in `servizi.vue`). L'unificazione non e stata fatta in questa sessione
per non allargare il perimetro; `uniqueSlug` invece nasce gia condiviso.

## DEC-048 - La conferma via email ha una rotta sua, e l'ambiente locale la esercita

**Status:** Accepted

### Decisione

`signUp` passa sempre `emailRedirectTo` costruito su `APP_BASE_URL`
(`${appBaseUrl}/confirm`), e `/confirm` esiste come pagina: aspetta che il
client scambi il codice, entra in bacheca, e se il link e scaduto o gia usato
lo dice in chiaro.

Quando `signUp` non restituisce una sessione, cioe quando il progetto chiede la
conferma, la pagina di registrazione mostra "Controlla la posta" invece di
navigare verso l'area riservata. Per un minorenne il consenso del genitore si
sposta dopo il primo accesso, perche registrarlo richiede una sessione.

`supabase/config.toml` attiva `enable_confirmations` anche in locale.

### Motivazione

Il percorso era rotto in tre punti diversi e nessuno se ne era accorto, perche
in locale `mailer_autoconfirm` era acceso: `signUp` restituiva subito una
sessione e la conferma non veniva mai esercitata. Sul progetto remoto, dove la
conferma e obbligatoria, tutti e tre i punti si vedevano insieme.

Il link puntava all'ambiente di sviluppo perche l'indirizzo di ritorno non
veniva chiesto: Supabase ripiegava sul `Site URL` del progetto. La pagina di
atterraggio dichiarata in `nuxt.config.ts` come `callback` non esisteva. E dopo
la registrazione l'app navigava comunque verso `/app`, dove la guardia
rimbalzava su `/login` senza dire niente: dal di fuori sembrava che la
registrazione non funzionasse.

Allineare l'ambiente locale e la parte piu importante della decisione: una
differenza di configurazione fra sviluppo e produzione aveva reso invisibile un
percorso intero.

### Conseguenze

Chi sviluppa in locale legge le mail su `http://127.0.0.1:54334` e apre il link
come farebbe un cliente. Per gli account di servizio resta la creazione con
`"email_confirm": true`, che salta la mail.

`emailRedirectTo` non basta da solo: l'indirizzo deve comparire nei Redirect
URLs del progetto Supabase, altrimenti viene scartato in silenzio a favore del
`Site URL`. La procedura e in `docs/dev/guideline_implementations.md`.

## DEC-049 - L'iscrizione a un torneo di una giornata segue la prenotazione confermata

**Status:** Superseded by DEC-050

### Decisione

Ogni torneo collegato a un evento richiede una prenotazione evento in stato
`confirmed` per ogni membro, anche se il vecchio campo
`requires_event_booking` era falso. L'iscrizione al torneo non crea piu una
prenotazione implicita. La lista d'attesa non basta. I tornei autonomi non
richiedono una prenotazione evento.

La regola vive nelle RPC di iscrizione singola e di squadra e in un trigger
su `tournament_entry_members`, cosi vale anche per l'aggiunta manuale dello
staff. Una prenotazione confermata non puo essere annullata o marcata come
`no_show` mentre l'utente appartiene a un torneo attivo di quell'evento:
prima si ritira dal torneo.

### Motivazione

La vecchia iscrizione creava la prenotazione evento di nascosto. In caso di
capienza esaurita poteva creare una riga `waitlisted` e iscrivere comunque al
torneo. Il cliente non vedeva mai costo, tessera e conferma della giornata.

### Conseguenze

La scheda torneo indica il prerequisito e porta alla scheda evento con il
torneo di provenienza. Dopo la conferma del posto la scheda evento offre il
ritorno all'iscrizione al torneo. Gli iscritti preesistenti privi di
prenotazione vedono l'avviso e possono completare il passaggio dall'app;
la migration non crea prenotazioni retroattive e non altera le capienze.

## DEC-050 - La rinuncia all'evento ritira anche dai tornei ospitati

**Status:** Accepted

### Decisione

Resta obbligatoria una prenotazione evento `confirmed` per ogni membro di un
torneo ospitato. Quando il proprietario annulla la prenotazione dall'app, la
conferma mostra i tornei attivi coinvolti e una sola RPC ritira le sue
iscrizioni e annulla il posto evento nella stessa transazione. Se un torneo e
gia iniziato o un ritiro non e ammesso, l'intera operazione fallisce senza
modifiche parziali. L'annullamento amministrativo di prenotazioni altrui
continua a richiedere la gestione esplicita degli ingressi al torneo.

### Motivazione

Chiedere all'utente di uscire manualmente da ogni torneo prima di annullare
la giornata rendeva la rinuncia difficile e lasciava spazio a stati
incoerenti. La transazione unica conserva il vincolo evento-torneo e la
capienza anche quando una delle iscrizioni non puo essere ritirata.

### Conseguenze

La pagina del biglietto deve mostrare l'impatto prima della conferma; le
liste e le schede dei tornei devono ignorare le iscrizioni ritirate. Le RPC
di sola lettura del biglietto e dei tornei collegati limitano i dati al
proprietario della prenotazione, inclusi gli eventi privati.

## DEC-051 - Il requisito ARCI compare solo nel contesto dell'evento

**Status:** Accepted

### Decisione

Nell'interfaccia cliente, il requisito ARCI compare solo nelle card
riassuntive di un evento, con l'icona tessera e l'etichetta compatta `Arci`,
e nella griglia informativa della pagina evento accanto a Quando, Dove e
Costo. Home, impostazioni, biglietto, conferme di prenotazione e schede
torneo non ripetono il requisito. I comandi e gli avvisi operativi della
console restano disponibili a chi gestisce tessere e check-in.

### Motivazione

Il requisito e importante, ma ripeterlo in ogni passaggio rendeva le pagine
piu rumorose e metteva in secondo piano azioni come prenotare o mostrare il
QR. L'evento e il posto in cui l'utente decide se partecipare e dove trova
l'informazione completa.

### Conseguenze

Nuove viste cliente non aggiungono avvisi o stati personali ARCI fuori da
questi due contesti. Il requisito continua a essere applicato e verificato
dalle regole esistenti; cambia solo la sua presenza visiva.

## DEC-052 - L'elenco admin degli eventi serve a scegliere, la scheda a gestire

**Status:** Superseded by DEC-053

### Decisione

In `/admin/eventi` ogni evento e una card interamente cliccabile con solo
titolo, data e ora, sede, costo e stato Pubblico o Bozza. I comandi Modifica,
Duplica ed Elimina vivono nella scheda del singolo evento, immediatamente
prima delle sue tab. L'eliminazione conserva una conferma esplicita.

### Motivazione

Azioni e metadati secondari nella lista rendevano difficile leggere e scegliere
un evento, soprattutto da telefono. La pagina dettaglio offre gia il contesto
necessario per intervenire senza sovraccaricare le card.

### Conseguenze

Nuove azioni di gestione evento vanno aggiunte alla scheda dettaglio, non alla
lista. La lista resta una navigazione rapida e leggibile.

## DEC-053 - La shell separa navigazione e azioni della pagina

**Status:** Accepted

### Decisione

Le aree autenticata cliente e console usano quattro sezioni: toolbar fissa
con logo, titolo della rotta e notifiche; contenuto centrale scrollabile;
menu delle azioni della pagina fissato sopra la barra di navigazione;
navigazione fissata in basso su mobile e in colonna su desktop. La pagina
registra le proprie azioni presso il layout; quando non ne ha, il menu non
compare. Una sola azione usa un pulsante a larghezza piena, piu azioni usano
icone e la disposizione compatta della navbar.
Le card dell'elenco eventi admin restano essenziali e cliccabili; i comandi
della scheda evento passano dal piede del riepilogo al float menu.

### Motivazione

Le azioni principali mescolate a card e riepiloghi rendevano la pagina piu
affollata e meno comoda da usare con una mano. Un'area stabile vicino al
pollice lascia il contenuto leggibile e mantiene i comandi accessibili.

### Conseguenze

Le pagine con azioni primarie registrano i comandi nel layout, che riserva
spazio nel contenuto per evitare sovrapposizioni. La navbar della console
mostra solo rotte consentite al ruolo. La toolbar apre la pagina notifiche
gia esistente; la configurazione delle push resta indipendente.

## DEC-054 - Le azioni globali della console seguono la tab e la validita del modulo

**Status:** Accepted

### Decisione

Anche le pagine admin secondarie registrano nel float menu le azioni della
pagina: creazione, salvataggio, avanzamento del wizard e transizioni del torneo.
Le azioni su una singola riga, squadra o partita restano vicine all'oggetto
su cui agiscono. Nel wizard evento `Crea torneo` compare solo nella tab Tornei;
`Salva evento` si abilita solo quando titolo, date, prezzo e gli altri campi
obbligatori superano la stessa validazione usata dal salvataggio.

### Motivazione

La shell a quattro sezioni non era coerente se i comandi delle pagine admin
rimanevano nel contenuto. La validazione condivisa evita un pulsante
attivabile che poi fallisce immediatamente per campi mancanti.

## DEC-055 - Il ranking si esplora tramite card delle sfide

**Status:** Accepted

### Decisione

La pagina ranking mostra i Punti VRSUS e tutte le sfide pubbliche nella stessa
griglia di card, da due, tre o sei colonne. Punti VRSUS e la prima card. La
scelta di una card apre la pagina dedicata alla sua classifica; una sfida mostra
sempre prima stato e regolamento, in un'intestazione contenuta entro un terzo
del viewport, poi la classifica.
Il filtro per postazione e gioco vive in un pannello dal basso e usa solo
giochi con sfide pubbliche. L'immagine del gioco arriva dalla view
`public_games`; se non esiste, si usa un fondo grafico.

### Motivazione

La lista visuale rende disponibili tutte le sfide senza tre selettori
permanenti nella pagina. Il catalogo pubblico contiene gia le immagini, percio
non serve una nuova view o migration per il layout.

## DEC-056 - Aggiornamento con trascinamento nella PWA Apple

**Status:** Superseded by DEC-057

### Decisione

Nell'area cliente, su iPhone e iPad con PWA aperta in modalita standalone,
trascinare verso il basso quando il contenuto e in cima ricarica la rotta
corrente. L'interfaccia mostra la progressione del gesto, la soglia di rilascio
e un breve stato di caricamento. In Safari e su Android resta il comportamento
del browser. La console admin non riceve questo gesto, per evitare di perdere
dati ancora non salvati nei moduli. I comandi `Aggiorna` delle due viste Ranking
sono rimossi.

### Motivazione

La PWA Apple non mostra la barra di Safari e, sul dispositivo del proprietario,
il trascinamento non ricarica la pagina. La shell cliente usa inoltre un
contenitore di scorrimento interno, percio il gesto viene legato a quel
contenitore e si attiva solo quando e in cima.

## DEC-057 - Il refresh PWA copre tutte le rotte e il login ricarica la sessione

**Status:** Accepted

### Decisione

Il gesto di aggiornamento della PWA Apple e registrato alla radice Nuxt e
funziona su login, vetrina, area cliente e console. Usa lo scroller del
documento sulle pagine pubbliche e il main scrollabile nelle aree interne;
parte solo dall'alto e non intercetta dialog, campi di testo o scroller figli
gia scesi. Il login, dopo una risposta positiva di Supabase, apre la rotta
protetta con una navigazione completa, cosi il server rilegge la sessione
scritta nei cookie. Errori e attese oltre 15 secondi terminano lo stato di
caricamento mostrando un messaggio.

### Motivazione

Il primo componente viveva solo nel layout cliente: sulla pagina login il
gesto non esisteva. Inoltre la navigazione SPA partiva subito dopo il login,
mentre il modulo Supabase aggiorna `useSupabaseUser` in modo asincrono tramite
`getClaims`; la guardia della pagina protetta poteva ancora vedere l'utente
come anonimo. Il proprietario ha riscontrato entrambi i problemi su iPhone.

## DEC-058 — Notifiche per utente con Realtime e webhook push

**Status:** Superseded by DEC-060 for manual notifications; otherwise Accepted

### Decisione

`notifications` resta la fonte persistente, protetta da RLS per utente e
pubblicata su Supabase Realtime. Toolbar e inbox aggiornano conteggio e lista
agli eventi INSERT/UPDATE, con riallineamento alla riconnessione e al ritorno
in primo piano. La push parte da un Database Webhook Supabase su INSERT verso
un endpoint Nitro protetto da secret; l'endpoint rilegge la notifica dal DB e
usa l'adapter OneSignal di DEC-013. Gli invii espliciti usano lo stesso
adapter. L'ID della notifica e la chiave di idempotenza presso OneSignal,
cosi webhook e invio esplicito non producono due push. Il worker OneSignal
usa `/onesignal/` come scope separato dal worker offline della PWA.

### Motivazione

Le notifiche di prenotazione e iscrizione nascono in trigger SQL e non
attraversano sempre una route server. Il webhook copre tutte le nuove righe
senza spostare la logica business. Un errore push non elimina la riga inbox.
RLS, filtro per `user_id` e guardia sulle sottoscrizioni separano gli account.

### Conseguenze

Ogni ambiente richiede una propria app OneSignal, App ID, REST API Key,
webhook secret e Database Webhook. Senza configurazione, inbox e badge
Realtime funzionano ma la push resta disabilitata. La prova su dispositivi
reali resta un test QUALITY.

## DEC-059 — Invio manuale con pubblico calcolato nel database

**Status:** Superseded by DEC-060 for push dispatch; otherwise Accepted

### Decisione

La console permette ad admin/super admin di inviare un testo fino a 300
caratteri a tutti i profili oppure agli utenti con check-in su un evento
`running` selezionato. La RPC `send_manual_notification` valida ruolo e stato
evento, crea una notifica personale per destinatario in una transazione e
registra un audit. Un UUID di invio rende sicuri i retry. Push, badge e inbox
seguono il flusso comune di DEC-058.

### Motivazione

Il pubblico live deve riflettere le presenze effettive, come nella specifica
V2. Il calcolo nel database evita limiti di paginazione e invii parziali dal
server. Il registro impedisce duplicati quando la risposta HTTP si perde.

### Conseguenze

La migration `20261002105000` deve precedere l'uso della nuova vista in ogni
ambiente. La push richiede la configurazione esterna gia descritta in DEC-058.

## DEC-060 — Invio push manuale diretto con risultato visibile

**Status:** Accepted

### Decisione

La RPC continua a creare in transazione una notifica personale per ogni
destinatario. Dopo la RPC, la route admin legge quelle righe tramite il UUID di
invio e invia la push OneSignal in gruppi paginati. Il Database Webhook ignora
le righe di tipo `manual`, evitando doppioni; resta attivo per le notifiche
prodotte dagli altri flussi. Ogni gruppo usa una chiave di idempotenza stabile
nei retry. La risposta admin distingue notifiche in app create, dispositivi
accettati da OneSignal ed errori push.

### Motivazione

La prova QUALITY ha confermato inbox e badge ma non la consegna delle push
manuali. L'invio admin dipendeva interamente da un webhook asincrono e la UI
segnalava successo appena la RPC terminava, senza sapere se OneSignal avesse
creato un messaggio. La route diretta rende l'esito osservabile e ritentabile.

### Conseguenze

Il webhook resta necessario per prenotazioni, chiamate giocatori e altre
notifiche generate fuori dalla route admin. Il successo dell'API OneSignal
significa messaggio accettato, non consegna confermata sul dispositivo: quella
richiede prova reale. La REST API key deve essere configurata sul server.

## DEC-061 — Tre ruoli cumulativi e navigazione adattiva

**Status:** Accepted

### Decisione

I soli ruoli applicativi sono `user`, `staff` e `admin`, con gerarchia
cumulativa: ogni profilo ha `user`, `staff` implica anche `user` e `admin`
implica tutti e tre. I valori storici `tournament_admin` e `super_admin`
vengono migrati rispettivamente a `staff` e `admin`; le funzioni SQL di
autorizzazione accettano ancora questi due alias soltanto per non invalidare
le policy create dalle migration precedenti. La UI e le nuove scritture non li
espongono piu.

`UiVrsusWorkspaceSwitch` mostra i ruoli realmente assegnati e conserva il
ruolo attivo. User apre `/app`, Staff `/admin/live`, Admin `/admin`; il cambio
e sempre reversibile. La shell Staff contiene esattamente Ranking, Tornei,
Live, Utenti e Impostazioni, e le sue impostazioni contengono soltanto
nickname, selettore del ruolo e logout.

Nell'app User la barra normale contiene Bacheca, Eventi, Ranking, Tornei e
Impostazioni. Durante un evento `running`, `Live` compare soltanto per utenti
con prenotazione confermata e sostituisce Eventi: e il
comando centrale, rialzato e piu grande, mantenendo il lampeggio. La stessa
evidenza centrale si applica alla voce Live dello Staff.

I messaggi `Scrivici` hanno una vista cliente dedicata, raggiunta dal float
menu della Bacheca, e quattro tipi: messaggio, consiglio, recensione e problema
riscontrato. L'Admin li legge in Inbox, nella sezione Altro, con tab e conteggi
non letti separati per tipo. Le card di giochi e piattaforme mostrano sempre
l'immagine disponibile o un fallback: a sinistra nelle card orizzontali e in
alto nelle card verticali.

### Motivazione

Cinque ruoli sovrapposti rendevano ambiguo chi potesse usare le funzioni
operative e costringevano a porte diverse per la stessa persona. La gerarchia
cumulativa rappresenta il fatto che Staff e Admin restano anche clienti e
permette alla shell di adattarsi a un unico ruolo attivo. Live deve sostituire
la navigazione di scoperta soltanto per chi partecipa davvero alla serata.
Inbox separa il dialogo con i clienti dagli strumenti editoriali della
Bacheca, mentre immagini e fallback rendono riconoscibili giochi e piattaforme
in ogni orientamento di card.

### Conseguenze

La migration `20261003100000_simplify_roles_and_feedback.sql` deve essere
applicata prima del deploy della nuova UI. Il ruolo base `user` non puo essere
rimosso; togliere `staff` a un Admin richiede prima togliere `admin`. Le
verifiche manuali devono coprire un account per ciascun livello, il passaggio
fra ruoli e i due stati della navbar User. L'alias SQL legacy potra essere
rimosso solo dopo avere sostituito le policy storiche che lo nominano.
