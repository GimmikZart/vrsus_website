# Guideline Test Features

Questo documento contiene le procedure manuali per verificare le feature
implementate.

## Landing pubblica VRSUS

**Stato:** READY TO TEST

### Prerequisiti

- Node 22 e pnpm 10 disponibili.
- Dipendenze installate con `pnpm install`.
- `.env` creato da `.env.example`; per la sola landing sono sufficienti i
  valori DEV indicati dalla procedura di configurazione.

### Procedura di test

- [ ] 1. Avviare `pnpm dev`.
- [ ] 2. Aprire `http://127.0.0.1:3000/`.
- [ ] 3. Verificare il titolo hero, il marchio VRSUS e il CTA “Scopri il
      prossimo evento”.
- [ ] 4. Aprire `/evento` dal CTA o dalla navigazione.
- [ ] 5. Ridimensionare la finestra su viewport desktop e mobile; verificare
      che header, card e footer restino leggibili.
- [ ] 6. Attivare `prefers-reduced-motion` e verificare che non partano
      animazioni non necessarie.

### Risultato atteso

La landing e la pagina evento sono pubbliche, responsive, navigabili da
tastiera e non mostrano dati inventati come date, prezzi o numeri di capienza.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Area utente: eventi, tornei e profilo

**Stato:** READY TO TEST

### Prerequisiti

- Docker Desktop e Supabase DEV attivi.
- Un utente locale autenticato con profilo creato.
- Fixture pubbliche DEV disponibili; per il dettaglio torneo serve un torneo
  pubblicato.

### Procedura di test

- [ ] 1. Accedere a `/app` e verificare i collegamenti a eventi, tornei,
      notifiche e profilo.
- [ ] 2. Aprire `/app/eventi` e verificare che gli eventi pubblicati siano
      visibili; aprire i dettagli dell'evento seed `VRSUS Demo`.
- [ ] 3. Aprire `/app/tornei`, verificare i tornei pubblicati e aprire un
      dettaglio da `/app/tornei/[id]`.
- [ ] 4. Se il torneo e in `registration_open`, iscriversi e verificare che
      l'etichetta `Iscritto` e la entry personale compaiano dopo il reload.
- [ ] 5. Se il torneo richiede check-in, portarlo nello stato `checkin` e
      verificare il pulsante di conferma e il relativo stato.
- [ ] 6. Aprire `/app/profilo`, modificare nome visualizzato e dati facoltativi,
      salvare e verificare la persistenza dopo il reload.
- [ ] 7. Attivare/disattivare `Mostra il mio nome nelle classifiche pubbliche` e
      verificare che il profilo sia esposto solo quando il consenso e attivo.
- [ ] 8. Usare un browser anonimo e verificare il redirect al login per tutte
      le route `/app/*`.

### Risultato atteso

L'area personale mostra soltanto dati dell'utente autenticato; le iscrizioni
torneo usano le RPC esistenti, il profilo e modificabile nei soli campi
consentiti e le route protette non sono accessibili anonimamente.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Console admin impostazioni applicative

**Stato:** READY TO TEST

### Prerequisiti

- Docker Desktop e Supabase DEV attivi.
- Un utente locale autenticato con ruolo `admin` o `super_admin`.

### Procedura di test

- [ ] 1. Accedere a `/admin/impostazioni` e verificare che la pagina sia
      disponibile per admin/super-admin.
- [ ] 2. Salvare una chiave in formato `test.feature` con valore JSON valido,
      poi ricaricare la pagina e verificare che sia presente.
- [ ] 3. Selezionare l'impostazione presente, modificare il JSON e verificare
      che il nuovo valore sia conservato dopo il reload.
- [ ] 4. Provare a salvare JSON non valido e verificare il messaggio di
      validazione senza modifica nel database.
- [ ] 5. Verificare che la pagina non venga usata per password, token o secret.
- [ ] 6. Usare un browser anonimo e verificare il redirect al login; usare un
      utente senza ruolo admin e verificare il ritorno all'area personale.

### Risultato atteso

Le configurazioni leggere sono salvate nella tabella `site_settings` con
validazione della chiave e del JSON. La pagina resta protetta da autenticazione,
ruolo e RLS e non tratta segreti infrastrutturali.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Console CMS news e servizi

