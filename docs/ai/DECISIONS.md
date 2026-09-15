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

**Status:** Accepted

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

**Status:** Accepted

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

**Status:** Accepted

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

**Status:** Accepted, integra DEC-025

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

**Status:** Accepted, supersedes part of DEC-023

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
