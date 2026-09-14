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

## Dominio evento admin dietro endpoint service-role

Verifica che le console del dominio evento funzionino dopo il passaggio agli
endpoint `/api/admin/events` (DEC-018) e che l'autorizzazione resti chiusa.

### Prerequisiti

- stack locale avviato e fixture applicate (`pnpm db:start`, `pnpm db:reset`);
- un account con ruolo `super_admin` o `admin`;
- un secondo account con il solo ruolo `user`;
- creazione degli account descritta in `guideline_implementations.md`.

### Procedura

- [ ] 1. Da admin aprire `/admin/eventi`: la lista deve mostrare gli eventi
      senza il messaggio "Impossibile caricare gli eventi".
- [ ] 2. Creare un evento con titolo, inizio e fine; deve comparire in lista.
- [ ] 3. Riaprirlo con "Modifica", cambiare la capienza e salvare; il valore
      deve persistere dopo un ricaricamento della pagina.
- [ ] 4. Salvare un secondo evento riusando lo slug del primo: deve comparire
      "Esiste gia un evento con questo slug".
- [ ] 5. Impostare una fine precedente all'inizio: il salvataggio deve essere
      rifiutato con un messaggio di errore, non con una pagina bianca.
- [ ] 6. Usare "Duplica", salvare e verificare che la copia nasca in `draft`,
      non pubblica e con la configurazione copiata.
- [ ] 7. Aprire "Catalogo evento" (`/admin/eventi/[id]`): postazioni e attivita
      gia configurate devono risultare selezionate.
- [ ] 8. Nella matrice "Associa attivita e postazioni" le combinazioni gia
      salvate devono risultare spuntate. Cambiarne una, salvare, ricaricare:
      la modifica deve persistere.
- [ ] 9. Deselezionare una postazione e salvare: le sue associazioni devono
      sparire insieme alla postazione.
- [ ] 10. Da un torneo in `/admin/tornei/[id]` verificare che il selettore
      postazioni elenchi le postazioni attive dell'evento.
- [ ] 11. Fare logout, accedere con l'account `user` e aprire `/admin/eventi`:
      si deve essere rimandati fuori dalla console.
- [ ] 12. Sempre come `user`, con gli strumenti sviluppatore, chiamare
      `fetch('/api/admin/events')`: deve rispondere `403`.
- [ ] 13. Da browser anonimo chiamare lo stesso endpoint: deve rispondere
      `401`.

### Risultato atteso

Le console del dominio evento funzionano senza errori di permesso, la
configurazione di un evento si salva in una sola operazione e resta coerente
dopo il ricaricamento, e gli endpoint restano chiusi ad anonimi e utenti senza
ruolo admin. La capienza non deve mai comparire nelle route pubbliche se la
visibilita e `hidden`.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## V2 — Vetrina, registrazione e app utente

Copre la riorganizzazione descritta in `docs/technical/VRSUS_APP_SPEC_V2.md`.

### Prerequisiti

- stack locale avviato e fixture applicate (`pnpm db:start`, `pnpm db:reset`);
- account DEV creati secondo la procedura di
  `guideline_implementations.md`, incluso un account con data di nascita che
  lo renda minorenne.

### Vetrina

- [ ] 1. Aprire `/` da telefono (o finestra a 375 px): la locandina del
      prossimo evento deve stare in cima, con data, luogo e costo.
- [ ] 2. L'hamburger in alto a destra apre le quattro voci piu "Accedi" e
      "Registrati". Da `lg` in su le voci sono in orizzontale e l'hamburger
      sparisce.
- [ ] 3. `/postazioni` mostra le card delle postazioni pubbliche. La
      postazione interna non deve comparire.
- [ ] 4. Aprire una postazione: si vedono i giochi associati.
- [ ] 5. `/chi-siamo` e `/servizi` rendono il contenuto senza errori.

### Registrazione

- [ ] 6. In `/registrati` inserire una data di nascita da maggiorenne: la
      sezione del consenso non deve comparire.