**Stato:** READY TO TEST in DEV.

### Prerequisiti

- Docker Desktop e Supabase DEV attivi.
- Un utente locale autenticato con ruolo `admin` o `super_admin`.
- Applicazione avviata con `pnpm dev`.

### Procedura di test

- [ ] 1. Accedere a `/login` con l'utente admin DEV e aprire `/admin`.
- [ ] 2. Aprire `/admin/news`, creare una news con titolo, contenuto e slug;
      salvarla come `draft` e verificare che non appaia in `/news`.
- [ ] 3. Modificare la stessa news impostando `published`, salvare e verificare
      che appaia in `/news` e nella relativa pagina dettaglio.
- [ ] 4. Impostare la news su `archived`; verificare che scompaia dalle route
      pubbliche e dalla sitemap.
- [ ] 5. Aprire `/admin/servizi`, creare o modificare un servizio e salvarlo
      come attivo; verificare la presenza in `/servizi`.
- [ ] 6. Disattivare il servizio; verificare che scompaia da `/servizi` e dalla
      sitemap.
- [ ] 7. Provare ad aprire `/admin/news` e `/admin/servizi` senza sessione;
      verificare il redirect a `/login`.
- [ ] 8. Eliminare o archiviare i contenuti creati durante il test e non usare
      dati reali nell'ambiente DEV.

### Risultato atteso

Solo utenti con ruolo admin possono modificare il CMS. Gli stati draft/archived
e i servizi inattivi non sono pubblici; la pubblicazione aggiorna le route e la
sitemap senza modifiche al codice.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Pagine pubbliche CMS

**Stato:** READY TO TEST in DEV.

### Prerequisiti

- Docker Desktop e Supabase DEV attivi.
- Seed locale applicato con `pnpm db:reset`.
- Applicazione avviata con `pnpm dev`.

### Procedura di test

- [ ] 1. Aprire `/esperienze`; verificare che compaiano le attività pubblicate
      e che la pagina gestisca correttamente loading, errore e lista vuota.
- [ ] 2. Aprire `/news`; verificare la news fixture `Benvenuti in VRSUS`, poi
      aprire il relativo dettaglio e controllare titolo, contenuto e canonical.
- [ ] 3. Aprire `/servizi`; verificare il servizio fixture `Eventi privati`, poi
      aprire il dettaglio e controllare titolo, contenuto e canonical.
- [ ] 4. Nel dettaglio servizio compilare il form con dati fittizi e inviare;
      verificare il messaggio di successo senza dati sensibili nella risposta.
- [ ] 5. Aprire `/regolamento`; verificare che venga mostrata l'attesa del testo
      ufficiale e che non siano presentate regole inventate.
- [ ] 6. Visitare `/sitemap.xml`; verificare la presenza degli slug pubblicati
      di eventi, news e servizi.
- [ ] 7. Impostare un contenuto in stato `draft` o `archived` nel database DEV;
      verificare che non compaia nelle route pubbliche, quindi ripristinare il
      fixture.

### Risultato atteso

Le pagine mostrano esclusivamente contenuti pubblicati dalle view `public_*`,
senza dati CMS interni; i dettagli sono navigabili e la sitemap include solo
gli slug pubblici. Il form crea un lead senza esporre le note interne.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Foundation database Supabase

**Stato:** READY TO TEST

### Prerequisiti

- Docker Desktop attivo.
- Stack locale avviato con `pnpm db:start`.
- `.env` locale configurato; non condividere né committare le chiavi.

### Procedura di test

- [ ] 1. Eseguire `pnpm db:reset` dalla root del repository.
- [ ] 2. Eseguire `pnpm db:test` e verificare il risultato `PASS`.
- [ ] 3. Aprire `http://127.0.0.1:54333` in Studio.
- [ ] 4. In `Table Editor`, verificare l'evento fittizio `VRSUS Demo`, quattro
      stazioni e quattro attività; non devono essere presenti dati reali.
- [ ] 5. In `SQL Editor`, eseguire `select * from public.public_events;` e
      verificare che non esista una colonna `max_capacity` nel risultato.

### Risultato atteso

