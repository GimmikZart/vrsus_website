# Current Project State

## Ruoli, navigazione, Inbox e immagini — revisione 2026-10-03

L'app usa ora soltanto i ruoli cumulativi `user`, `staff` e `admin`. Ogni
profilo e User; Staff aggiunge l'area operativa; Admin comprende tutti e tre i
livelli. Il selettore mostra esclusivamente i ruoli assegnati e apre la shell
corrispondente. Staff ha Ranking, Tornei, Live, Utenti e Impostazioni; la sua
pagina Impostazioni contiene solo nickname, selettore del ruolo e logout.

La navbar User normale contiene Bacheca, Eventi, Ranking, Tornei e
Impostazioni. Se l'utente ha una prenotazione confermata per un evento
`running`, Eventi viene sostituito dal comando Live centrale,
rialzato, piu grande e lampeggiante. `Scrivici` e nel float menu della Bacheca
e apre una vista dedicata che include il nuovo tipo Problemi riscontrati.
L'Admin legge i quattro tipi di feedback da Inbox, con tab e conteggio non
letti per tipo. Le card toccate di giochi e piattaforme mostrano immagine o
fallback nella posizione coerente con il loro orientamento.

La migration locale `20261003100000_simplify_roles_and_feedback.sql` ha
normalizzato i ruoli storici e aggiunto il nuovo tipo feedback. Verifiche:
pgTAP 315/315, Vitest 26/26, ESLint, typecheck e build `node-server` PASS;
controllo visuale pubblico delle card a 375 × 667 px PASS. Restano pendenti la
prova autenticata dei tre ruoli e l'applicazione della migration in QUALITY.
Avanzamento stimato progetto: 94%.

## Push manuali QUALITY — correzione 2026-10-03

Il proprietario ha verificato che la sottoscrizione OneSignal e la push di
benvenuto funzionano; le notifiche inviate da admin arrivano in inbox e sul
badge, ma non come push. La route admin ora invia direttamente tramite
OneSignal le push relative alle righe create dalla RPC e restituisce il
numero di dispositivi accettati o l'errore. Il webhook ignora solo le righe
`manual` e resta necessario per gli altri tipi. L'adapter verifica che la
risposta OneSignal contenga un ID messaggio: HTTP 200 da solo non basta.
ESLint, typecheck, test unitario parser e build Cloudflare Pages PASS.
**QUALITY con il nuovo codice e consegna effettiva su device ancora da
verificare**. Il risultato del test admin e i log `net._http_response` di
Supabase sono stati richiesti al proprietario. Avanzamento stimato progetto:
92%.

## Attivazione push — correzione controllo origine 2026-10-03

La versione precedente bloccava Abilita push se `APP_BASE_URL` differiva da
`window.location.origin`. Questo controllo introdotto durante la diagnostica
era troppo rigido: l'attivazione OneSignal usa l'origine della pagina. Ora la
differenza e mostrata come avviso non bloccante con entrambi i valori, per
individuare eventuali variabili Cloudflare errate senza impedire il tentativo
di registrazione. Lint, typecheck e build Cloudflare Pages PASS. Prova su
dispositivo QUALITY riuscita per consenso e push di benvenuto; invio
applicativo ancora da verificare.

## Push QUALITY — diagnosi 2026-10-02

Il proprietario ha confermato che la PWA QUALITY reale si apre da
`https://vrsus-app.pages.dev`, mentre Cloudflare `APP_BASE_URL` e il webhook
Supabase erano impostati su `https://vrsus-website.pages.dev` a causa delle
istruzioni precedenti errate. La piattaforma Web Push in OneSignal non era
stata configurata. Entrambe le correzioni esterne sono necessarie: OneSignal
Custom Code con Site URL reale, APP_BASE_URL reale e webhook sull'origine
reale. Il commit diagnostico `c6a45ae` e stato pubblicato su `main`; mostra
errori distinti per SDK, permesso, subscription e Supabase. L'invio push effettivo su device
non e ancora verificato. L'inbox DB gia mostra una notifica di prenotazione.