- [ ] 7. Cambiare la data in una da minorenne: la sezione compare senza
      ricaricare la pagina e senza perdere i dati gia inseriti.
- [ ] 8. Provare un nickname gia esistente: deve essere segnalato prima
      dell'invio.
- [ ] 9. Completare la registrazione di un minorenne con il consenso.

### App utente

- [ ] 10. La tab bar in basso ha cinque icone e non e coperta dalla home
      indicator del telefono.
- [ ] 11. Dashboard: la card mostra le informazioni dell'evento e l'invito a
      prenotarsi.
- [ ] 12. Prenotare: si passa da una pagina di conferma, poi la card diventa
      il biglietto con il QR.
- [ ] 13. Ranking: i selettori postazione e gioco filtrano; senza gioco si
      vedono i punti, con un gioco il record.
- [ ] 14. Tornei: i prossimi hanno il bordo acceso, quelli a cui si e iscritti
      il bordo verde, i passati nessun bordo. Ogni bordo ha anche l'etichetta
      testuale.
- [ ] 15. Iscriversi a un torneo passando dalla pagina di conferma.
- [ ] 16. Bacheca: votare un sondaggio e verificare le percentuali; inviare un
      messaggio dal pulsante "Scrivici".
- [ ] 17. Impostazioni: cambiare nickname e fare logout.

### Consenso genitoriale

- [ ] 18. Con l'account minorenne senza consenso, provare a prenotare: deve
      comparire la spiegazione e il rimando alle impostazioni.
- [ ] 19. Registrare il consenso dalle impostazioni e riprovare: la
      prenotazione deve andare a buon fine.

### Console admin

- [ ] 20. `/admin` mostra utenti registrati, tornei attivi, prossimo evento con
      confermati/attesa/check-in e andamento partecipanti.
- [ ] 21. `/admin/piattaforme`: creare una postazione, marcarla interna e
      verificare che sparisca da `/postazioni`.
- [ ] 22. `/admin/giochi`: creare un gioco e verificare la label della
      postazione in alto a destra sulla card.
- [ ] 23. `/admin/eventi`: creare un evento indicando il tipo, poi configurare
      postazioni e giochi da "Catalogo evento".
- [ ] 24. `/admin/tornei`: creare un torneo indipendente da un evento e uno
      dentro un evento, con schema di punteggio.
- [ ] 25. `/admin/bacheca`: pubblicare un annuncio e un sondaggio, verificarli
      nell'app utente.

### Risultato atteso

La vetrina non mostra mai postazioni o giochi interni; la capienza resta
privata; il QR appare solo dopo la conferma; un minorenne senza consenso non
riesce a prenotare nemmeno chiamando direttamente l'API; i contenuti creati in
console compaiono in vetrina e nell'app.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Console dinamica, scheda utente e scheda torneo

Copre la revisione della console descritta in DEC-031 e DEC-032.

### Prerequisiti

- stack locale avviato e fixture applicate (`pnpm db:start`, `pnpm db:reset`);
- account DEV ricreati, incluso un utente non admin con prenotazione
  confermata sull'evento demo;
- un evento in stato `scheduled` con almeno un torneo collegato.

### Shell della console

- [ ] 1. Entrare in `/admin` da telefono: nell'intestazione deve esserci solo
      "Console". Il collegamento "Area personale" non deve piu esistere.

### Dashboard con evento programmato

- [ ] 2. `/admin` mostra in alto il prossimo evento con giorno e orario,
      prezzo della giornata, numero di postazioni e prenotati sulla capienza.
- [ ] 3. Scheda "Prenotati": il totale in cima corrisponde al numero di righe.
      Su desktop e una tabella con nome, cognome, eta, tornei e "prima volta";
      sotto i 1024 px diventa una lista di card con le stesse informazioni.
- [ ] 4. Il segno di spunta "prima volta" compare solo per chi non ha
      prenotazioni su eventi precedenti. Verificarlo prenotando lo stesso
      utente su un evento gia passato: il segno deve sparire.
