# Next Steps

## Stato

Le fasi da A a J della roadmap in `docs/technical/VRSUS_APP_SPEC_V2.md` sono
implementate e verificate in locale, insieme alla revisione della console
richiesta dal proprietario (dashboard dinamica, scheda utente, scheda torneo
condivisa, wizard evento, tema scuro dei componenti: DEC-031, DEC-032,
DEC-033, DEC-035), all'uscita dalla console con le voci di secondo piano in
colonna (DEC-040), alla tessera ARCI (DEC-041), alla riorganizzazione dell'app
del cliente (DEC-042) e al dominio ranking (DEC-043). La logica notifiche e
pronta in DEV, ma l'attivazione del provider e il test QUALITY richiedono
intervento sugli account esterni.

## Prossima attivita prioritaria

**Verificare in DEV la nuova sezione Utenti, Ranking e Notifiche.**
Logo e sistema motion sono implementati (DEC-064/065) e verificati in Chrome
mobile/desktop con fixture temporanee. Il timing e stato allungato e
ammorbidito dopo il primo riscontro del proprietario. Integrare la prova su
telefono fisico con la checklist "Logo e motion" in
`guideline_test_features.md`: ritmo delle
sequenze, tastiera/scroll, riduzione movimento e icone della PWA installata.
Le altre verifiche funzionali elencate sotto restano pendenti: il nuovo smoke
motion non equivale al collaudo completo di ruoli, ban e invio notifiche.
Usare un account Staff e uno Admin, una sfida a punti e una a tempo. Controllare
lista a righe, profilo compatto e accordion Info/ARCI, differenza delle azioni per ruolo, percorso
profilo -> Ranking con utente conservato, ricerca nickname quando si entra da
menu, podio e accordion regole, input `m:ss.mmm`, assegnazione ruoli cumulativi
e ban/rimozione ban. Da Altro aprire la card Invia notifica e provare tutti,
evento live e singolo utente; dal profilo verificare il destinatario preselezionato.
La checklist completa e in `docs/dev/guideline_test_features.md`, sezione
"Utenti e assegnazione dei risultati ranking". Criterio di completamento:
risultati visibili nella classifica corretta, account bannato respinto al nuovo
accesso, self-ban rifiutato e nessuna regressione su mobile. Le verifiche
automatiche sono PASS: lint, typecheck, unit 30/30, pgTAP 321/321 e build.

## Attivita esterna successiva

**USER ACTION REQUIRED — distribuire e provare la correzione push in QUALITY.**
La sottoscrizione OneSignal e la push di benvenuto funzionano; inbox e badge
si aggiornano. Dopo il deploy della route admin aggiornata, inviare una nuova
notifica da `/admin/notifiche` e leggere il messaggio: deve indicare quanti
dispositivi OneSignal ha accettato. Se indica errore, non modificare il testo
e premere di nuovo per ritentare la sola push senza duplicare inbox.
Provare con PWA in background. Il webhook resta necessario per notifiche
diverse da quelle manuali; confrontare le risposte in `net._http_response`
e i messaggi nel dashboard OneSignal.

Configurazione da verificare se il risultato resta negativo:
Configurare **Settings → Push & In-App → Web** dell'app OneSignal come
**Custom Code**, con Site URL `https://vrsus-app.pages.dev`; impostare in
Cloudflare `APP_BASE_URL=https://vrsus-app.pages.dev` e nel webhook Supabase
`https://vrsus-app.pages.dev/api/notifications/webhook` (prima erano
erroneamente su `vrsus-website.pages.dev`), poi ridistribuire il codice con
la diagnostica push e la rimozione del blocco per origine. Dopo il deploy,
leggere nell'avviso della pagina notifiche i valori effettivi di origine
pagina e APP_BASE_URL; se differiscono, correggere la variabile nel relativo
ambiente Cloudflare, ma continuare la prova Abilita push. Verificare che le
   migration `20261002103000`, `20261002104000`, `20261002105000`,
   `20261003100000` e `20261006160000` siano applicate a Supabase QUALITY e che
App ID, REST API Key e `NOTIFICATION_WEBHOOK_SECRET` appartengano alla stessa
configurazione. Procedura in `docs/dev/guideline_implementations.md`.
Poi eseguire la checklist A/B in `docs/dev/guideline_test_features.md`:
registrazione dispositivo, push, badge e inbox senza refresh, isolamento
utente, invio manuale ai due pubblici e lettura. Criterio di completamento:
ricezione verificata su device reale e log webhook/OneSignal coerenti. Le
   verifiche automatiche DEV sono PASS (pgTAP 315/315, unit 26/26, lint,
typecheck, build `node-server`).

## Verifiche UI precedenti ancora pendenti