## Invio manuale notifiche — aggiornamento 2026-10-02

`/admin/altro` include il form per admin/super admin: tutti i profili oppure
utenti con check-in a un evento `running`, testo massimo 300 caratteri,
anteprima del numero di destinatari e conferma. La RPC crea le notifiche
personali in una transazione, registra l'audit ed evita duplicati sui retry.
Migration `20261002105000` applicata al DEV locale. Verifiche: pgTAP
312/312, unit 23/23, lint, typecheck e build `node-server` PASS. La UI e stata
provata dal proprietario su QUALITY; l'invio push manuale corretto richiede
ancora il nuovo deploy e la prova sul dispositivo.

## Notifiche — aggiornamento 2026-10-02

L'inbox e collegata alla toolbar con badge non lette per utente e refresh via
Supabase Realtime, senza ricarica pagina. Publication, RLS e guardia contro
la riassociazione di una sottoscrizione push attiva a un altro account sono
applicate nel database DEV locale. Il worker OneSignal separato e l'endpoint
protetto per il Database Webhook sono implementati. Gli invii espliciti usano
la stessa chiave di idempotenza del webhook. Le credenziali OneSignal non sono
presenti in `.env` locale: **push applicative su dispositivo non ancora
verificate**. USER ACTION REQUIRED: verificare webhook e OneSignal QUALITY,
variabili e webhook Supabase secondo `docs/dev/guideline_implementations.md`;
applicare le migration sul Supabase QUALITY prima del test. Verifiche locali:
pgTAP 301/301, Realtime live con due account, unit 23/23, lint, typecheck e
build `node-server`/Cloudflare Pages PASS.
Avanzamento stimato progetto: 91%.

## Stato sintetico

La riorganizzazione V2 descritta in `docs/technical/VRSUS_APP_SPEC_V2.md` e
implementata e verificata sull'ambiente locale. Sopra la V2 e stata costruita
la revisione della console richiesta dal proprietario: dashboard dinamica
sull'evento corrente, scheda utente e scheda torneo con struttura unica
condivisa fra console e app, wizard di creazione e modifica degli eventi e tema
scuro imposto ai componenti (DEC-031, DEC-032, DEC-033, DEC-035). Sopra questa
sono arrivate l'uscita dalla console con le voci di secondo piano in colonna
(DEC-040) e il dominio della tessera ARCI (DEC-041).

La beta e online su Cloudflare Pages con deploy automatico da `main`. Restano
da fare i contenuti reali al posto dei segnaposto, la validazione dei testi
legali e le prove su dispositivo fisico.

La correzione del 2026-10-02 rende obbligatoria una prenotazione evento
`confirmed` prima dell'iscrizione a un torneo ospitato (DEC-049/050). Il
cliente vede il percorso torneo → evento → torneo; la lista d'attesa non
abilita l'iscrizione. La lista tornei usa filtri in un pannello dal basso e
schede In corso/Prossimi/Storico. Il biglietto mostra subito QR, stato,
prezzo e pagamento sul posto; la conferma di annullamento elenca i tornei
collegati e li ritira nella stessa transazione della prenotazione evento.
Il requisito ARCI e compatto nelle card evento e compare per esteso solo
nella griglia informativa del dettaglio evento (DEC-051); resta operativo in
console per gestione e check-in.
La lista eventi della console usa card essenziali cliccabili; Modifica,
Duplica ed Elimina sono raccolti nel float menu della scheda evento
(DEC-052/053).
La shell mobile delle aree autenticate e stata riorganizzata in toolbar fissa,
contenuto scrollabile, menu azioni contestuali e navbar fissa. Le azioni
primarie di evento, torneo, biglietto e plancia admin usano il nuovo menu;
su desktop la navbar resta una colonna e il menu azioni occupa il piede del
contenuto (DEC-053).
Le migration di questa revisione sono applicate allo stack locale; stato
del database remoto da verificare prima di usare la nuova UI sulla beta.