- [ ] 5. La colonna "Tornei" elenca i tornei dell'evento a cui la persona e
      iscritta, separati da `|`.
- [ ] 6. Scheda "Tornei": piattaforma, gioco, orario, stato e iscritti.
- [ ] 7. Toccare una riga di un prenotato apre la sua scheda utente.

### Start evento

- [ ] 8. Premere "Start evento": deve chiedere conferma prima di procedere.
- [ ] 9. Confermare: l'evento passa in modalita live e il messaggio indica
      quanti iscritti sono stati avvisati.
- [ ] 10. Con l'account utente iscritto, aprire `/app/notifiche`: deve esserci
      l'avviso di inizio evento.

### Dashboard con evento in corso

- [ ] 11. L'intestazione diventa rossa con l'etichetta "Live" e mostra i
      presenti, non i prenotati.
- [ ] 12. Scheda "Partecipanti": vuota finche nessuno ha passato il QR code.
      Fare un check-in da `/admin/checkin` e verificare che la persona compaia.
- [ ] 13. Scheda "Tornei": conto alla rovescia prima dell'orario di inizio,
      "Inizia a breve" nell'ultima mezz'ora, cronometro quando il torneo e in
      corso, e i conteggi di iscritti, presenti e partite giocate.

### Scheda utente

- [ ] 14. Aprire `/admin/utenti/[id]`: in alto iniziali, nickname, nome
      completo, eta, recapiti, ruoli e i quattro numeri (eventi, presenze,
      tornei, punti).
- [ ] 15. Se l'utente e minorenne compare l'etichetta del consenso, verde con
      consenso registrato e ambra senza.
- [ ] 16. Scheda "Eventi": prima i futuri con il bordo acceso, poi i passati.
- [ ] 17. Scheda "Tornei": ogni iscrizione mostra il piazzamento quando esiste,
      con la corona ai primi tre.
- [ ] 18. Scheda "Ranking": i filtri piattaforma e gioco riducono l'elenco; il
      filtro gioco si azzera cambiando piattaforma.

### Scheda torneo in console

- [ ] 19. Aprire un torneo da `/admin/tornei`: intestazione con stato,
      piattaforma, gioco, tipo, data, iscritti e partite giocate.
- [ ] 20. "Iscrivi un utente": il selettore non deve proporre chi e gia
      iscritto. Iscrivere qualcuno e verificarlo in classifica.
- [ ] 21. Rimuovere un iscritto non ancora sorteggiato: sparisce. Rimuovere un
      iscritto gia presente in un incontro: resta come ritirato.
- [ ] 22. Portare il torneo da bozza a iscrizioni aperte, chiuse, check-in.
      Fare il check-in degli iscritti dalla classifica.
- [ ] 23. "Avvia torneo": genera il tabellone (eliminazione diretta) o il
      calendario (girone) e porta il torneo in corso.
- [ ] 24. Scheda "Partite": con l'eliminazione diretta il tabellone e a
      colonne, con i collegamenti che uniscono le coppie al round successivo.
      Su schermo stretto scorre in orizzontale da solo, senza muovere la
      pagina.
- [ ] 25. Toccare un incontro: assegnare la postazione, chiamare i giocatori,
      avviare il match, inserire i punteggi e il vincitore, salvare. Il
      pulsante di salvataggio resta disabilitato finche il match non e
      avviato.
- [ ] 26. A incontro concluso resta disponibile solo la correzione del
      punteggio.
- [ ] 27. Alla fine del torneo l'intestazione mostra il vincitore con la corona
      e la classifica assegna oro, argento e bronzo ai primi tre.
- [ ] 28. "Modifica" apre il modulo con i dati del torneo e li salva.
      "Elimina" chiede conferma prima di cancellare.

### Scheda torneo lato utente

- [ ] 29. Con un account utente aprire lo stesso torneo da `/app/tornei`: la
      pagina ha la stessa struttura ma mostra i soli nickname, senza nome,
      cognome, eta e senza comandi.