Il reset ricrea schema e seed senza dashboard manuale. Le fixture sono
esclusivamente locali; la view pubblica protegge i dati di capienza interna.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Catalogo e dettaglio eventi pubblici

**Stato:** READY TO TEST

### Prerequisiti

- Docker Desktop attivo e stack Supabase VRSUS avviato.
- `.env` locale configurato; il seed locale deve contenere `VRSUS Demo`.
- Dipendenze installate con `pnpm install`.

### Procedura di test

- [ ] 1. Eseguire `pnpm db:reset` dalla root.
- [ ] 2. Avviare l'app con `pnpm dev`.
- [ ] 3. Aprire `/eventi` e verificare che compaia `VRSUS Demo`.
- [ ] 4. Aprire il card dell'evento e verificare `/eventi/vrsus-demo`.
- [ ] 5. Verificare titolo, descrizione, data, postazioni e attivita mostrati
      soltanto se presenti nel database.
- [ ] 6. Aprire `/robots.txt` e `/sitemap.xml`; verificare risposta valida.
- [ ] 7. In ambiente non production verificare `noindex, nofollow` e il
      disallow completo del crawling.

### Risultato atteso

Il catalogo usa dati della view pubblica, gestisce loading/error/empty state,
non mostra capienza o note interne e collega ogni evento al proprio slug.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Regola per nuove feature

Per ogni nuova feature aggiungere prerequisiti, procedura passo-passo,
risultato atteso, esito e spazio per i commenti utente.

## Prenotazioni, lista d’attesa e QR check-in

**Stato:** READY TO TEST in DEV.

### Prerequisiti

- Supabase DEV locale attivo e seed applicato.
- Un account utente DEV e un account con ruolo `staff` o `admin`.
- Un evento schedulato con prenotazioni abilitate; per testare la lista
  d’attesa impostare una capienza pari a 1.

### Procedura di test

- [ ] 1. Aprire il dettaglio evento senza sessione e verificare che la CTA
      prenotazione porti al login.
- [ ] 2. Accedere con l’utente DEV, prenotare l’evento e verificare lo stato
      `Confermata` nell’area `/app`.
- [ ] 3. Aprire il dettaglio prenotazione e verificare che il QR sia visibile;
      il contenuto non deve mostrare nome o email.
- [ ] 4. Con un secondo utente prenotare lo stesso evento pieno e verificare
      lo stato `Lista d’attesa`.
- [ ] 5. Annullare la prenotazione confermata dal primo utente e verificare la
      promozione FIFO e la notifica nella sua inbox `/app/notifiche`.
- [ ] 6. Da un dispositivo staff aprire `/admin/checkin`, scansionare il QR o
      incollare l’URL, registrare eventualmente `paid_on_site` e confermare.
- [ ] 7. Ripetere il check-in dello stesso QR e verificare che l’operazione sia
      idempotente e non crei un secondo record.
- [ ] 8. Aprire `/admin/live` e verificare contatori confermati, attesa,
      presenti e pagati senza visualizzare le note admin.

### Risultato atteso

La capienza è race-safe, la lista d’attesa promuove il primo utente eleggibile,
il QR è opaco e revocabile, lo staff autenticato può fare check-in una sola
volta e il pagamento sul posto non blocca la lettura.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Tornei, bracket e ranking

**Stato:** READY TO TEST in DEV.

### Prerequisiti

- Un account utente DEV e un account `tournament_admin` o `admin`.
- Un torneo creato da `/admin/tornei`, con stato `registration_open` e otto
  partecipanti fittizi.
- Almeno una postazione attiva configurata per l'evento.

### Procedura di test

- [ ] 1. Aprire `/tornei` e il dettaglio del torneo; verificare stato, regole e
      partecipanti pubblicabili.
- [ ] 2. Iscrivere otto utenti e verificare il rifiuto del doppio submit e la
      regola di una sola iscrizione attiva per torneo.
- [ ] 3. Se richiesto, eseguire il check-in torneo per ogni partecipante.
- [ ] 4. Da `/admin/tornei/<id>` generare il bracket e verificare che la seconda
      generazione sia idempotente.