Sopra la V2 sono arrivati il passaggio fra area cliente e area operativa
accanto all'uscita (DEC-045), l'invito a installare l'app al primo accesso e la
riparazione della PWA, che online non si registrava affatto (DEC-046), e la
rimozione di tutti i campi slug compilabili (DEC-047).

## Cosa e stato costruito

**Dominio dati.** `stations` e diventata `platforms` con codice e flag
`internal`; `activities` e `station_activities` sono state ritirate e
sostituite da `games`, sempre figli di una piattaforma. Nuove tabelle:
`event_platform_games`, `game_scores`, `point_schemes`, `point_scheme_rules`,
`board_posts`, `board_poll_options`, `board_poll_votes`, `user_feedback`,
`guardian_consents`, `profile_nickname_history`. Gli eventi hanno un tipo, i
tornei hanno piattaforma, gioco, schema di punteggio, tre formati e possono
esistere senza evento.

**Motore dei tornei.** Un torneo non ha un "formato" ma tre domande
indipendenti (DEC-037): chi gioca (`entry_size`, `team_formation`: singolo,
coppia, squadra da N), come ci si affronta (`format` piu `group_size`,
`rounds_count`, `heat_seeding`: eliminazione diretta, tutti contro tutti,
manche a gruppi, uno alla volta) e come si vince (`result_kind`,
`score_direction`, `standing_metric`, `scoring_config`: vittoria secca, punti,
tempo, ordine di arrivo). Una partita ha N posti in `match_participants`, non
due lati: da li passano punteggio, piazzamento, esito e punti. Un solo
generatore di calendario, una sola registrazione di risultato e una sola
classifica servono tutti i formati.

Nelle manche i gruppi si formano scegliendo ogni volta chi si e incontrato di
meno, oppure seguendo la classifica; in quel secondo caso la manche successiva
nasce a manche precedente chiusa. Le squadre si creano dall'app (aperte o a
invito con un codice di sei caratteri) e lo staff puo completarle o eliminarle:
una squadra spaiata blocca la partenza.

**Ranking.** Una sfida lunga su un gioco: nome, regolamento in chiaro,
punteggio o tempo, scadenza facoltativa (DEC-043). Nasce dalla pagina del
gioco in console; i record li registra lo staff dalla scheda della sfida. In
app si sceglie postazione, gioco e sfida, e compaiono solo le postazioni e i
giochi che una sfida ce l'hanno davvero; il valore iniziale della prima tenda e
la classifica generale a Punti VRSUS.

**Punti VRSUS.** Non sono i punti del torneo: sono la classifica generale.
Derivano dallo schema collegato al torneo e coprono piazzamenti singoli e a
intervallo, partecipazione ed esiti degli incontri nei gironi. Il piazzamento
finale e la posizione in classifica, per qualunque formato.

**Vetrina.** Home con locandina del prossimo evento, postazioni, chi siamo,
servizi. Registrazione con nickname unico e sezione di consenso che compare
solo per i minorenni.

**App utente.** La home e la bacheca, con in cima l'invito compatto alla
prossima data quando ce n'e una (DEC-042/061). La barra porta Bacheca, Eventi,
Ranking, Tornei e Impostazioni; per un partecipante a una serata in corso
Eventi viene sostituito dal comando centrale `Live`, piu grande e con il
pallino rosso lampeggiante. `Eventi` elenca in sola lettura le giornate in
corso, in programma e passate; la scheda di una giornata e l'unico posto dove
si prenota, con finestra di conferma. `Live` mostra il biglietto con il QR
finche non si passa la porta, poi lo sostituisce con "I tuoi tornei" (prossima
partita, avversario, quante partite mancano) e tiene sotto le schede Tornei e
Piattaforme. Restano ranking, tornei con filtri e stati, bacheca con sondaggi,
`Scrivici` nel float menu e impostazioni con nickname e consenso.