- [ ] 30. Se il torneo non ha ancora risultati, la classifica dichiara di
      seguire l'ordine di iscrizione e nessuna corona viene mostrata.

### Risultato atteso

La console apre sempre sull'evento che conta; i dati anagrafici compaiono solo
in console; l'app utente vede la stessa struttura senza dati personali e senza
comandi; il tabellone e leggibile su telefono; nessuna azione riservata e
raggiungibile senza il ruolo giusto.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Wizard evento e revisione della dashboard

Copre le modifiche descritte in DEC-033 e DEC-034.

### Prerequisiti

- stack locale avviato e fixture applicate (`pnpm db:start`, `pnpm db:reset`);
- account admin o super_admin;
- almeno una postazione con qualche gioco a catalogo.

### Dashboard

- [ ] 1. In fondo a `/admin` non ci sono card di riepilogo su utenti, richieste
      o feedback.
- [ ] 2. Scorrendo la pagina la barra delle schede resta agganciata sotto
      l'intestazione e permette di cambiare vista senza risalire.
- [ ] 3. Scheda "Piattaforme": una card per ogni postazione dell'evento, con i
      giochi resi disponibili elencati dentro la card.
- [ ] 4. Scheda "Tornei": ogni card mostra l'orario di inizio. Il conto alla
      rovescia compare solo nell'ultima ora prima dell'inizio; a torneo
      avviato compare il cronometro.
- [ ] 5. I tornei elencati sono solo quelli dell'evento mostrato.

### Elenco eventi

- [ ] 6. La pagina contiene solo l'elenco: nessun form di creazione.
- [ ] 7. "Nuovo evento" apre `/admin/eventi/nuovo`.
- [ ] 8. "Duplica" crea con un clic una copia in bozza non pubblicata e apre il
      wizard sulla copia. Verificare nella scheda Piattaforme che postazioni e
      giochi siano stati copiati.
- [ ] 9. "Elimina" chiede conferma e poi rimuove l'evento. Provarlo su un
      evento che ha almeno un torneo e una prenotazione: deve sparire tutto,
      senza errori.

### Wizard di creazione

- [ ] 10. La scheda Info contiene solo: titolo, slug, tipo evento, inizio,
      fine, apertura e chiusura prenotazioni, prezzo sul posto, capienza
      massima, luogo, indirizzo, cover locandina e le quattro caselle.
- [ ] 11. "Avanti" salva l'evento come bozza e porta alla scheda Piattaforme
      dell'evento appena creato.
- [ ] 12. Selezionando una postazione la card si apre da sola sull'elenco dei
      giochi. Le caselle dei giochi restano disattivate finche la postazione
      non e selezionata.
- [ ] 13. "Avanti" salva la configurazione e porta alla scheda Tornei.
- [ ] 14. "Crea torneo": la select delle postazioni mostra solo quelle scelte
      per l'evento e quella dei giochi solo i giochi resi disponibili su quella
      postazione.
- [ ] 15. Alla creazione si torna al wizard e il torneo compare come card con
      piattaforma, gioco, orario, tipo e massimo di partecipanti.
- [ ] 16. "Salva evento" riporta all'elenco. Con "Pubblica sul sito" spuntata
      l'evento risulta pubblico e programmato; senza, resta bozza e privato.
- [ ] 17. Riaprendo l'evento con "Modifica" i tre passi mostrano i dati
      salvati.

### Spaziature e sticky

- [ ] 18. A 375 px le pagine della console usano tutta la larghezza utile: il
      contenuto non e stretto fra due margini larghi.
- [ ] 19. Scorrendo una pagina lunga l'intestazione della console resta in
      alto.
- [ ] 20. Nessuna pagina scorre in orizzontale. Tabelle e tabelloni scorrono
      dentro il proprio riquadro.

### Risultato atteso

La console apre sull'evento che conta; creare un evento e un percorso a tre
passi salvabile in bozza; duplicazione ed eliminazione fanno quello che
promettono; su telefono il contenuto respira senza sprecare spazio.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Tema scuro, scheda evento e liste tornei

