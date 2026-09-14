# Current Project State

## Stato sintetico

La riorganizzazione V2 descritta in `docs/technical/VRSUS_APP_SPEC_V2.md` e
implementata e verificata sull'ambiente locale. Sopra la V2 e stata costruita
la revisione della console richiesta dal proprietario: dashboard dinamica
sull'evento corrente, scheda utente e scheda torneo con struttura unica
condivisa fra console e app, wizard di creazione e modifica degli eventi e tema
scuro imposto ai componenti (DEC-031, DEC-032, DEC-033, DEC-035). Sopra questa
sono arrivate l'uscita dalla console con le voci di secondo piano in colonna
(DEC-040) e il dominio della tessera ARCI (DEC-041).

Restano da fare i contenuti reali al posto dei segnaposto, la validazione dei
testi legali, le prove su dispositivo fisico (PWA e fotocamera) e il deploy
QUALITY/PRODUCTION.

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
prossima data quando ce n'e una (DEC-042). La barra porta Bacheca, Eventi,
Ranking, Tornei, Impostazioni, e davanti a tutto `Live` con il pallino rosso
mentre una serata e in corso. `Eventi` elenca in sola lettura le giornate in
corso, in programma e passate; la scheda di una giornata e l'unico posto dove
si prenota, con finestra di conferma. `Live` mostra il biglietto con il QR
finche non si passa la porta, poi lo sostituisce con "I tuoi tornei" (prossima
partita, avversario, quante partite mancano) e tiene sotto le schede Tornei e
Piattaforme. Restano ranking, tornei con filtri e stati, bacheca con sondaggi e
feedback interno, impostazioni con nickname, consenso e tessera.

**Console admin.** Da `lg` in su la colonna di sinistra porta anche le voci di
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
voce "Altro", che raccoglie le console assorbite ma non le operazioni della
serata: quelle vivono sulla plancia Live. La shell della console non ha piu il
passaggio all'area personale.

**Tessera ARCI.** Il circolo e affiliato ARCI: lo stato del socio sta sul
profilo, il requisito sulla giornata (`events.arci_required`, default si). Una
tessera vale se lo staff l'ha vista dopo l'inizio della stagione associativa;
la stagione comincia all'ultima data di rinnovo (1 ottobre, modificabile da
`/admin/impostazioni`) o a un azzeramento manuale. Nessun lavoro schedulato:
il rinnovo annuale e una conseguenza del confronto, non di un job (DEC-041).
Lo staff spunta la tessera dalla scheda utente o dal check-in, che dice subito
se la giornata la richiede e se il socio ce l'ha. Vetrina, conferma
prenotazione, biglietto, impostazioni utente e scheda torneo la dichiarano
prima dell'arrivo; un torneo eredita il requisito dall'evento che lo ospita.

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
- Configurazione OneSignal e deploy QUALITY/PRODUCTION.
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

- I Punti VRSUS oggi arrivano solo dai tornei: la parte "punti fedelta"
  (partecipazione, passaparola) e da progettare.
- Le notifiche sul proprio turno durante la serata non ci sono: la pagina Live
  va aggiornata a mano con il comando in alto.

## Ultimo aggiornamento

2026-09-14