**Console operativa.** La shell Staff espone Ranking, Tornei, Live, Utenti e
Impostazioni; la shell Admin mantiene la navigazione completa. Da `lg` in su
la colonna di sinistra Admin porta anche le voci di
secondo piano (bacheca, servizi, richieste, rettifiche, utenti, impostazioni) e
in fondo l'account collegato con il comando `Esci`; su telefono quelle voci
restano nella pagina `Altro`, che ospita la stessa uscita (DEC-040). La prima
voce non e una home ma la plancia `Live`, con il
pallino rosso lampeggiante quando c'e un evento in corso (DEC-036): mostra
l'evento in corso o il prossimo programmato. In alto la scheda della giornata,
richiudibile: stato e sede, giorno e fascia oraria, il numero che conta in
grande (presenti su prenotati a evento avviato, prenotati su capienza prima) e,
sotto il comando `Dettagli`, prezzo, postazioni, tornei, capienza e lista
d'attesa. Le azioni stanno nel piede della scheda e si alternano: `Modifica`
piu `Start evento` prima dell'avvio, `Modifica` piu `Check-in` dopo. Seguono
le schede agganciate in alto: `Prenotati` sempre presente, `Partecipanti` solo
a evento in corso o concluso (chi ha davvero passato il QR, compreso chi si
registra sul posto), tornei della giornata ordinati con quelli in corso in cima
e i conclusi in fondo, postazioni con i giochi disponibili. Le liste mostrano
la tessera ARCI di ogni prenotato quando la giornata la richiede. Lo stesso riepilogo si apre dalla card di un evento in
elenco, senza comandi. Eventi gestiti da un wizard a tre passi (info,
piattaforme, tornei) con duplicazione ed eliminazione definitiva; lista tornei
divisa in In corso, In programma e Storico; postazioni, giochi, bacheca e la
voce "Altro", che comprende anche Inbox con tab e non letti per tipo, e
raccoglie le console assorbite ma non le operazioni della
serata: quelle vivono sulla plancia Live. Il selettore di ruolo permette di
tornare in ogni momento all'area User o passare fra Staff e Admin.

**Tessera ARCI.** Il circolo e affiliato ARCI: lo stato del socio sta sul
profilo, il requisito sulla giornata (`events.arci_required`, default si). Una
tessera vale se lo staff l'ha vista dopo l'inizio della stagione associativa;
la stagione comincia all'ultima data di rinnovo (1 ottobre, modificabile da
`/admin/impostazioni`) o a un azzeramento manuale. Nessun lavoro schedulato:
il rinnovo annuale e una conseguenza del confronto, non di un job (DEC-041).
Lo staff spunta la tessera dalla scheda utente o dal check-in, che dice subito
se la giornata la richiede e se il socio ce l'ha. Per il cliente il requisito
compare solo nelle card dell'evento e nella sua griglia informativa; un torneo
eredita comunque la regola dall'evento che lo ospita (DEC-051).

**Schede condivise.** La scheda utente (`/admin/utenti/[id]`) e la scheda
torneo hanno una struttura unica: intestazione, poi schede. Utente: eventi,
tornei con piazzamento, ranking filtrabile. Torneo: classifica con corone ai
primi tre, partite come tabellone a eliminazione diretta o schede per girone,
info. In console la scheda torneo aggiunge i comandi riservati (stato, avvio,
modifica, eliminazione, iscrizione e rimozione manuale, postazione, chiamata
giocatori, risultati); nell'app utente la stessa pagina mostra i soli nickname.

## Stato dell'ambiente locale

- Stack Supabase Docker attivo: API `54331`, database `54332`, Studio `54333`,
  Inbucket/Mailpit `54334`.
- Frontend su `http://127.0.0.1:3000`, da avviare con host esplicito.
- Account DEV di prova, incluso un minorenne per il flusso di consenso; vanno
  ricreati dopo ogni `db:reset` con la procedura documentata.
- Il torneo dimostrativo "Tekken 8 Arena" e stato portato fino alla fine
  durante la verifica funzionale: risulta concluso, con vincitore e punti a
  ledger. `pnpm db:reset` riporta la fixture allo stato iniziale.