### Prerequisiti

- stack locale avviato, account admin, e possibilmente i dati dimostrativi
  descritti in `guideline_implementations.md`.

### Componenti e leggibilita

- [ ] 1. Aprire una maschera con molti campi (`/admin/eventi/nuovo`): i campi
      sono scuri, il testo si legge, nessuna casella bianca.
- [ ] 2. Aprire una select e scorrere le voci: la tendina e scura e le voci si
      leggono.
- [ ] 3. I pulsanti pieni sono nel rosso del marchio, non rosa.
- [ ] 4. Gli angoli delle card sono quelli di sempre, non esagerati.

### Dashboard

- [ ] 5. Non c'e piu il pulsante "Aggiorna".
- [ ] 6. Con evento programmato si vedono solo "Modifica" e "Start evento".
- [ ] 7. Dopo l'avvio restano "Modifica" e "Check-in".

### Scheda evento

- [ ] 8. In `/admin/eventi` toccare il titolo di un evento apre la sua scheda.
- [ ] 9. La scheda mostra informazioni e le tre schede, senza comandi.

### Tornei

- [ ] 10. `/admin/tornei` ha le schede In corso, In programma e Storico. La
      prima compare solo se un torneo e in corso.
- [ ] 11. Nella scheda di un torneo la testata mostra stato, piattaforma, nome
      e vincitore; "Mostra dettagli" apre il resto.
- [ ] 12. Torneo a eliminazione diretta con sedici iscritti: il tabellone ha
      quattro colonne e i collegamenti uniscono le coppie.
- [ ] 13. Torneo a girone con sedici iscritti: la classifica e ordinata per
      vittorie e l'elenco incontri riporta i punteggi.

### Giochi

- [ ] 14. Su telefono la griglia dei giochi e a due colonne.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Plancia Live, scheda della giornata e postazioni su telefono

### Prerequisiti

- stack locale avviato e dati dimostrativi caricati
  (`supabase/dev/demo_showcase.sql`);
- account con ruolo `admin` o `super_admin`;
- almeno un evento in stato `running` per le prove sul pallino, piu un evento
  `scheduled` per il confronto.

### Intestazione e pallino

- [ ] 1. Aprire `/admin` con un evento in corso: in alto c'e la scritta `Live`
      con un pallino rosso che lampeggia, non "Evento in corso".
- [ ] 2. Nella tab bar (in basso su telefono, a sinistra su desktop) la prima
      voce si chiama `Live` e la sua icona e lo stesso pallino lampeggiante.
- [ ] 3. Chiudere l'evento oppure aprire la console senza eventi in corso: la
      voce `Live` torna a mostrare l'icona normale e l'intestazione dice
      "Prossimo evento".

### Scheda della giornata

- [ ] 4. La scheda in alto mostra, in quest'ordine: pastiglia di stato con
      pallino, sede, comando `Dettagli`, giorno e fascia oraria in grande, e a
      destra il numero dei presenti sul totale dei prenotati.
- [ ] 5. Toccare `Dettagli`: la griglia con prezzo, postazioni, tornei e
      capienza si chiude e la scheda si accorcia; toccandolo di nuovo torna
      aperta.
- [ ] 6. Le azioni (`Modifica`, `Check-in` o `Start evento`) restano sempre
      visibili nel piede della scheda, anche a dettagli chiusi.
- [ ] 7. Ripetere le prove 4-6 su telefono a 375 px: nessun testo tagliato,
      nessuno scorrimento orizzontale.

### Schede

- [ ] 8. A evento avviato l'etichetta della prima scheda e `Partecipanti` con
      il numero nella forma `12/36`: a sinistra chi ha fatto il check-in, a
      destra chi ha prenotato.
- [ ] 9. Sotto le schede non compare piu la riga che ripete il numero dei
      partecipanti: l'elenco comincia subito.
- [ ] 10. Nella scheda `Tornei` i tornei in corso stanno in cima, poi quelli da
      giocare, in fondo i conclusi, piu attenuati.