Provare con tre account User, Staff e Admin la nuova gerarchia e il selettore
di ruolo. Per User verificare entrambe le navbar, inclusa Live soltanto con una
prenotazione alla serata in corso; per Staff verificare le cinque voci esatte e
la pagina Impostazioni ridotta; per Admin verificare Inbox, tab, conteggi non
letti e cambio stato. Inviare da `Scrivici` tutti e quattro i tipi, incluso
Problemi riscontrati. La checklist completa e in
`docs/dev/guideline_test_features.md`. Prima della prova remota applicare
`20261003100000_simplify_roles_and_feedback.sql`.

Provare nel browser locale, a viewport mobile e con account cliente e admin,
la nuova shell a quattro sezioni e il percorso torneo → prenotazione evento
→ torneo, i filtri e le tab dei tornei, il biglietto compatto e la rinuncia
contestuale. Aree: `app/layouts/`, `app/components/ui/VrsusFloatMenu.vue`,
`app/pages/app/tornei/`, `app/pages/app/prenotazioni/[id].vue`,
`app/pages/app/eventi/[id].vue`, `supabase/migrations/2026100210*.sql`.

Nella stessa prova verificare il float menu admin: wizard evento con azioni
diverse nelle tab Info, Piattaforme e Tornei; salvataggio disabilitato finche
i campi minimi sono incompleti; lista e scheda torneo; creazione/modifica su
postazioni, giochi, bacheca e servizi; check-in con ruolo staff. La build
`node-server` e PASS alla ripetizione con i permessi di lettura necessari.

Verificare inoltre le nuove viste cliente: menu `Segna tutte come lette` in
Notifiche, pulsante rosso `Annulla iscrizione`, filtro Tornei nel float menu,
griglia Ranking a 2/3/6 colonne con Punti VRSUS come prima card, copertine e
fallback, filtro dipendente postazione/gioco, pagina dedicata con regole prima
della classifica,
pannello nickname con annullamento e salvataggio.
Su iPhone/iPad con PWA installata, riprovare il login che prima rimaneva in
caricamento e il trascinamento su login, vetrina, app e console: soglia,
annullamento del gesto breve, ricarica della rotta e assenza di interferenze
con scorrimento, campi e moduli. Verificare che su Android resti il refresh
nativo (DEC-057).

Comportamento atteso: toolbar, contenuto, azioni e navbar non si sovrappongono
su telefoni piccoli; l'utente viene guidato dall'evento al torneo, vede i
filtri applicati come etichette, trova il QR senza scroll e annulla evento e
tornei collegati con una sola conferma. Criterio di completamento: completare
la checklist in `docs/dev/guideline_test_features.md`, verificare le migration
sul database destinatario e solo dopo pubblicare la nuova UI. La verifica
automatizzata locale e gia PASS: pgTAP 294/294, unit 23/23, lint, typecheck
e build.

## USER ACTION REQUIRED

- **Sistemare gli indirizzi di Auth sul progetto Supabase remoto.** E cio che
  serve perche la registrazione via email funzioni: `Site URL` su
  `https://vrsus-app.pages.dev` e `Redirect URLs` con
  `https://vrsus-app.pages.dev/**`. Senza, l'indirizzo di ritorno chiesto
  dall'app viene scartato e le mail continuano a puntare a `localhost:3000`
  (DEC-048). Procedura in `docs/dev/guideline_implementations.md`.
- **Rigenerare la secret key Supabase di produzione.** La chiave attuale e
  transitata in chiaro in una conversazione: va creata una nuova secret key dal
  dashboard Supabase, aggiornata la variabile `SUPABASE_SERVICE_ROLE_KEY` su
  Cloudflare, rilanciato il deploy e revocata la vecchia. Nella stessa
  occasione conviene marcare come cifrate le due variabili segrete, che il
  modulo di creazione del progetto non permetteva di proteggere.
- **Verificare online cio che in locale non e verificabile.** Installazione
  della PWA da telefono, ripiego offline e caricamento dopo il login. Il
  service worker era rotto e non si registrava affatto (DEC-046): ora
  l'artefatto e corretto, ma la registrazione va vista su un browser vero.
- **Flag `nodejs_compat` su Cloudflare.** Se non e ancora stato messo, va
  aggiunto in Settings -> Functions per Production e Preview, con
  compatibility date pari o successiva a `2024-09-23`.
- **Contenuti reali.** Home, chi siamo e servizi usano testi segnaposto,
  raccolti in `shared/constants/site-content.ts` e nelle fixture di
  `supabase/seed.sql`. Sostituirli e una singola operazione.
- **Testi legali.** Informativa privacy e testo del consenso genitoriale vanno
  validati da chi cura la privacy policy prima di aprire le registrazioni in
  QUALITY. La soglia italiana per il consenso digitale e 14 anni e non
  coincide con la maggiore eta (DEC-026).