- [ ] 5. Per un match pronto, assegnare una postazione, usare `Call players` e
      verificare le notifiche in-app dei due giocatori target. Se OneSignal è
      configurato, verificare anche la push; gli altri utenti non devono
      ricevere la chiamata.
- [ ] 6. Avviare il match, registrare i risultati round per round e verificare
      avanzamento, finalista e stato `completed`. Ripetere l'azione di salvataggio
      per verificare l'idempotenza.
- [ ] 7. Aprire `/ranking`, filtrare per attività e verificare che il vincitore e
      il secondo classificato ricevano punti una sola volta. Verificare anche il
      riepilogo ranking nella dashboard utente.
- [ ] 8. Verificare su mobile che bracket, elenco iscritti e controlli siano
      utilizzabili senza scroll orizzontale involontario.

### Risultato atteso

Le RPC validano ruoli e stato, il bracket single-elimination gestisce seed e bye,
i risultati avanzano una sola volta, il realtime aggiorna il bracket pubblico e
il ranking è derivato dal ledger auditabile.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Aggiustamento ranking admin

**Stato:** READY TO TEST in DEV.

### Prerequisiti

- Supabase DEV attivo.
- Un account autenticato con ruolo `admin` o `super_admin`.
- Almeno un profilo e un'attività attiva nel catalogo.

### Procedura di test

- [ ] 1. Aprire `/admin/ranking` e selezionare utente, attività, punti e
      motivazione.
- [ ] 2. Salvare e verificare il messaggio di successo.
- [ ] 3. Aprire `/ranking` e verificare che l'aggiustamento compaia nella
      classifica relativa all'attività quando il profilo/torneo è pubblico.
- [ ] 4. Ripetere con punti negativi e verificare che venga creata una nuova
      voce auditabile senza modificare lo storico del torneo.
- [ ] 5. Accedere con un utente senza ruolo e verificare il redirect dalla route.

### Risultato atteso

Soltanto admin e super-admin possono creare aggiustamenti. Ogni voce conserva
attore, attività, punti, motivazione e descrizione nel ledger/audit.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## PWA e comportamento offline

**Stato:** READY TO TEST in DEV/QUALITY.

### Procedura di test

- [ ] 1. Eseguire una build production e avviare il server preview.
- [ ] 2. Aprire il sito da Chrome mobile o desktop e installare la PWA.
- [ ] 3. Visitare una pagina pubblica, disconnettere la rete e ricaricare una
      route non amministrativa.
- [ ] 4. Verificare il fallback offline con istruzioni di riconnessione.
- [ ] 5. Verificare che le route `/admin` non siano servite dal fallback offline
      e richiedano rete/sessione.

### Risultato atteso

La PWA è installabile, aggiornata automaticamente e mostra il fallback offline;
prenotazioni, check-in e risultati restano esplicitamente online-only.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Inbox e notifiche push

**Stato:** READY TO TEST in DEV; push effettive solo dopo configurazione
OneSignal.

### Prerequisiti

- Supabase DEV locale attivo e un account utente autenticato.
- Per il test push, `NUXT_PUBLIC_ONESIGNAL_APP_ID` e
  `ONESIGNAL_REST_API_KEY` configurati nell'ambiente locale e un browser che
  supporti le notifiche web.

### Procedura di test

- [ ] 1. Aprire `/app/notifiche` e verificare la presenza delle notifiche
      applicative ricevute e del contatore non lette.
- [ ] 2. Abilitare le notifiche push dalle impostazioni, concedere il permesso
      del browser e verificare che la sottoscrizione del dispositivo venga
      salvata senza esporre la REST API key al client.
- [ ] 3. Disabilitare le push e verificare che la sottoscrizione attiva venga
      disattivata e la preferenza aggiornata.
- [ ] 4. Generare una chiamata giocatori da un torneo e verificare che il record
      inbox venga creato anche quando OneSignal non è configurato o restituisce
      errore.
- [ ] 5. Verificare che una chiamata indirizzata a due giocatori non compaia
      nell'inbox degli altri utenti.

### Risultato atteso

La notifica applicativa è la fonte persistente. La push è un canale aggiuntivo:
un errore o un provider non configurato non interrompe l'operazione business e
non rimuove la notifica dall'inbox.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Upload asset nelle console CMS