### Postazioni e menu Altro

- [ ] 11. Su telefono `/postazioni` (vetrina) e `/admin/piattaforme` (console)
      mostrano due card per riga. Su desktop restano tre.
- [ ] 12. In `/admin/altro` non ci sono piu `Live evento` e `Check-in`: il
      check-in si apre dal pulsante sulla plancia Live.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Tornei elastici: manche, tempi e squadre

### Prerequisiti

- stack locale avviato, account admin e almeno sedici utenti demo
  (`supabase/dev/demo_showcase.sql`);
- per le prove sulle squadre servono due account utente diversi, anche su due
  browser o in finestra anonima.

### Creazione

- [ ] 1. Aprire `/admin/tornei` e premere "Nuovo torneo". In alto c'e "Tipo di
      torneo" con i preset; sotto i tre blocchi "Chi gioca", "Come ci si
      affronta", "Come si vince".
- [ ] 2. Scegliere il preset "Manche a punti": il modulo si adatta da solo
      (gruppi da quattro, tre manche, ordine di arrivo, punti 10/8/6/4).
- [ ] 3. Il riquadro azzurro in fondo mostra la frase "Come si giochera" e,
      se ci sono iscritti, quante partite verranno create.
- [ ] 4. Non esiste piu il campo Slug. Descrizione e regole sono aree di testo
      alte piu righe.
- [ ] 5. Creare il torneo e riaprirlo: lo slug e
      `piattaforma-gioco-data`, visibile in "Mostra dettagli".

### Manche

- [ ] 6. Iscrivere sedici utenti e avviare il torneo: si creano tre manche da
      quattro gruppi.
- [ ] 7. Aprire una partita: c'e una riga per concorrente con la casella della
      posizione di arrivo. Il pulsante resta bloccato finche le posizioni non
      sono tutte diverse, e il motivo e scritto sotto.
- [ ] 8. Salvare: la card mostra l'ordine di arrivo con i punti (+10, +8, +6,
      +4) e la classifica somma i punti, non le vittorie.
- [ ] 9. Controllare che nelle tre manche nessuno incontri due volte lo stesso
      avversario.
- [ ] 10. A manche finite il torneo si chiude da solo e il primo in classifica
      risulta vincitore.

### Tempi

- [ ] 11. Creare un torneo con preset "Time attack" su Gran Turismo e due
      tentativi. Le partite hanno un solo concorrente.
- [ ] 12. Registrare i tempi in secondi: la classifica ordina dal tempo piu
      basso e mostra il distacco dal migliore.

### Squadre

- [ ] 13. Creare un torneo "Coppie a eliminazione" con squadre a invito e
      iscrizioni aperte.
- [ ] 14. Dal primo account aprire il torneo nell'app, creare una squadra: la
      scheda "Squadre" mostra il codice di sei caratteri, visibile solo al
      capitano.
- [ ] 15. Dal secondo account provare a entrare senza codice: deve essere
      rifiutato. Con il codice deve entrare, e la squadra passa a completa.
- [ ] 16. In console, con una squadra incompleta, provare ad avviare il torneo:
      deve rifiutare e indicare le squadre spaiate. Completarla con "Aggiungi"
      oppure eliminarla, poi avviare.
- [ ] 17. La classifica mostra il nome della squadra con sotto i nickname dei
      componenti.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## Uscita dalla console, schede prenotati/partecipanti e tessera ARCI

**Prerequisiti.** Ambiente locale avviato, account `super_admin` (o `admin`) e
un account utente normale. Utile la giornata dimostrativa
(`supabase/dev/demo_showcase.sql`) e almeno un evento gia concluso.

### Uscita e navigazione della console

- [ ] 1. Aprire `/admin` su schermo largo (>= 1280 px). La colonna di sinistra
      mostra Live, Eventi, Tornei, Postazioni, Giochi e poi i gruppi
      "Contenuti" e "Amministrazione". La voce "Altro" non c'e.
