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

### Risultato atteso

Solo admin e super-admin possono leggere/scrivere gli eventi raw. Il form salva
date ISO, prezzo in centesimi e capienza privata secondo i vincoli del database.

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
- [ ] 6. Verificare nella route pubblica dell’evento che siano esposte soltanto
      le attività/postazioni configurate e pubblicabili.

### Risultato atteso

La configurazione è isolata per evento: un’attività può essere collegata a più
postazioni e una postazione può offrire più attività. Le scritture raw sono
consentite solo a admin e super-admin tramite RLS.

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