**Stato:** READY TO TEST in DEV.

### Prerequisiti

- Docker Desktop e Supabase DEV attivi con migration applicate.
- Un utente locale autenticato con ruolo `admin` o `super_admin`.
- Un file immagine di test JPEG, PNG, WebP, AVIF o SVG sotto i 5 MB.
- Applicazione avviata con `pnpm dev`.

### Procedura di test

- [ ] 1. Aprire `/admin/news`, `/admin/servizi`, `/admin/eventi` oppure
      `/admin/catalogo`.
- [ ] 2. Selezionare un file immagine valido dal controllo asset e verificare
      preview e messaggio di upload riuscito.
- [ ] 3. Salvare il record e ricaricare la pagina; verificare che il path
      dell'asset sia conservato e che la preview venga ricostruita.
- [ ] 4. Se il contenuto è pubblicabile, aprire la relativa route pubblica e
      verificare che l'immagine sia raggiungibile dal bucket.
- [ ] 5. Provare un file non immagine e un file oltre 5 MB; verificare che
      vengano rifiutati senza scritture indesiderate.
- [ ] 6. Usare il pulsante di rimozione, salvare e verificare che il campo
      venga svuotato. La pulizia fisica dell'oggetto può essere gestita in un
      passaggio amministrativo successivo se il file era già stato caricato.

### Risultato atteso

Il browser carica soltanto file immagine consentiti nel bucket `vrsus-assets`;
la sessione admin è necessaria per scrivere e il database conserva solo il
path. Gli utenti anonimi possono leggere gli asset del bucket pubblico ma non
possono caricare, modificare o cancellare oggetti.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Console admin eventi

**Stato:** READY TO TEST

### Prerequisiti

- Docker Desktop e Supabase DEV attivi.
- Un utente locale autenticato con ruolo `admin` o `super_admin`.

### Procedura di test

- [ ] 1. Accedere a `/login` con l’utente DEV e aprire `/admin/eventi`.
- [ ] 2. Verificare che l’evento seed `VRSUS Demo` sia presente nell’elenco.
- [ ] 3. Creare un evento in stato `draft` con titolo, slug, date e fine dopo
      l’inizio; salvare e verificare che compaia nell’elenco.
- [ ] 4. Modificare l’evento e verificare che prezzo, capienza, luogo e stato
      vengano conservati dopo il reload.
- [ ] 5. Verificare che `Pubblica sul sito` e `Visibilità capienza` siano scelte
      esplicite e che la capienza non venga mostrata dalla route pubblica quando
      la visibilità è `hidden`.
- [ ] 6. Provare una data di fine precedente all’inizio e verificare il messaggio
      di validazione senza scrittura nel database.
- [ ] 7. Duplicare un evento esistente, modificare slug/titolo/date e verificare
      che il nuovo evento nasca `draft`, privato e senza prenotazioni aperte;
      verificare che configurazione, attività e postazioni siano state copiate.
- [ ] 8. Archiviare un evento e verificare il badge `Archiviato`, la rimozione
      dalla pubblicazione e l'impossibilità di nuove prenotazioni.

### Risultato atteso

Solo admin e super-admin possono leggere/scrivere gli eventi raw. Il form salva
date ISO, prezzo in centesimi e capienza privata secondo i vincoli del database.
La duplicazione non copia prenotazioni, check-in o tornei; l'archiviazione è
auditabile e disabilita pubblicazione e booking.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Operazioni live: no-show e chiusura evento

**Stato:** READY TO TEST

### Prerequisiti

- Docker Desktop e Supabase DEV attivi.
- Un utente locale autenticato con ruolo `staff`, `admin` o `super_admin`.
- Un evento terminato o in corso con almeno una prenotazione confermata non
  ancora registrata al check-in.

### Procedura di test

- [ ] 1. Aprire `/admin/live` e selezionare l'evento operativo.
- [ ] 2. Verificare che la prenotazione confermata non registrata mostri il
      pulsante `Non presentato`.
- [ ] 3. Premere il pulsante e verificare che lo stato diventi `no_show`, che
      il QR non sia più utilizzabile e che il conteggio live si aggiorni.
- [ ] 4. Ripetere l'azione su una prenotazione già registrata e verificare che
      non sia consentita.