- Sono presenti sedici utenti demo e la giornata "VRSUS Showcase", con un
  tabellone a eliminazione diretta concluso e un torneo a manche da quattro
  giocato per due terzi. Si ricreano con lo script in
  `supabase/dev/demo_showcase.sql`.
- Le migration del motore tornei sono state applicate con
  `supabase migration up`: `db:reset` non e stato eseguito per non cancellare
  gli account DEV. Il primo reset utile va fatto quando si possono ricreare.

## Verifiche

2026-10-02: migration applicate localmente; pgTAP 294/294, unit 23/23,
lint dei file modificati, typecheck e build `node-server` PASS. Dopo la
revisione della shell, lint, typecheck e build `node-server` PASS.
La prova manuale del nuovo percorso UI e del layout mobile resta da eseguire. Il typecheck
emette il warning noto Volar/vue-router. Dettaglio in `TEST_REPORT.md`.

Ultima esecuzione completa: lint, format, typecheck, unit (19), pgTAP
(271/271), build `node-server`. E2E Chromium (8/8) risale alla sessione
precedente e non e stato rieseguito dopo il motore tornei. Verifica funzionale della console
e del wizard evento eseguita nel browser sull'ambiente locale, desktop e
375 px. La revisione del 2026-09-13 (plancia Live, scheda richiudibile,
postazioni a due colonne) e stata verificata a schermo con lint, typecheck,
unit e build. Il lavoro del 2026-09-14 (uscita dalla console, schede
prenotati/partecipanti, tessera ARCI, poi la riorganizzazione dell'app utente e
il dominio ranking) e stato verificato nel browser a 1280 px e a 375 px, con un
account cliente vero, e con l'intera suite, pgTAP compreso. E2E Chromium
restano da rieseguire. Dettaglio in `docs/ai/TEST_REPORT.md`.

## Problemi aperti

- Contenuti reali per home, chi siamo e servizi: oggi sono segnaposto raccolti
  in `shared/constants/site-content.ts`.
- Testi legali del consenso e informativa privacy da validare (DEC-026).
- Verifica su dispositivo fisico di installazione PWA, fotocamera e scanner QR.
- La beta e pubblicata su Cloudflare Pages (`vrsus-app.pages.dev`) con
  deploy automatico da `main`. Restano da verificare online, su browser reale:
  installazione della PWA, ripiego offline e il caricamento dopo il login, che
  in produzione si bloccava (DEC-044, DEC-046).
- La secret key Supabase usata in produzione va rigenerata: e transitata in
  chiaro in una conversazione. USER ACTION REQUIRED.
- Registrazione via email: il codice e a posto e provato in locale per intero
  (DEC-048), ma sul progetto remoto `Site URL` e `Redirect URLs` puntano ancora
  all'ambiente di sviluppo, quindi le mail rimandano a `localhost:3000`.
  USER ACTION REQUIRED.
- L'ambiente locale e stato ricostruito su PostgreSQL 17: i sedici utenti
  dimostrativi e i dati creati a mano non ci sono piu. Backup del vecchio
  database in `supabase/.temp/`.
- Configurazione OneSignal e Database Webhook in QUALITY/PRODUCTION; test push
  e Realtime su due account e dispositivo fisico ancora pendente.
- Il pannello ARCI del check-in non e stato provato a schermo: serve un QR
  reale. La RPC `check_in_booking` che lo alimenta e coperta dai test pgTAP.
- Non esiste ancora una registrazione sul posto per chi arriva senza
  prenotazione: la scheda `Partecipanti` mostra chi ha passato il QR, quindi un
  ospite dell'ultimo minuto deve prima prenotare dall'app.
- Il risultato si registra anche da `ready`, senza passare da chiamata e avvio
  (DEC-038): con le manche la sequenza obbligata era solo un peso.