- **Sfide da creare.** Il dominio ranking c'e ma le sfide vere no: si creano
  dalla pagina di ogni gioco in console (`Ranking` -> `Nuovo ranking`), con il
  regolamento scritto per chi vuole provarci. Senza almeno una sfida, in app la
  tenda Postazione mostra solo i Punti VRSUS. In locale
  `supabase/dev/demo_rankings.sql` ne carica tre di esempio.
- **Punti fedelta VRSUS.** Oggi i punti della classifica generale arrivano solo
  dai tornei. La parte annunciata dal proprietario (punti per partecipazione,
  passaparola, altro) e da progettare: serve decidere quali gesti danno punti,
  quanti, e chi li assegna.
- **Schemi di punti VRSUS.** Ne esistono due di partenza inventati come
  segnaposto: eliminazione diretta (100/60/35/20 piu 10 di partecipazione) e
  girone (15 per vittoria, 5 per pareggio, 40/25 ai primi due, 10 di
  partecipazione). Sono i punti della classifica generale, non quelli del
  torneo: vanno confermati o corretti da `/admin/altro`.
- **Dati dimostrativi locali da ricreare.** Il reset completo e stato fatto il
  2026-09-15 (il volume era su PostgreSQL 15 e la CLI ora impone la 17). Gli
  account di servizio sono stati ricreati; restano da rifare, se servono, i
  sedici utenti dimostrativi e i dati di torneo creati a mano, con gli script
  in `supabase/dev/` e la procedura in `guideline_implementations.md`.
- **Data di rinnovo ARCI.** Il sistema parte dal 1 ottobre, che e l'inizio
  dell'anno associativo piu comune. Va confermata la data effettiva del
  circolo da `/admin/impostazioni` -> Tessere ARCI: da li si sposta il rinnovo
  o si chiude subito la stagione. La procedura e in
  `guideline_implementations.md`.
- **Eventi senza tessera.** Tutte le giornate nascono con la tessera
  richiesta. Compleanni e giornate private gia in calendario vanno corretti a
  mano dal wizard, casella "Tessera ARCI obbligatoria".
- **Immagini.** Postazioni e giochi non hanno immagini: le card mostrano il
  segnaposto testuale. Si caricano dalle console con l'uploader gia presente.
  Con la griglia a due colonne su telefono la mancanza si nota di piu.

## Prossime attivita tecniche

1. Rieseguire gli E2E Chromium: non sono stati rilanciati dopo il motore
   tornei, anche se coprono solo pagine pubbliche non toccate.
2. Prove su dispositivo fisico: installazione PWA, fallback offline, fotocamera
   e scanner QR del check-in. Nella stessa prova va guardato il pannello della
   tessera ARCI che compare dopo il check-in, unica parte della funzione non
   ancora vista a schermo.
3. Prove manuali multiutente secondo `docs/dev/guideline_test_features.md`,
   in particolare le sezioni sulla console dinamica, le schede condivise e il
   wizard evento.
4. Configurazione OneSignal e separazione QUALITY/PRODUCTION, incluso il
   Database Webhook notifiche, secondo `docs/dev/guideline_implementations.md`.

## Progettazione aperta

- **Promemoria preventivi della serata.** La chiamata alla partita genera ora
  inbox Realtime e push (quando OneSignal e configurato). Restano da decidere
  eventuali avvisi "una partita prima" e apertura check-in, con frequenza e
  regole anti-duplicato. Il calcolo di "quante partite mancano" e gia in
  `shared/utils/live-day.ts`.

## Piccoli interventi individuati e non ancora fatti

- Scarto della peggior manche nei tornei a punti: previsto ma non fatto.
- Tornei a fasi (girone che qualifica a un tabellone): lo schema li prevede gia
  con `matches.stage_number`, il motore no.
- La correzione dell'esito di un incontro concluso oggi si ferma al punteggio.
  Se servira cambiare anche il vincitore, va progettata la rimozione
  dell'avanzamento a valle e delle righe di ledger gia scritte.
- `archive_event` non e piu usata da nessuna vista (DEC-033). Se
  l'archiviazione non serve piu davvero, va ritirata con una migration
  dedicata invece di restare come funzione orfana.
- Le sfide non hanno una pagina pubblica in vetrina: si vedono solo dall'app,
  a cliente collegato. Se servira mostrarle a chi non ha un account, la view
  `public_game_rankings` e gia leggibile da `anon`.
- Registrazione sul posto: chi arriva senza prenotazione non ha oggi un modo
  per essere censito dalla console. La scheda `Partecipanti` mostra chi ha
  passato il QR, quindi l'ospite deve prenotare dall'app prima del check-in.
  Se serve davvero, va progettata una RPC che crei prenotazione e check-in in
  un gesto solo, con i dati minimi dell'ospite.

## Fuori scope deliberato

Moderazione dei feedback oltre il segna-come-letto, profili pubblici degli
utenti sulla vetrina, pagamenti online (vietati dalla specifica).