- [ ] 5. Verificare nell'audit log l'azione `booking_marked_no_show`.

### Risultato atteso

Il no-show è eseguibile soltanto da staff/admin su prenotazioni confermate,
non check-in e con evento chiuso o ancora in corso. L'operazione è idempotente
rispetto ai dati e non espone note interne al client.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Console admin catalogo

**Stato:** READY TO TEST

### Prerequisiti

- Docker Desktop e Supabase DEV attivi.
- Un utente locale autenticato con ruolo `admin` o `super_admin`.

### Procedura di test

- [ ] 1. Accedere a `/login` con l’utente DEV e aprire `/admin/catalogo`.
- [ ] 2. Verificare i tab `Attività` e `Postazioni` e la presenza dei fixture
      locali.
- [ ] 3. Creare un’attività con nome, slug e categoria; salvarla e verificare
      che compaia nell’elenco come attiva.
- [ ] 4. Modificare l’attività, disattivarla e verificare che il valore resti
      conservato dopo il reload.
- [ ] 5. Creare una postazione con categoria e capienza standard positiva;
      modificare poi la capienza e verificare il salvataggio.
- [ ] 6. Aprire la parte pubblica e verificare che gli elementi inattivi non
      siano esposti dalle view pubbliche.

### Risultato atteso

Solo admin e super-admin possono leggere/scrivere il catalogo raw. Attività e
postazioni inattive restano disponibili per configurazioni amministrative ma
non vengono pubblicate nelle view pubbliche.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Configurazione catalogo per evento

**Stato:** READY TO TEST

### Prerequisiti

- Docker Desktop e Supabase DEV attivi.
- Un utente locale autenticato con ruolo `admin` o `super_admin`.
- Almeno un evento, una postazione e un’attività attivi nel catalogo.

### Procedura di test

- [ ] 1. Accedere a `/admin/eventi` e aprire `Catalogo evento` su `VRSUS Demo`.
- [ ] 2. Selezionare una o più postazioni e attività, poi salvare.
- [ ] 3. Nella sezione associazioni, collegare un’attività a una postazione e
      salvare nuovamente.
- [ ] 4. Ricaricare la pagina e verificare che selezioni e associazioni siano
      conservate.
- [ ] 5. Rimuovere una selezione e verificare che l’associazione corrispondente
      scompaia senza modificare gli altri eventi.
- [ ] 6. Compilare un override di nome, descrizione, capienza e visibilità per
      una postazione o attività; salvare e verificare che il catalogo globale
      non venga alterato.
- [ ] 7. Verificare nella route pubblica dell’evento che siano esposte soltanto
      le attività/postazioni configurate e pubblicabili.

### Risultato atteso

La configurazione è isolata per evento: un’attività può essere collegata a più
postazioni e una postazione può offrire più attività. Gli override non cambiano
il catalogo globale; le scritture raw sono consentite solo a admin e
super-admin tramite RLS.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Autenticazione e RBAC

**Stato:** READY TO TEST

### Prerequisiti

- Docker Desktop e Supabase DEV attivi.
- Un utente locale creato in Studio > Authentication > Users.
- Per verificare `/admin`, assegnare manualmente il ruolo `admin` soltanto a
  un utente fittizio DEV tramite SQL Editor; non usare account reali.

### Procedura di test

- [ ] 1. Aprire `/login` e inviare credenziali errate; verificare il messaggio
      generico senza dettagli sensibili.
- [ ] 2. Accedere con l'utente locale; verificare il redirect a `/app` e il
      caricamento dell'email/profilo.
- [ ] 3. Aprire `/admin` con un utente senza ruolo admin; verificare il ritorno
      a `/app` con messaggio di permessi insufficienti.
- [ ] 4. Assegnare `admin` all'utente DEV nel database e ricaricare `/admin`;
      verificare la console protetta.
- [ ] 5. Fare logout e verificare che `/app` e `/admin` tornino a `/login`.
- [ ] 6. Rimuovere l'utente fittizio dopo il test.

### Risultato atteso

La sessione persiste tra le route, il profilo viene creato al primo accesso,
le route applicano autenticazione e ruolo, e nessun secret server-only compare
nel browser.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->