- [ ] 2. In fondo alla colonna compaiono l'indirizzo dell'account e il comando
      `Esci`. Premendolo si torna alla home pubblica da disconnessi; rientrando
      in `/admin` si viene mandati al login.
- [ ] 3. Ridurre la finestra a 375 px (o aprire da telefono): la barra in basso
      torna a sei voci con "Altro", e la pagina Altro chiude con la sezione
      "Sessione" e lo stesso comando `Esci`.
- [ ] 4. Con un account `staff` verificare che la colonna mostri solo le voci
      permesse e comunque il comando di uscita.
- [ ] 5. Nell'area utente (`/app`) la colonna di sinistra mostra lo stesso
      piede con `Esci`.

### Prenotati e partecipanti

- [ ] 6. Aprire un evento **non ancora avviato** (`/admin/eventi/<id>`): esiste
      la scheda `Prenotati`, non esiste `Partecipanti`.
- [ ] 7. Aprire la plancia con un evento **in corso**: ci sono entrambe, si
      apre su `Partecipanti`, e i due numeri si leggono insieme
      (per esempio `Prenotati 16` e `Partecipanti 12`).
- [ ] 8. Fare il check-in di una persona e ricaricare: il numero dei
      partecipanti sale, quello dei prenotati resta.
- [ ] 9. Aprire un evento **concluso**: lo stato dice "Conclusa", entrambe le
      schede ci sono, e `Partecipanti` elenca chi era effettivamente entrato.

### Tessera ARCI

- [ ] 10. Console -> `Impostazioni sito`, riquadro "Tessere ARCI": leggere il
      conteggio dei tesserati e la data di inizio della stagione corrente.
- [ ] 11. Aprire la scheda di un utente senza tessera: badge "Senza tessera" e
      comando `Registra tessera ARCI`. Premerlo: il badge diventa "Tessera
      ARCI" con la data, il comando diventa `Revoca tessera`.
- [ ] 12. Dall'account di quell'utente aprire `/app/impostazioni`: il riquadro
      "Tessera ARCI" dice che risulta valida.
- [ ] 13. Dallo stesso account provare a modificare il proprio profilo: non
      esiste nessun comando per spuntarsi la tessera (la scrittura diretta e
      rifiutata dal database).
- [ ] 14. Wizard evento, primo passo: togliere "Tessera ARCI obbligatoria" e
      salvare. In vetrina l'evento non mostra piu il chip "Tessera ARCI
      richiesta"; rimettendola il chip torna, insieme all'avviso sopra il
      comando di prenotazione.
- [ ] 15. Aprire la conferma di prenotazione (`/app/prenota/<id>`) con un
      account senza tessera: riga "Tessera ARCI — Obbligatoria" e avviso
      giallo. Con un account tesserato l'avviso diventa la riga verde.
- [ ] 16. Biglietto (`/app/prenotazioni/<id>`) e scheda del torneo ospitato
      dalla giornata: dicono anche loro che la tessera serve.
- [ ] 17. Check-in: scansionare il QR di un prenotato senza tessera su una
      giornata che la richiede. Dopo il check-in compare il riquadro giallo
      "Tessera ARCI mancante" con il comando `Tessera vista`; premendolo il
      riquadro diventa verde. Su una giornata senza obbligo compare la riga
      "Questa giornata non richiede la tessera ARCI".
- [ ] 18. Nella lista `Prenotati` della plancia, chi non ha la tessera e
      marcato "mancante" e in cima compare l'avviso con il conteggio.
- [ ] 19. `Impostazioni sito` -> `Azzera tessere adesso` -> conferma: il
      conteggio dei tesserati va a zero e le schede utente tornano "Senza
      tessera". Rileggere la data di inizio stagione: e adesso.
- [ ] 20. Cambiare la data di rinnovo (giorno e mese) e salvare: il testo della
      stagione corrente si aggiorna di conseguenza.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

## App del cliente: bacheca, eventi, serata e sfide