- A incontro concluso si corregge solo il punteggio (`amend_match_score`).
  Cambiare il vincitore richiederebbe di disfare l'avanzamento del tabellone e
  i punti gia scritti a ledger: non e implementato.
- Lo scarto della peggior manche e i tornei a fasi (girone che qualifica a un
  tabellone) restano fuori: il secondo ha gia il suo posto nello schema
  (`matches.stage_number`, oggi sempre 1).
- La transizione di pagina resta disattivata per incompatibilita con le pagine
  async (DEC-029).
- `archive_event` resta in database ma non e piu raggiungibile
  dall'interfaccia: la lista eventi offre l'eliminazione definitiva (DEC-033).

## Problemi aperti dell'app utente

- Il nuovo flusso evento → torneo, i filtri, il biglietto e l'annullamento
  contestuale sono verificati dai test di database e dalla build ma non
  ancora con un account reale nel browser. Verificare/applicare sul database
  remoto le migration `20261002100000`, `20261002101000` e `20261002102000`
  prima di pubblicare questa revisione UI.
- Eventuali iscritti preesistenti a tornei ospitati senza prenotazione evento
  non sono stati modificati automaticamente: l'app ora mostra il richiamo a
  prenotare la giornata. La capienza non viene alterata dalla migration.

- I Punti VRSUS oggi arrivano solo dai tornei: la parte "punti fedelta"
  (partecipazione, passaparola) e da progettare.
- La chiamata giocatori genera gia una notifica personale e ora arriva in
  Realtime nell'inbox. I promemoria preventivi ("una partita prima") non sono
  ancora implementati; la pagina Live va aggiornata a mano per altri stati.

## Ultimo aggiornamento

2026-10-03

## Revisione float menu admin del 2026-10-02

Il float menu e ora usato anche nei wizard evento, nelle liste e schede
torneo, postazioni, giochi, bacheca, servizi, ranking, check-in e impostazioni
admin. Le azioni riferite a singoli elementi (righe, squadre, partite) restano
accanto ai rispettivi dati. `Salva evento` nel wizard usa la validazione del
payload per abilitarsi e `Crea torneo` appare solo nella tab Tornei (DEC-054).
Typecheck, lint e build `node-server` PASS. La prima build nel sandbox era
bloccata su `EPERM readlink C:\Users\User`; la ripetizione con i permessi di
lettura necessari e riuscita. Prova visuale autenticata su mobile ancora da
eseguire.

## Revisione app cliente del 2026-10-02

La pagina Notifiche conserva la card push in alto e offre `Segna tutte come
lette` nel float menu solo con messaggi non letti. La pagina Tornei apre i
filtri dal float menu; la rinuncia alla partecipazione mostra un tasto rosso.
Ranking usa una singola griglia: Punti VRSUS e la prima card, seguita dalle
sfide pubbliche con immagine del gioco presa da `public_games`. Il filtro
dipendente postazione/gioco vive in un pannello dal basso; ogni card apre la
pagina dedicata, con regolamento e stato in testa prima della classifica
(DEC-055).
L'elenco risiede in `app/pages/app/ranking/index.vue`: la precedente posizione
`ranking.vue` rendeva il dettaglio una rotta figlia senza `<NuxtPage>`, quindi
il click cambiava rotta senza mostrare la scheda. La build ora genera due rotte
indipendenti.
Nelle Impostazioni il nickname e solo testo finche non si apre il pannello di
modifica. Verifica visuale e funzionale con account reale ancora da eseguire.
ESLint, typecheck, build `node-server` e unit test 23/23 PASS.
Il float menu Ranking conserva il solo filtro nell'elenco; la scheda del rank
non ha azioni. Il gesto di aggiornamento della PWA Apple e ora alla radice e
copre login, vetrina, app e console (DEC-057). Il login usa una navigazione
completa dopo l'accesso e termina il caricamento in caso di errore o timeout.
Il proprietario aveva trovato login bloccato e gesto assente su iPhone nella
versione precedente; la nuova correzione richiede una prova sul dispositivo.
