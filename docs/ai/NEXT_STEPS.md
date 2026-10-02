# Next Steps

## Stato

Le fasi da A a J della roadmap in `docs/technical/VRSUS_APP_SPEC_V2.md` sono
implementate e verificate in locale, insieme alla revisione della console
richiesta dal proprietario (dashboard dinamica, scheda utente, scheda torneo
condivisa, wizard evento, tema scuro dei componenti: DEC-031, DEC-032,
DEC-033, DEC-035), all'uscita dalla console con le voci di secondo piano in
colonna (DEC-040), alla tessera ARCI (DEC-041), alla riorganizzazione dell'app
del cliente (DEC-042) e al dominio ranking (DEC-043). Non restano attivita
implementative bloccanti.

## Prossima attivita prioritaria

Provare nel browser locale il percorso torneo → prenotazione evento → torneo
con un account cliente, poi pubblicare codice e migration sulla beta dopo la
revisione. Aree: `app/pages/app/tornei/[id]`, `app/pages/app/eventi/[id].vue`,
`supabase/migrations/2026100210*.sql`.

Comportamento atteso: senza posto confermato l'iscrizione al torneo e guidata
verso l'evento; dopo la conferma si torna al torneo; la lista d'attesa resta
bloccata. Criterio di completamento: la checklist dedicata in
`docs/dev/guideline_test_features.md` e provata e le due migration risultano
applicate sull'ambiente destinatario. Verifica: percorso UI e
`supabase test db --local` (gia PASS: 284/284).

## USER ACTION REQUIRED

- **Sistemare gli indirizzi di Auth sul progetto Supabase remoto.** E cio che
  serve perche la registrazione via email funzioni: `Site URL` su
  `https://vrsus-website.pages.dev` e `Redirect URLs` con
  `https://vrsus-website.pages.dev/**`. Senza, l'indirizzo di ritorno chiesto
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
4. Configurazione OneSignal e separazione QUALITY/PRODUCTION, secondo
   `docs/dev/guideline_implementations.md`.

## Progettazione aperta

- **Notifiche della serata.** Durante l'evento la pagina Live dice quando tocca
  a te, ma bisogna aggiornarla a mano. Il proprietario ha chiesto un sistema di
  notifiche dedicato: va deciso cosa notificare (chiamata alla partita, una
  partita prima, apertura del check-in del torneo), su quale canale (inbox
  interna, push OneSignal) e con quale frequenza. Il calcolo di "quante partite
  mancano" e gia isolato in `shared/utils/live-day.ts` e riutilizzabile.

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
- `/admin/live` non e piu raggiungibile dal menu (DEC-036): resta valida per
  URL diretto. Se la plancia Live copre davvero tutto, la pagina va ritirata;
  se serve ancora, va deciso da dove aprirla.
- Le sfide non hanno una pagina pubblica in vetrina: si vedono solo dall'app,
  a cliente collegato. Se servira mostrarle a chi non ha un account, la view
  `public_game_rankings` e gia leggibile da `anon`.
- Registrazione sul posto: chi arriva senza prenotazione non ha oggi un modo
  per essere censito dalla console. La scheda `Partecipanti` mostra chi ha
  passato il QR, quindi l'ospite deve prenotare dall'app prima del check-in.
  Se serve davvero, va progettata una RPC che crei prenotazione e check-in in
  un gesto solo, con i dati minimi dell'ospite.
- Un account con il solo ruolo `staff` oggi non arriva al check-in dal menu,
  perche la plancia richiede `admin` o `super_admin`. Se servira uno staff che
  fa solo check-in, si abbassano i ruoli richiesti dalla plancia.

## Fuori scope deliberato

Moderazione dei feedback oltre il segna-come-letto, profili pubblici degli
utenti sulla vetrina, pagamenti online (vietati dalla specifica).