**Prerequisiti.** Un account cliente senza ruoli, un account admin, una serata
in corso e una data programmata. In locale aiutano
`supabase/dev/demo_showcase.sql` e `supabase/dev/demo_rankings.sql`.

### Bacheca e invito

- [ ] 1. Da cliente aprire `/app`: la prima voce della barra e "Bacheca" con
      l'icona del giornale, e la pagina mostra annunci e sondaggi.
- [ ] 2. Con una data pubblica programmata, sopra la bacheca compare l'invito
      con nome, giorno e ora, prezzo e tessera ARCI. Il comando porta alla
      scheda dell'evento, non prenota da solo.
- [ ] 3. Mettere in bozza (o concludere) tutte le date programmate: l'invito
      sparisce e resta la sola bacheca.
- [ ] 4. Dopo aver prenotato, l'invito mostra "Sei prenotato" e il comando
      diventa "Apri l'evento".

### Eventi

- [ ] 5. `/app/eventi`: le giornate sono divise in "In corso", "In programma" e
      "Storico". Nessun comando di modifica.
- [ ] 6. Aprire una data programmata: informazioni, tornei della giornata,
      postazioni con i giochi.
- [ ] 7. Premere "Prenota il tuo posto": si apre una finestra con evento,
      orario, costo e tessera. "Annulla" non prenota; "Prenota" si.
- [ ] 8. Dopo la conferma la scheda dice "Sei prenotato" e offre il biglietto.
- [ ] 9. Con un account minorenne senza consenso, al posto del comando compare
      l'invito ad aggiungere il consenso dalle impostazioni.

### Serata (Live)

- [ ] 10. Con nessun evento in corso la voce "Live" non c'e. Avviare l'evento
      dalla console: ricaricando l'app la voce compare per prima, con il
      pallino rosso.
- [ ] 11. Da cliente prenotato e non ancora entrato: la pagina Live mostra il
      biglietto con il QR.
- [ ] 12. Da cliente senza prenotazione: al posto del biglietto c'e la riga che
      dice di chiedere al personale.
- [ ] 13. Fare il check-in di quel cliente dalla console e ricaricare: il
      biglietto sparisce e compare "I tuoi tornei" con la prossima partita,
      l'avversario e quante partite mancano.
- [ ] 14. Le schede in fondo sono due, "Tornei" e "Piattaforme": nessuna lista
      di prenotati o presenti.
- [ ] 15. Chiudere la partita che precede la sua dalla console e premere
      "Aggiorna": il conteggio scende ("Sei il prossimo").

### Ranking

- [ ] 16. Console, pagina di un gioco: sezione "Ranking" -> "Nuovo ranking".
      Creare una sfida con nome, regolamento, tempo o punteggio e scadenza.
- [ ] 17. Nella scheda della sfida registrare un punteggio per un cliente: la
      classifica si aggiorna e il tentativo compare nell'elenco.
- [ ] 18. Registrare un secondo tentativo peggiore dello stesso cliente: la
      classifica tiene il migliore e segna due tentativi.
- [ ] 19. Eliminare un tentativo dall'elenco: sparisce dalla classifica.
- [ ] 20. Chiudere la sfida dalle impostazioni: il comando "Registra" si
      disattiva.
- [ ] 21. App, `/app/ranking`: la prima tenda parte da "Punti VRSUS" e le altre
      voci sono solo le postazioni che hanno una sfida.
- [ ] 22. Scegliere una postazione: compare la tenda dei giochi (solo quelli
      con sfide) e sotto la tenda delle sfide, aperta sull'ultima creata.
- [ ] 23. La scheda sopra la classifica mostra stato, scadenza e regolamento
      della sfida.
- [ ] 24. Su una sfida a tempo la classifica ordina dal tempo piu basso e lo
      scrive come `6:36.402`; su una a punteggio dal piu alto.

### Esito manuale

- [ ] PASS
- [ ] FAIL
- [ ] DA RITESTARE

### Commenti utente

<!-- Inserire qui eventuali osservazioni -->

