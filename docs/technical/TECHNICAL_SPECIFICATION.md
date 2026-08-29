# VRSUS — Specifiche Tecniche, Architettura e Roadmap di Sviluppo

> **Documento principale di progetto / Source of Truth per agenti AI**
>
> Versione: **1.2 — AI Execution Hardened + Content Policy**
>
> Data: **29 agosto 2026**
>
> Stato: **SPECIFICA APPROVATA — pronta per sviluppo autonomo da parte di agente AI**
>
> Lingua di progetto/documentazione: **Italiano**
>
> Timezone applicativa di riferimento: **Europe/Rome**

---

## 0. Scopo di questo documento

Questo documento è la fonte di verità principale per lo sviluppo della piattaforma **VRSUS**.

Deve permettere a un agente AI di:

1. comprendere il prodotto e il risultato finale atteso;
2. creare il progetto da zero;
3. scegliere e configurare correttamente tecnologie e servizi;
4. implementare il database e le policy di sicurezza;
5. sviluppare progressivamente frontend, backend, PWA, area admin e funzionalità live;
6. verificare autonomamente la qualità del lavoro;
7. lasciare lo stato del progetto comprensibile a un altro agente AI in caso di handoff;
8. evitare decisioni architetturali incompatibili con le specifiche concordate.

### 0.1 Ordine di autorità delle istruzioni

In caso di apparente conflitto, l'agente deve applicare questo ordine di autorità:

```text
1. ultima istruzione esplicita del proprietario del progetto
2. questo documento tecnico
3. .ai/DECISIONS.md
4. .ai/STATUS.md e .ai/NEXT_STEPS.md
5. implementazione già presente nel repository
6. giudizio autonomo dell'agente
```

L'agente **non deve risolvere silenziosamente un conflitto cambiando i requisiti**.

Se due sezioni di questo documento sembrano contraddirsi:

1. preferire la sezione più specifica;
2. preferire i contratti operativi e le state machine rispetto alle descrizioni narrative;
3. annotare il dubbio in `.ai/DECISIONS.md`;
4. se la scelta modifica comportamento utente, sicurezza, costi o data model, chiedere decisione umana.

### 0.2 Obiettivo di precisione per agenti AI

Questa versione è intenzionalmente prescrittiva.

Quando il documento specifica:

- stato;
- transizione;
- route;
- permesso;
- input/output RPC;
- failure mode;
- acceptance criterion;

l'agente deve considerarli **contratti**, non suggerimenti.

Sono ammesse variazioni interne soltanto se mantengono integralmente il contratto osservabile.

Questo documento **non deve essere modificato silenziosamente dall'agente**. Qualunque variazione sostanziale a requisiti, stack, data model o roadmap deve:

- essere motivata;
- essere annotata nel decision log dell'agente;
- essere sottoposta all'approvazione del proprietario del progetto se cambia il comportamento funzionale o introduce costi/lock-in.

I dettagli di implementazione possono evolvere. Gli obiettivi funzionali e i vincoli esplicitamente marcati come **NON NEGOZIABILI** devono invece essere rispettati.

---

# PARTE I — SPECIFICHE GENERALI

## 1. Visione del prodotto

**VRSUS** è un evento ricorrente, indicativamente mensile, dedicato al gioco e alla socialità.

Durante l'evento vengono messe a disposizione diverse esperienze di gioco: console, videogiochi, VR, giochi da tavolo, giochi di ruolo, tornei, sessioni organizzate e qualsiasi altra attività coerente con il format.

La piattaforma deve diventare il centro operativo digitale di VRSUS e coprire progressivamente:

- sito pubblico;
- presentazione del progetto;
- promozione del prossimo evento;
- registrazione degli utenti;
- prenotazione alla giornata;
- lista d'attesa;
- gestione capienza;
- QR code e check-in;
- registrazione del pagamento effettuato sul posto;
- catalogo di postazioni/esperienze/attività;
- gestione dei tornei;
- bracket e match;
- notifiche agli utenti;
- ranking;
- news e bacheca;
- servizi esterni all'evento mensile, ad esempio compleanni e team building;
- area amministrativa;
- modalità live durante l'evento;
- contenuti pubblici ottimizzati per SEO.

Il prodotto deve nascere come **PWA responsive**, utilizzabile bene soprattutto da smartphone ma anche da desktop.

Non devono essere create inizialmente applicazioni native Android/iOS separate.

---

## 2. Principio centrale del dominio

L'entità centrale del sistema è **l'evento VRSUS**.

Il modello concettuale principale è:

```text
EVENTO
  ├── prenotazioni
  ├── partecipanti
  ├── check-in
  ├── postazioni / risorse
  ├── attività disponibili
  ├── tornei
  │    ├── iscritti
  │    ├── bracket
  │    ├── match
  │    └── risultati
  ├── notifiche
  └── ranking / statistiche generate
```

La piattaforma non deve essere progettata come un semplice sito con funzionalità scollegate.

---

## 3. Requisiti NON NEGOZIABILI

### 3.1 PWA

La prima applicazione completa deve essere una **Progressive Web App**.

Deve essere:

- responsive;
- installabile quando supportato;
- utilizzabile da browser;
- ottimizzata mobile-first per le funzioni operative;
- capace di ricevere notifiche push web quando consentito dal dispositivo/browser.

### 3.2 Pagamenti

**NON implementare pagamenti online.**

I pagamenti vengono effettuati fisicamente durante l'evento.

Il sistema deve solo poter registrare lo stato amministrativo:

```text
unpaid
paid_on_site
complimentary
not_required
```

Non integrare Stripe, PayPal, Satispay, gateway POS o altri provider di pagamento senza una futura decisione esplicita.

### 3.3 Postazioni/piattaforme completamente elastiche

Nel linguaggio commerciale/UI può essere usato il termine “piattaforma” se coerente con il brand, ma il data model **non deve assumere che una piattaforma sia una console**.

Una postazione/risorsa VRSUS può essere, ad esempio:

- una PS5;
- un PC;
- una postazione VR;
- un cabinato arcade;
- un tavolo con Dungeon Master per una one-shot di D&D;
- un tavolo dedicato ai giochi da tavolo;
- un'area party game;
- una postazione musicale;
- una futura esperienza non ancora prevista.

Ogni postazione deve poter avere:

- nome;
- descrizione;
- categoria configurabile;
- capienza standard;
- immagine;
- stato attivo/inattivo;
- una o più attività associate;
- configurazione specifica per un singolo evento.

**Non usare enum rigidi come `PS5 | XBOX | SWITCH | PC` per rappresentare le tipologie.**

### 3.4 Capienza evento privata di default

Ogni evento può avere una capienza massima.

La capienza massima è un'informazione amministrativa e **non deve essere pubblica di default**.

Ogni evento deve avere una modalità di visibilità:

```text
hidden
status
exact
```

Semantica:

- `hidden`: l'utente vede solo se le prenotazioni sono disponibili;
- `status`: l'utente può vedere indicatori come “posti disponibili”, “quasi completo”, “completo” senza numeri;
- `exact`: l'utente può vedere ad esempio `127 / 150`.

Default: **`hidden`**.

### 3.5 Costi beta

La beta deve essere progettata per avere **costo infrastrutturale ricorrente pari a €0/mese**, finché i free tier sono sufficienti.

Sono ammesse dipendenze SaaS gratuite se sostituibili e se non introducono lock-in strutturale.

Prima di introdurre un servizio a pagamento l'agente deve:

1. indicare perché il free tier non è più sufficiente;
2. indicare costo e alternativa;
3. richiedere approvazione.

### 3.6 Sicurezza

La sicurezza non è una fase da “aggiungere dopo”.

Devono essere implementati fin dall'inizio:

- Row Level Security;
- separazione ruoli;
- gestione corretta dei secret;
- validazione input;
- autorizzazione server-side per operazioni privilegiate;
- audit delle principali azioni amministrative;
- QR privi di dati personali in chiaro.

### 3.7 SEO

La parte pubblica deve essere realizzata in ottica SEO fin dalla prima versione.

Le aree autenticate e admin devono invece essere escluse dall'indicizzazione.

---

## 4. Attori del sistema

### 4.1 Visitatore anonimo

Può:

- conoscere VRSUS;
- consultare il prossimo evento;
- vedere informazioni pubbliche;
- consultare piattaforme/postazioni/attività pubblicate;
- leggere news;
- consultare tornei pubblici e ranking se abilitati;
- consultare servizi;
- registrarsi o effettuare login.

### 4.2 Utente registrato

Può inoltre:

- prenotarsi a un evento;
- annullare una prenotazione secondo le regole;
- entrare in lista d'attesa;
- consultare il proprio QR;
- vedere le proprie notifiche;
- iscriversi ai tornei;
- effettuare check-in torneo quando previsto;
- visualizzare bracket e match;
- consultare ranking e statistiche;
- gestire il proprio profilo.

### 4.3 Staff

Ruolo operativo limitato.

Può, in base ai permessi:

- cercare prenotazioni;
- scansionare QR;
- effettuare check-in;
- registrare pagamento sul posto;
- consultare dati operativi dell'evento.

Non deve avere automaticamente accesso al CMS o alle configurazioni critiche.

### 4.4 Tournament Admin

Può:

- gestire iscrizioni torneo;
- effettuare check-in torneo;
- generare/gestire bracket;
- assegnare postazioni;
- chiamare giocatori;
- inserire risultati;
- gestire match.

### 4.5 Admin

Può gestire:

- eventi;
- prenotazioni;
- utenti;
- catalogo;
- tornei;
- ranking;
- news;
- notifiche;
- richieste servizi;
- configurazioni applicative.

### 4.6 Super Admin

Ha accesso completo, compresa la gestione dei ruoli e delle impostazioni sensibili.

---

# 5. Aree funzionali del prodotto

## 5.1 Sito pubblico

Navigazione concettuale:

```text
Home
├── Prossimo evento
├── Esperienze / Giochi / Piattaforme
├── Tornei
├── Ranking
├── News
├── Servizi
│   ├── Compleanni
│   ├── Team Building
│   └── Eventi privati
└── Regolamento / FAQ
```

La struttura reale della navigazione può essere raffinata durante il design, ma non deve nascondere il CTA principale per il prossimo evento.

### Homepage

Deve comunicare rapidamente:

- cos'è VRSUS;
- perché partecipare;
- quando si terrà il prossimo evento;
- luogo/orari quando pubblici;
- prezzo da pagare sul posto quando applicabile;
- stato prenotazioni;
- CTA “Prenota”;
- esperienze in evidenza;
- tornei in evidenza;
- news recenti;
- servizi alternativi.

### Prossimo evento

Deve poter mostrare:

- titolo;
- descrizione;
- data e orari;
- luogo;
- prezzo;
- stato;
- eventuale capienza secondo `capacity_visibility`;
- attività/postazioni pubbliche;
- tornei;
- CTA prenotazione.

### Esperienze / catalogo

Il sito può presentare le esperienze e le risorse VRSUS senza assumere categorie fisse.

Esempi:

- videogiochi;
- D&D;
- board game;
- VR;
- arcade;
- attività speciali.

### Servizi

Pagine informative dedicate a:

- compleanni;
- team building;
- eventi privati;
- altri servizi futuri.

Devono generare richieste/lead, non prenotazioni evento ordinarie.

---

# 6. Area utente

Navigazione mobile indicativa:

```text
Home
Evento
Tornei
Ranking
Profilo
```

La dashboard deve privilegiare azioni e informazioni rilevanti, non sembrare un gestionale.

Contenuti principali:

- prossima prenotazione;
- QR;
- stato pagamento sul posto;
- tornei a cui l'utente è iscritto;
- tornei aperti;
- notifiche;
- news;
- ranking personale.

---

# 7. Prenotazioni evento

## 7.1 Journey ideale

```text
Homepage / Evento
↓
Prenota
↓
Login / Registrazione se necessario
↓
Conferma prenotazione
↓
Prenotazione confermata
```

Ridurre al minimo i passaggi.

L'utente deve poter conoscere i dati essenziali dell'evento prima di creare un account.


## 7.2 Stato della prenotazione

`bookings.status` rappresenta esclusivamente lo stato amministrativo della prenotazione.

Valori V1:

```text
confirmed
waitlisted
cancelled
no_show
```

**`checked_in` NON è uno stato di `bookings.status`.**

Il check-in è rappresentato separatamente da:

```text
bookings.checked_in_at
event_checkins
```

Quindi una prenotazione può essere:

```text
status = confirmed
checked_in_at = 2026-09-12T18:04:12Z
```

Questo evita stati semanticamente sovrapposti.

## 7.3 Vincoli

- un utente non può avere più di una prenotazione attiva per lo stesso evento;
- sono considerate attive `confirmed` e `waitlisted`;
- una prenotazione annullata libera capienza solo se era `confirmed`;
- se la capienza è raggiunta e la waiting list è abilitata, la nuova richiesta diventa `waitlisted`;
- se la waiting list non è abilitata, il sistema restituisce `EVENT_FULL`;
- il check-in è consentito soltanto a prenotazioni `confirmed`;
- `no_show` viene assegnato dallo staff/admin dopo o durante la chiusura operativa dell'evento;
- il controllo capienza deve avvenire in transazione server/database, mai soltanto nel frontend.

---

# 8. Lista d'attesa

Ogni evento può attivare/disattivare la waiting list.

### Regola V1 — NON AMBIGUA

La V1 utilizza:

```text
FIFO automatic promotion
```

Quando una prenotazione `confirmed` viene cancellata e l'evento è ancora prenotabile:

1. selezionare la più vecchia prenotazione `waitlisted` eleggibile ordinando per `created_at ASC`;
2. promuoverla atomicamente a `confirmed`;
3. impostare `confirmed_at`;
4. creare notifica in-app;
5. tentare push/email solo se il relativo canale è configurato;
6. scrivere audit log.

Nella V1 **NON esiste una finestra temporale di accettazione del posto**.

Non implementare timer del tipo “hai 4 ore per confermare”.

Una eventuale feature futura potrà introdurre:

```text
offered
offer_expires_at
```

ma richiederà una nuova decisione di prodotto.

### Posizione waiting list

Nella V1 la posizione **non viene memorizzata come numero persistente**.

Viene derivata da:

```text
status = waitlisted
ORDER BY created_at ASC
```

Questo evita posizioni obsolete dopo cancellazioni/promozioni.

# 9. QR e check-in

## 9.1 QR

Ogni prenotazione confermata deve avere un identificatore/token non prevedibile.

Il QR **non deve contenere PII in chiaro**.

Esempio concettuale:

```text
https://<app>/checkin/<opaque-token>
```

Il QR non deve essere l'autorizzazione finale: lo staff autenticato deve comunque avere il permesso di effettuare il check-in.

## 9.2 Scanner

Lo staff deve poter:

1. aprire scanner da smartphone;
2. autorizzare la fotocamera;
3. scansionare QR;
4. visualizzare prenotazione;
5. verificare/registrare pagamento sul posto;
6. confermare check-in.

Deve esistere anche ricerca manuale per nome/codice nel caso la scansione non funzioni.

## 9.3 Dati operativi

Dashboard evento:

- prenotati;
- presenti;
- non arrivati;
- pagamenti registrati;
- waiting list;
- tornei in corso;
- match in corso.

I numeri amministrativi non diventano automaticamente pubblici.

---

# 10. Catalogo flessibile: postazioni e attività

## 10.1 Concetti

### Station / Postazione

Rappresenta la risorsa fisica o logica disponibile.

Esempi:

```text
PS5 #1
Tavolo D&D
Area giochi da tavolo
VR #1
Cabinato #2
```

### Activity / Attività

Rappresenta ciò che si può fare su/in una postazione.

Esempi:

```text
Tekken 8
EA Sports FC
One Shot D&D — Il Tempio Perduto
Board Games Free Play
Beat Saber
```

Una postazione può offrire più attività.

Un'attività può essere disponibile su più postazioni.


## 10.2 Configurazione per evento

La disponibilità globale non implica la disponibilità in ogni evento.

Il modello definitivo è **many-to-many anche a livello evento**:

```text
EVENT
├── EVENT_STATIONS
├── EVENT_ACTIVITIES
└── EVENT_STATION_ACTIVITIES
```

`event_stations` definisce quali risorse fisiche/logiche sono presenti.

`event_activities` definisce quali attività vengono offerte.

`event_station_activities` collega una o più attività a una o più postazioni.

Esempio:

```text
Tekken 8
├── PS5 #1
├── PS5 #2
└── PS5 #3
```

oppure:

```text
One Shot D&D
└── Tavolo GDR #1
```

Non inserire `event_station_id` direttamente dentro `event_activities`.

Per il singolo evento devono essere sovrascrivibili almeno:

- nome pubblico;
- descrizione;
- capienza;
- visibilità;
- disponibilità;
- orari;
- modalità d'accesso.

## 10.3 Modalità d'accesso attività

Valori V1:

```text
free_play
scheduled
registration_required
tournament
```

Semantica:

- `free_play`: accesso libero; nessuna registrazione applicativa obbligatoria;
- `scheduled`: attività a orari definiti;
- `registration_required`: richiede una registrazione dedicata all'attività; feature estendibile;
- `tournament`: l'accesso competitivo è gestito dal tournament system.

## 10.4 Semantica delle diverse capienze

Le capienze **NON sono intercambiabili**.

### `events.max_capacity`

Numero massimo di persone che possono risultare `confirmed` per l'intero evento.

È il solo dato utilizzato dal sistema di prenotazione generale per determinare se un evento è pieno.

### `stations.default_capacity`

Numero standard di persone che possono utilizzare contemporaneamente la risorsa fisica/logica.

Esempi:

```text
PS5 #1 -> 2
Tavolo D&D -> 6
VR #1 -> 1
```

Non influenza direttamente `events.max_capacity`.

### `event_stations.capacity_override`

Sovrascrive `stations.default_capacity` esclusivamente per quel determinato evento.

Capienza effettiva della postazione:

```text
COALESCE(event_stations.capacity_override, stations.default_capacity)
```

### `event_activities.capacity`

Capienza complessiva opzionale della specifica attività nell'evento.

È `NULL` quando non serve un limite applicativo.

Non deve essere usata per determinare la capienza generale dell'evento.

### `event_station_activities.capacity_override`

Limite opzionale della specifica coppia attività/postazione.

Usarlo solo quando la combinazione ha una capienza diversa dalla postazione.

### `tournaments.max_entries`

Numero massimo di **entry competitive**, non necessariamente persone.

In V2 una entry corrisponde inizialmente a un utente, ma il modello supporta squadre future.


---

# 11. Tornei

I tornei appartengono a un evento e sono collegati a un'attività.

## 11.1 Dati minimi

- nome;
- evento;
- attività;
- descrizione/regolamento;
- capienza;
- apertura/chiusura iscrizioni;
- orario previsto;
- formato;
- stato;
- check-in richiesto sì/no;
- ranking abilitato sì/no.

## 11.2 Stati

```text
draft
registration_open
registration_closed
checkin
running
completed
cancelled
```

## 11.3 Formati iniziali

La prima versione del tournament engine può implementare:

- single elimination.

L'architettura deve consentire successivamente:

- double elimination;
- gironi;
- round robin;
- formati custom.

**Non implementare tutti i formati nella prima iterazione se questo complica inutilmente l'MVP.**

## 11.4 Entry

Il data model deve essere predisposto per entry astratte, anche se la UI iniziale supporta soltanto giocatori singoli.

Questo permette in futuro:

- squadre;
- coppie;
- team.

## 11.5 Match

Un match deve poter memorizzare:

- torneo;
- round;
- posizione bracket;
- entry A;
- entry B;
- punteggio;
- vincitore;
- postazione;
- stato;
- orario;
- timestamp chiamata giocatori;
- timestamp completamento.

La struttura del punteggio può essere JSONB se il formato varia tra giochi.

---

# 12. Notifiche

## 12.1 Principio

Una **notifica applicativa** è distinta dalla **push notification**.

Ogni comunicazione importante deve poter esistere nel database e quindi essere consultabile nell'app.

La push è un canale addizionale.

```text
NOTIFICATION
├── inbox PWA
├── web push
└── email opzionale
```

## 12.2 Casi d'uso

- prenotazione confermata;
- promozione dalla waiting list;
- reminder evento;
- torneo prossimo all'inizio;
- “è il tuo turno”;
- assegnazione postazione;
- cambio orario;
- comunicazione amministrativa.

## 12.3 Provider

Prima scelta beta: **OneSignal Free** dietro un adapter interno.

Non chiamare direttamente il provider da componenti UI.

Interfaccia concettuale:

```ts
interface PushProvider {
  sendToUser(...)
  sendToUsers(...)
  sendToTournament(...)
  sendToEvent(...)
}
```

In questo modo OneSignal potrà essere sostituito in futuro con Web Push nativo o altro provider.

---

# 13. Ranking e statistiche

Devono esistere almeno due viste concettuali:

- ranking per attività/gioco;
- ranking generale VRSUS.

Per la prima versione non è obbligatorio implementare ELO.

È preferibile un **ledger di punti auditabile** rispetto a un totale modificato manualmente.

Esempio:

```text
+100 | vittoria torneo | Tournament X
+50  | secondo posto  | Tournament Y
```

Le classifiche vengono derivate/aggregate.

In futuro:

- ELO;
- stagioni;
- streak;
- vittorie/sconfitte;
- podi;
- achievement;
- storico.

---

# 14. News / CMS

Non creare CMS separati per sito e app.

Una news deve poter alimentare più superfici:

- homepage;
- news pubbliche;
- bacheca utenti;
- push.

Campi minimi:

- titolo;
- slug;
- excerpt;
- contenuto;
- immagine;
- stato;
- data pubblicazione;
- visibilità;
- campi SEO.

Per la V1 non serve un page builder visuale complesso.

Il CMS deve essere **semplice e strutturato**.

---

# 15. Servizi: compleanni, team building, eventi privati

Flusso:

```text
Pagina servizio
↓
Form richiesta
↓
Lead nel pannello admin
↓
Gestione stato
```

Stati iniziali:

```text
new
contacted
quote_sent
confirmed
lost
```

Non collegare questi lead al sistema di prenotazione evento mensile se non esiste un'esigenza concreta.

---

# 16. Modalità VRSUS Live — futuro

Una vista pubblica/display ottimizzata per monitor durante l'evento potrà mostrare:

- torneo attivo;
- bracket;
- risultati;
- prossimi match;
- postazioni;
- ranking;
- comunicazioni.

Deve leggere gli stessi dati del gestionale, senza database paralleli.

---

# 17. Non-goals iniziali

Non implementare nella beta/V1 salvo esplicita richiesta:

- pagamenti online;
- app native iOS/Android;
- social network interno;
- chat tra utenti;
- marketplace;
- sistemi complessi di ticketing;
- prenotazione oraria delle singole postazioni;
- code virtuali avanzate;
- tutti i formati torneo possibili;
- ELO sofisticato;
- CMS page-builder visuale;
- multi-tenant SaaS;
- microservizi;
- Kubernetes;
- infrastrutture enterprise;
- dipendenze a pagamento non necessarie.

---

# PARTE I-B — CONTRATTI OPERATIVI NON AMBIGUI

Questa parte prevale sulle descrizioni narrative quando definisce comportamento, stato, permesso o route.

# 17A. State machine

## 17A.1 Evento

`events.status` descrive il ciclo di vita operativo, non la disponibilità delle prenotazioni.

Valori:

```text
draft
scheduled
running
completed
cancelled
```

Transizioni consentite:

```text
draft -> scheduled
draft -> cancelled

scheduled -> running
scheduled -> cancelled
scheduled -> draft        # soltanto admin, prima dell'inizio

running -> completed
running -> cancelled      # emergenza amministrativa

completed -> completed
cancelled -> cancelled
```

Non consentire altre transizioni senza decisione esplicita.

### Visibilità pubblica

`events.is_public` è indipendente dallo status.

Un evento appare nelle route pubbliche soltanto quando:

```text
is_public = true
AND status IN ('scheduled', 'running', 'completed')
```

Gli eventi `draft` non sono pubblici anche se `is_public` fosse accidentalmente true: la query pubblica deve comunque escluderli.

### Booking availability

Lo stato “prenotazioni aperte” **NON viene memorizzato come `events.status`**.

Viene derivato da:

```text
event.status = scheduled
AND event.booking_enabled = true
AND now >= booking_opens_at, se valorizzato
AND now <= booking_closes_at, se valorizzato
AND evento non cancellato
```

La capienza viene valutata separatamente.

### Evento pieno

**NON salvare `full` dentro `events.status`.**

Derivare:

```text
confirmed_count >= max_capacity
```

quando `max_capacity` non è null.

Se `max_capacity IS NULL`, l'evento non ha un limite applicativo generale.

---

## 17A.2 Prenotazione

Valori:

```text
confirmed
waitlisted
cancelled
no_show
```

Transizioni:

```text
new request -> confirmed
new request -> waitlisted

waitlisted -> confirmed      # promotion FIFO
waitlisted -> cancelled

confirmed -> cancelled
confirmed -> no_show

cancelled -> terminal
no_show -> terminal
```

Il check-in non modifica `status`.

Il check-in valorizza:

```text
checked_in_at
```

e crea `event_checkins`.

Non consentire check-in se:

```text
status != confirmed
```

---

## 17A.3 Pagamento sul posto

Valori:

```text
unpaid
paid_on_site
complimentary
not_required
```

Transizioni ordinarie:

```text
unpaid -> paid_on_site
unpaid -> complimentary
unpaid -> not_required
```

Admin/super-admin possono correggere uno stato errato, ma la modifica deve generare audit log.

Il pagamento non deve mai bloccare tecnicamente la lettura del QR.

La regola operativa V1 è:

```text
staff verifica/aggiorna pagamento
poi effettua check-in
```

Se un admin forza il check-in senza pagamento, l'azione è consentita soltanto con permesso amministrativo e audit.

---

## 17A.4 Torneo

Valori:

```text
draft
registration_open
registration_closed
checkin
running
completed
cancelled
```

Transizioni:

```text
draft -> registration_open
draft -> cancelled

registration_open -> registration_closed
registration_open -> cancelled

registration_closed -> checkin
registration_closed -> running     # se check-in disabilitato
registration_closed -> cancelled

checkin -> running
checkin -> cancelled

running -> completed
running -> cancelled

completed -> terminal
cancelled -> terminal
```

---

## 17A.5 Match

Valori:

```text
pending
ready
called
running
completed
cancelled
```

Transizioni:

```text
pending -> ready
ready -> called
ready -> running
called -> running
running -> completed

pending/ready/called/running -> cancelled  # soltanto gestione torneo/admin
```

`record_match_result` deve essere idempotente rispetto allo stesso risultato.

Una correzione successiva del risultato deve essere un workflow amministrativo esplicito e auditato.

---

# 17B. Permission matrix

Legenda:

```text
✓ consentito
— non consentito
L limitato al dominio operativo necessario
```

| Operazione | User | Staff | Tournament Admin | Admin | Super Admin |
|---|---:|---:|---:|---:|---:|
| Leggere contenuti pubblici | ✓ | ✓ | ✓ | ✓ | ✓ |
| Modificare proprio profilo consentito | ✓ | ✓ | ✓ | ✓ | ✓ |
| Leggere proprie prenotazioni | ✓ | ✓ | ✓ | ✓ | ✓ |
| Creare/annullare propria prenotazione | ✓ | ✓ | ✓ | ✓ | ✓ |
| Leggere prenotazioni di altri utenti | — | L | — | ✓ | ✓ |
| Effettuare check-in evento | — | ✓ | — | ✓ | ✓ |
| Modificare payment status | — | ✓ | — | ✓ | ✓ |
| Vedere admin notes booking | — | L | — | ✓ | ✓ |
| Gestire eventi | — | — | — | ✓ | ✓ |
| Gestire catalogo/CMS | — | — | — | ✓ | ✓ |
| Leggere iscritti torneo | proprie | — | ✓ | ✓ | ✓ |
| Gestire torneo/bracket/match | — | — | ✓ | ✓ | ✓ |
| Registrare risultati | — | — | ✓ | ✓ | ✓ |
| Modificare ranking manualmente | — | — | — | ✓ | ✓ |
| Gestire ruoli user/staff/tournament_admin | — | — | — | L | ✓ |
| Assegnare/rimuovere ruolo admin | — | — | — | — | ✓ |
| Assegnare/rimuovere super_admin | — | — | — | — | ✓ |
| Leggere audit log completo | — | — | — | ✓ | ✓ |

### Regola di implementazione

La matrice deve essere applicata tramite combinazione di:

- RLS;
- RPC autorizzate;
- Edge Functions privilegiate;
- middleware UI solo come barriera UX aggiuntiva.

**Il middleware frontend non è un controllo di sicurezza sufficiente.**

---

# 17C. Route contract definitivo

## Pubbliche

| Route | Auth | Rendering | Index SEO |
|---|---|---|---|
| `/` | no | SSR/prerender | sì |
| `/eventi` | no | SSR | sì |
| `/eventi/[slug]` | no | SSR | sì |
| `/esperienze` | no | SSR | sì |
| `/esperienze/[slug]` | no | SSR | sì se pubblica |
| `/tornei` | no | SSR | sì quando V2 attiva |
| `/tornei/[slug]` | no | SSR | sì quando pubblico |
| `/ranking` | no | SSR | sì quando abilitato |
| `/news` | no | SSR | sì |
| `/news/[slug]` | no | SSR | sì |
| `/servizi` | no | SSR/prerender | sì |
| `/servizi/[slug]` | no | SSR | sì |
| `/regolamento` | no | SSR/prerender | sì |

## Area utente

| Route | Auth | Ruolo minimo | SEO |
|---|---|---|---|
| `/app` | sì | user | noindex |
| `/app/eventi` | sì | user | noindex |
| `/app/prenotazioni/[id]` | sì | owner | noindex |
| `/app/tornei` | sì | user | noindex |
| `/app/tornei/[id]` | sì | user | noindex |
| `/app/notifiche` | sì | user | noindex |
| `/app/profilo` | sì | user | noindex |

## Staff/Admin

| Route | Auth | Ruolo minimo | SEO |
|---|---|---|---|
| `/admin` | sì | admin | noindex,nofollow |
| `/admin/live` | sì | staff | noindex,nofollow |
| `/admin/checkin` | sì | staff | noindex,nofollow |
| `/admin/eventi` | sì | admin | noindex,nofollow |
| `/admin/eventi/[id]` | sì | admin | noindex,nofollow |
| `/admin/catalogo/**` | sì | admin | noindex,nofollow |
| `/admin/news/**` | sì | admin | noindex,nofollow |
| `/admin/servizi/**` | sì | admin | noindex,nofollow |
| `/admin/tornei/**` | sì | tournament_admin | noindex,nofollow |
| `/admin/utenti/**` | sì | admin | noindex,nofollow |
| `/admin/impostazioni/**` | sì | admin | noindex,nofollow |

Un `tournament_admin` deve vedere solo le sezioni torneo necessarie, non l'intero admin.

---

# 17D. Acceptance criteria UI minimi

## Event Card pubblica

DEVE mostrare quando disponibile/pubblico:

- titolo;
- data;
- luogo;
- prezzo sul posto;
- stato prenotazione pubblico;
- CTA.

NON DEVE mostrare quando `capacity_visibility = hidden`:

- `max_capacity`;
- numero esatto prenotati;
- percentuale occupazione.

Con `capacity_visibility = status` può mostrare soltanto:

```text
Disponibile
Quasi completo
Completo
```

Le soglie “quasi completo” devono essere centralizzate in config; default V1: >= 80%.

Con `capacity_visibility = exact` può mostrare conteggio/capienza.

## Dashboard utente

Above-the-fold su mobile:

1. prossimo evento/prenotazione;
2. CTA QR se prenotato;
3. prossimo torneo/match se rilevante;
4. notifiche importanti.

Evitare dashboard composta da molti widget equivalenti senza gerarchia.

## Dashboard staff live

Priorità:

1. scanner/check-in;
2. ricerca manuale;
3. pagamento;
4. conteggi live;
5. tornei attivi.

Azioni operative comuni devono richiedere idealmente <= 3 interazioni dal dashboard live.

---

# 17E. Failure contracts

## Push provider non disponibile

```text
crea notifications record        MUST SUCCEED
tentativo push                    MAY FAIL
azione business principale       MUST NOT FAIL per colpa della push
errore provider                   MUST BE LOGGED
retry manuale/futuro              POSSIBLE
```

## Upload file fallisce

Non creare/aggiornare un record DB con riferimento definitivo a un file che non esiste.

Ordine consigliato:

```text
validate
upload
persist reference
```

Se la persistenza DB fallisce dopo upload, tentare cleanup dell'oggetto orphan o registrarlo per cleanup successivo.

## Doppio click check-in

`check_in_booking` deve essere idempotente.

Seconda invocazione:

- non crea secondo check-in;
- non modifica conteggi;
- restituisce stato già esistente.

## Doppio submit booking

Il vincolo DB e la RPC devono impedire prenotazioni attive duplicate.

## Doppio submit risultato torneo

Non attribuire due volte:

- avanzamento bracket;
- ledger ranking;
- notifiche winner.

## Realtime non disponibile

La sorgente di verità resta PostgreSQL.

La UI deve poter recuperare stato aggiornato tramite refetch/manual refresh senza corrompere dati.

---

# 17F. Contratti RPC V1

Gli errori applicativi devono usare codici stabili.

## `create_event_booking(p_event_id uuid)`

AUTH:

```text
authenticated user
```

RETURNS:

```json
{
  "booking_id": "uuid",
  "status": "confirmed | waitlisted"
}
```

MUST:

- verificare evento esistente;
- verificare `status = scheduled`;
- verificare finestra booking;
- verificare duplicati attivi;
- calcolare capienza dentro transazione;
- impedire oversubscription;
- creare `confirmed` se c'è posto;
- creare `waitlisted` se pieno e waiting list attiva;
- altrimenti errore;
- generare/associare token QR soltanto quando booking è confirmed;
- essere race-safe.

ERROR CODES:

```text
AUTH_REQUIRED
EVENT_NOT_FOUND
EVENT_NOT_BOOKABLE
BOOKING_NOT_OPEN
ALREADY_BOOKED
EVENT_FULL
WAITLIST_DISABLED
```

---

## `cancel_event_booking(p_booking_id uuid)`

AUTH:

```text
booking owner OR admin
```

MUST:

- verificare ownership/permesso;
- rendere `cancelled`;
- non ripetere effetto se già cancelled;
- se precedente stato era confirmed, tentare promotion FIFO waiting list;
- audit se eseguita da staff/admin.

ERROR CODES:

```text
BOOKING_NOT_FOUND
FORBIDDEN
BOOKING_NOT_CANCELLABLE
```

---

## `promote_waitlist(p_event_id uuid)`

AUTH:

```text
internal RPC/admin only
```

MUST:

- essere eseguita in lock/transazione;
- selezionare prima waitlisted per `created_at ASC`;
- verificare nuovamente capienza;
- promuovere massimo il numero di posti realmente disponibili;
- generare QR per booking promossa;
- creare notifica applicativa;
- essere idempotente.

---

## `check_in_booking(p_qr_token text, p_payment_status text nullable)`

AUTH:

```text
staff OR admin OR super_admin
```

MUST:

- risolvere token in modo sicuro;
- booking confirmed;
- evento coerente;
- non duplicare check-in;
- aggiornare payment status se fornito e consentito;
- valorizzare `checked_in_at`;
- inserire `event_checkins`;
- audit;
- restituire dati minimi necessari allo staff.

ERROR CODES:

```text
QR_INVALID
BOOKING_NOT_FOUND
BOOKING_NOT_CONFIRMED
ALREADY_CHECKED_IN
PAYMENT_STATUS_INVALID
FORBIDDEN
```

---

## `mark_onsite_payment(p_booking_id uuid, p_status text)`

AUTH:

```text
staff OR admin OR super_admin
```

ALLOWED TARGET STATUS:

```text
paid_on_site
complimentary
not_required
unpaid       # correzione esplicita
```

MUST:

- auditare ogni modifica;
- non accettare valori arbitrari.

---

# 17G. Contratti RPC V2 torneo

## `register_tournament_entry(p_tournament_id uuid)`

AUTH:

```text
authenticated user
```

RETURNS entry id.

MUST verificare:

- tournament registration_open;
- finestra temporale;
- max_entries;
- duplicati;
- booking all'evento se questa regola è abilitata.

## `create_single_elimination_bracket(p_tournament_id uuid)`

AUTH:

```text
tournament_admin OR admin
```

MUST:

- usare soltanto entry eleggibili/check-in quando richiesto;
- essere idempotente;
- generare bracket deterministico per seed/input identici;
- gestire bye;
- non rigenerare silenziosamente un bracket già iniziato.

## `record_match_result(p_match_id uuid, p_score_payload jsonb, p_winner_entry_id uuid)`

AUTH:

```text
tournament_admin OR admin
```

MUST:

- validare che winner appartenga al match;
- validare stato;
- completare match;
- avanzare winner una sola volta;
- generare eventuali match ready;
- produrre ranking ledger soltanto quando previsto;
- auditare correzioni.

---

---

# PARTE I-C — CONTENT POLICY E GESTIONE CONTENUTI NON ANCORA DISPONIBILI

Questa sezione definisce come l'agente deve comportarsi quando copy, immagini, fotografie, asset di brand o informazioni editoriali definitive non sono ancora stati forniti.

## 17H. Principio generale

L'assenza di contenuti editoriali definitivi **NON deve bloccare lo sviluppo della landing page o delle altre pagine pubbliche**.

L'agente deve completare:

- struttura;
- layout;
- responsive;
- componenti;
- animazioni;
- integrazione CMS/database;
- SEO tecnico;
- placeholder controllati;
- stati vuoti;
- CTA;
- collegamenti;
- caricamento dati dinamici.

La pagina può quindi essere considerata **tecnicamente completata** anche se alcuni copy o asset sono ancora provvisori.

---

## 17H.1 Contenuti che l'agente PUÒ creare autonomamente

L'agente può scrivere copy beta/provvisorio soltanto quando deriva direttamente da informazioni già approvate nel documento.

Esempi ammessi:

```text
VRSUS è un evento dedicato al gioco condiviso,
con esperienze, attività e tornei da vivere insieme.
```

oppure:

```text
Ogni evento può proporre videogiochi, giochi da tavolo,
giochi di ruolo, VR e altre esperienze.
```

Questi testi descrivono caratteristiche già approvate.

L'agente può anche creare:

- CTA neutre;
- label;
- microcopy UI;
- messaggi di stato;
- testi funzionali;
- descrizioni temporanee chiaramente non fattuali.

---

## 17H.2 Contenuti che l'agente NON DEVE inventare

Senza una fonte esplicita, l'agente NON deve inventare:

- anno di fondazione;
- storia del progetto;
- numero di partecipanti;
- numero di eventi già svolti;
- record di affluenza;
- recensioni;
- testimonianze;
- partner;
- sponsor;
- premi;
- riconoscimenti;
- frasi tipo “il più grande evento gaming di...”;
- claim commerciali non verificati;
- dati economici;
- prezzi non configurati;
- servizi non approvati;
- nomi di membri del team;
- fotografie attribuite a VRSUS;
- immagini prese da competitor o dal web e presentate come proprie.

Non creare social proof fittizia.

Non creare loghi o asset definitivi del brand senza una richiesta specifica.

---

## 17H.3 Visual e immagini quando mancano asset reali

Ordine di preferenza per la beta:

### 1. Visual astratti / brand-neutral

Preferiti.

Possono includere:

- gradienti;
- forme geometriche;
- texture;
- pattern;
- elementi grafici astratti;
- composizioni tipografiche;
- UI fragments;
- glow controllati;
- motion graphics leggere.

Devono essere compatibili con il linguaggio visuale VRSUS.

### 2. Placeholder espliciti

Ammessi durante lo sviluppo.

Esempio:

```text
/public/placeholders/event-hero.webp
```

Il placeholder deve essere chiaramente identificabile nel codice e facile da sostituire.

### 3. Artwork generati

Non devono essere prodotti o adottati autonomamente come brand asset definitivo.

Possono essere usati solo se il proprietario approva esplicitamente quella direzione.

### Divieti

Non:

- scaricare immagini di competitor;
- usare fotografie trovate online senza licenza/verifica;
- simulare fotografie dell'evento;
- fingere che un'immagine generica rappresenti VRSUS.

---

## 17H.4 Separazione tra struttura/copy e contenuto dinamico

Nella V1 la landing page NON deve diventare un page-builder generico.

Gestione raccomandata:

```text
CONTENUTI DINAMICI
↓
Supabase

prossimo evento
esperienze
tornei
news
servizi
```

mentre:

```text
STRUTTURA / COPY BRAND BASE
↓
codice o configurazione semplice

hero
claim
cos'è VRSUS
come funziona
CTA
```

Quando un copy brand diventa definitivo, può essere spostato in `site_settings` se esiste una reale esigenza di modifica da admin.

Non creare premature tabelle generiche tipo:

```text
homepage_blocks
homepage_widgets
homepage_layouts
```

salvo futura decisione esplicita.

---

## 17H.5 Struttura homepage beta attesa

La homepage può essere sviluppata anche senza asset definitivi con struttura indicativa:

```text
Hero
├── headline
├── supporting copy
├── CTA prossimo evento
└── visual astratto / placeholder

Cos'è VRSUS

Prossimo evento
└── dati da Supabase

Esperienze in evidenza
└── dati da Supabase

Tornei
└── dati da Supabase, quando V2 attiva

Come funziona

News
└── dati da Supabase

Servizi
└── dati da Supabase

CTA finale
```

L'agente può variare composizione e ordine per migliorare UX, purché mantenga i contenuti funzionali richiesti.

---

## 17H.6 Tracking contenuti mancanti

Ogni contenuto non definitivo deve essere tracciato.

Aggiornare `.ai/STATUS.md` con una sezione:

```text
CONTENT TODO
- final homepage copy
- final logo/brand assets
- event photography
- final service descriptions
- final social/SEO imagery
```

Se utile, creare anche:

```text
.ai/CONTENT_TODO.md
```

L'assenza di contenuti finali non deve produrre blocchi tecnici artificiali.

---

## 17H.7 Acceptance criteria contenuti beta

Una pagina pubblica è accettabile in beta quando:

- nessuna informazione fattuale è inventata;
- il copy provvisorio deriva da requisiti approvati;
- i placeholder sono facilmente identificabili;
- le immagini temporanee non violano copyright/licenze;
- il layout funziona anche con contenuti reali futuri;
- i contenuti dinamici provengono dal database;
- i TODO editoriali sono documentati;
- SEO tecnico è comunque implementato.

---

---

# PARTE II — ARCHITETTURA TECNICA

## 18. Stack approvato

### Frontend / Full-stack framework

- **Nuxt 4**
- **Vue 3**
- **TypeScript strict**
- **Tailwind CSS 4**
- **Nuxt UI 4** come libreria di primitive/componenti accessibili e gratuita, con tema VRSUS personalizzato; non lasciare il tema default come risultato finale.

### PWA

- **@vite-pwa/nuxt**

### Motion / animazioni

Strategia approvata:

1. **CSS + Vue/Nuxt transitions** per micro-interazioni e transizioni semplici;
2. **Nuxt View Transitions** quando supportate e realmente utili;
3. **GSAP** soltanto per animazioni curate e complesse, ad esempio hero, reveal editoriali o sequenze scroll;
4. nessun wrapper/framework di animazione aggiuntivo senza necessità.

GSAP deve essere incapsulato in utility/composable/preset riutilizzabili.

Non disseminare timeline GSAP arbitrariamente nei componenti.

Ogni animazione deve rispettare `prefers-reduced-motion`.

### Backend / Database

- **Supabase**
  - PostgreSQL
  - Auth
  - Row Level Security
  - Storage
  - Realtime
  - Edge Functions
  - Database Functions / RPC

### Integrazione Nuxt ↔ Supabase

- **@nuxtjs/supabase**

### Immagini

- **@nuxt/image**
- file originariamente conservati in Supabase Storage quando dinamici.

### QR

Generazione:

- package `qrcode` o alternativa open source equivalente stabile.

Scansione:

- `@zxing/browser` o alternativa open source equivalente stabile basata su Camera API.

Non usare SaaS QR.

### Push

- **OneSignal Free** nella beta;
- accesso esclusivamente tramite adapter/service interno.

### Email

Beta interna:

- Supabase Auth;
- preferire OAuth Google o flussi che non dipendano da elevato volume SMTP.

Produzione iniziale:

- **Resend Free** come SMTP/provider quando verrà configurato un dominio e saranno necessarie email affidabili.

### Hosting

- **Cloudflare Pages**
- URL beta `*.pages.dev`
- dominio custom solo successivamente.

### Testing

- **Vitest**
- **@nuxt/test-utils** dove utile
- **Playwright** per E2E
- test di integrazione contro Supabase locale
- test/policy RLS dedicati.

### Package manager

- **pnpm**

### Versioning

Utilizzare versioni recenti e compatibili al momento del bootstrap.

Non hardcodare nel documento patch version che possono diventare obsolete.

L'agente deve:

1. verificare la compatibilità delle release correnti;
2. installare versioni stabili;
3. committare il lockfile;
4. annotare eventuali deviazioni.

---

# 19. Strategia rendering Nuxt

Il progetto deve sfruttare il rendering ibrido.

## 19.1 Route pubbliche

Esempi:

```text
/
/eventi
/eventi/:slug
/esperienze
/tornei
/tornei/:slug
/ranking
/news
/news/:slug
/servizi/*
/regolamento
```

Devono essere:

- SSR o prerender dove appropriato;
- leggibili dai crawler;
- dotate di meta SEO;
- performanti;
- cacheabili quando possibile.

## 19.2 Area app

```text
/app/**
```

Può essere maggiormente client-driven.

Richiede autenticazione dove necessario.

Deve essere `noindex`.

## 19.3 Area admin

```text
/admin/**
```

Richiede autenticazione + autorizzazione ruolo.

Deve essere `noindex, nofollow`.

---

# 20. Architettura backend e business logic

## 20.1 Regola generale

**Supabase è il backend primario.**

Evitare di costruire contemporaneamente:

- API Nuxt complete;
- Edge Functions duplicate;
- RPC duplicate;
- logica business nei componenti.

## 20.2 CRUD ordinario

Quando sicuro:

```text
Nuxt Client
↓
Supabase Data API
↓
Postgres + RLS
```

Usare RLS come barriera di autorizzazione.

## 20.3 Operazioni atomiche / transazionali

Esempi:

- prenotazione con controllo capienza;
- promozione waiting list;
- check-in;
- generazione bracket;
- registrazione risultato;
- aggiornamento ledger ranking.

Preferire:

- Postgres functions / RPC quando la logica è principalmente database e richiede atomicità;
- transazioni lato database.

## 20.4 Edge Functions

Usarle per:

- integrazioni esterne;
- OneSignal;
- Resend;
- workflow privilegiati che richiedono secret;
- job asincroni/operazioni server-side non adatte al client.

## 20.5 Nuxt server routes

Usarle per:

- SSR;
- caricamento server-side;
- endpoint strettamente legati al rendering Nuxt;
- casi in cui il runtime Nuxt offre un vantaggio concreto.

Non duplicare la business API senza necessità.

## 20.6 Service-role key

La `SUPABASE_SERVICE_ROLE_KEY`:

- non deve mai arrivare al browser;
- non deve essere prefissata come variabile pubblica;
- deve esistere solo in ambienti server/edge autorizzati;
- non deve essere committata.

---

# 21. Struttura logica del codice

Struttura indicativa, adattabile alle convenzioni Nuxt 4:

```text
app/
  components/
    ui/
    public/
    event/
    tournament/
    admin/
  composables/
  layouts/
  middleware/
  pages/
  stores/
  types/
  utils/

server/
  api/
  domain/
  services/
  utils/

shared/
  constants/
  schemas/
  types/
  domain/

supabase/
  migrations/
  functions/
  seed.sql
  config.toml

tests/
  unit/
  integration/
  e2e/

docs/
  ...

.ai/
  STATUS.md
  NEXT_STEPS.md
  HANDOFF.md
  DECISIONS.md
  CHANGELOG.md
  TEST_REPORT.md
```

La cartella `.ai/` è suggerita come area operativa dell'agente. Il proprietario del progetto può rinominarla.

---

# 22. Validazione

La validazione deve essere centralizzata.

Usare uno schema validator TypeScript stabile, preferibilmente:

- **Zod**, salvo motivazione documentata per alternativa.

Validare:

- payload form;
- parametri route critici;
- input API;
- input Edge Functions;
- dati sensibili prima delle mutation.

Non affidarsi solo ai tipi TypeScript.

Il database deve inoltre avere:

- `NOT NULL`;
- `CHECK`;
- `UNIQUE`;
- foreign key;
- indici.

---

# 23. Data Model

## 23.1 Convenzioni database

- PostgreSQL.
- PK: UUID.
- timestamp: `timestamptz`.
- timezone memorizzata in UTC e visualizzata in `Europe/Rome`.
- valori monetari: integer in centesimi (`price_cents`).
- campi pubblici con slug SEO-friendly.
- evitare JSONB quando una relazione SQL è più corretta.
- JSONB ammesso per configurazioni realmente variabili, metadata e score payload.
- categorie di business estendibili tramite tabelle/stringhe, non enum rigidi.
- stati stabili possono usare enum PostgreSQL o CHECK constraint.
- niente soft-delete universale: usare `archived_at`/stato solo dove serve.
- ogni tabella business principale: `created_at`, `updated_at`.
- audit delle azioni amministrative critiche.

---

## 23.2 `profiles`

Estensione di `auth.users`.

```text
id uuid PK FK auth.users
display_name text
first_name text nullable
last_name text nullable
phone text nullable
avatar_path text nullable
is_public_profile boolean default false
created_at
updated_at
```

L'email primaria resta in Supabase Auth salvo necessità specifiche.

---

## 23.3 `roles`

```text
id uuid PK
code text UNIQUE
name text
description text nullable
```

Seed iniziale:

```text
user
staff
tournament_admin
admin
super_admin
```

---

## 23.4 `user_roles`

```text
user_id uuid FK profiles
role_id uuid FK roles
created_at
created_by uuid nullable
PRIMARY KEY (user_id, role_id)
```

Permette ruoli multipli.

---


## 23.5 `events`

```text
id uuid PK
slug text UNIQUE
title text
short_description text nullable
description text nullable

status text default 'draft'
is_public boolean default false

starts_at timestamptz
ends_at timestamptz

booking_opens_at timestamptz nullable
booking_closes_at timestamptz nullable
booking_enabled boolean default true

venue_name text nullable
venue_address text nullable
venue_notes text nullable

price_cents integer default 0
payment_required boolean default true

max_capacity integer nullable
capacity_visibility text default 'hidden'
waitlist_enabled boolean default true

cover_image_path text nullable

seo_title text nullable
seo_description text nullable
seo_image_path text nullable

created_at
updated_at
archived_at nullable
```

`capacity_visibility`:

```text
hidden
status
exact
```

`status`:

```text
draft
scheduled
running
completed
cancelled
```

**NON esistono `full` o `booking_open` nello status persistito.**

Sono condizioni derivate secondo la state machine 17A.

Constraint minimi:

```text
ends_at > starts_at
max_capacity IS NULL OR max_capacity > 0
price_cents >= 0
```

---

## 23.6 `bookings`

```text
id uuid PK
event_id uuid FK events
user_id uuid FK profiles

status text
payment_status text default 'unpaid'

qr_token_hash text UNIQUE nullable
qr_issued_at timestamptz nullable

confirmed_at timestamptz nullable
cancelled_at timestamptz nullable
checked_in_at timestamptz nullable

notes text nullable
admin_notes text nullable

created_at
updated_at
```

`status`:

```text
confirmed
waitlisted
cancelled
no_show
```

`payment_status`:

```text
unpaid
paid_on_site
complimentary
not_required
```

Vincolo:

```text
UNIQUE parziale su (event_id, user_id)
WHERE status IN ('confirmed', 'waitlisted')
```

La waiting-list position NON viene persistita.

FIFO:

```text
status = 'waitlisted'
ORDER BY created_at ASC
```

QR:

- presente solo per booking confirmed;
- token originale random non deve essere esposto nel database se non necessario;
- preferire hash persistito + token consegnato al client;
- il token deve poter essere rigenerato/revocato.

---


## 23.7 `event_checkins`

Tabella audit del check-in.

```text
id uuid PK
event_id uuid FK events
booking_id uuid FK bookings
user_id uuid FK profiles
checked_in_at timestamptz
checked_in_by uuid FK profiles
payment_status_at_checkin text
notes text nullable
```

Constraint: un solo check-in attivo per booking salvo procedura amministrativa esplicita.

---

## 23.8 `station_categories`

Categorie configurabili.

```text
id uuid PK
slug text UNIQUE
name text
description text nullable
sort_order integer default 0
active boolean default true
```

Esempi seed non obbligatori:

```text
console
tabletop
roleplaying
vr
arcade
other
```

Non assumere che l'elenco sia esaustivo.

---

## 23.9 `stations`

Risorsa/postazione generica.

```text
id uuid PK
slug text UNIQUE
name text
description text nullable
category_id uuid nullable FK station_categories
default_capacity integer nullable
image_path text nullable
active boolean default true
metadata jsonb default '{}'
created_at
updated_at
archived_at nullable
```

Esempi:

```text
PS5 #1
Tavolo D&D
Area Board Game
VR #1
```

---

## 23.10 `activity_categories`

```text
id uuid PK
slug text UNIQUE
name text
active boolean default true
```

Esempi non vincolanti:

```text
videogame
rpg
boardgame
vr_experience
special_activity
```

---

## 23.11 `activities`

```text
id uuid PK
slug text UNIQUE
name text
short_description text nullable
description text nullable
category_id uuid nullable FK activity_categories
image_path text nullable
active boolean default true

seo_title text nullable
seo_description text nullable

metadata jsonb default '{}'

created_at
updated_at
archived_at nullable
```

---

## 23.12 `station_activities`

Relazione catalogo globale.

```text
station_id uuid FK stations
activity_id uuid FK activities
PRIMARY KEY (station_id, activity_id)
```

---

## 23.13 `event_stations`

Istanza/configurazione della postazione nel singolo evento.

```text
id uuid PK
event_id uuid FK events
station_id uuid FK stations

public_name text nullable
description_override text nullable
capacity_override integer nullable

is_public boolean default true
active boolean default true

sort_order integer default 0
metadata jsonb default '{}'

created_at
updated_at
```

---


## 23.14 `event_activities`

Attività realmente disponibili nel singolo evento.

```text
id uuid PK
event_id uuid FK events
activity_id uuid FK activities

public_name text nullable
description_override text nullable

access_mode text
capacity integer nullable

starts_at timestamptz nullable
ends_at timestamptz nullable

is_public boolean default true
active boolean default true

metadata jsonb default '{}'

created_at
updated_at
```

`access_mode`:

```text
free_play
scheduled
registration_required
tournament
```

`event_activities` NON contiene `event_station_id`.

Una attività può essere disponibile su più postazioni.

---

## 23.14A `event_station_activities`

Junction table che collega attività e postazioni effettive nello stesso evento.

```text
event_station_id uuid FK event_stations
event_activity_id uuid FK event_activities

capacity_override integer nullable
sort_order integer default 0
metadata jsonb default '{}'

created_at
updated_at

PRIMARY KEY (event_station_id, event_activity_id)
```

Constraint applicativo/database:

- `event_station` ed `event_activity` devono appartenere allo stesso `event_id`;
- `capacity_override IS NULL OR capacity_override > 0`.

Esempio:

```text
event_activity: Tekken 8 @ VRSUS Settembre
├── event_station: PS5 #1
├── event_station: PS5 #2
└── event_station: PS5 #3
```

---


## 23.15 `news_posts`

```text
id uuid PK
slug text UNIQUE
title text
excerpt text nullable
content text
cover_image_path text nullable

status text
published_at timestamptz nullable

show_on_home boolean default false
show_in_app boolean default true
push_on_publish boolean default false

seo_title text nullable
seo_description text nullable
seo_image_path text nullable

author_id uuid nullable FK profiles

created_at
updated_at
```

Stati:

```text
draft
published
archived
```

---

## 23.16 `site_settings`

Key/value strutturato per configurazioni leggere.

```text
key text PK
value jsonb
updated_at
updated_by uuid nullable
```

Non abusare della tabella per sostituire un vero schema relazionale.

---

## 23.17 `service_pages`

```text
id uuid PK
slug text UNIQUE
title text
excerpt text nullable
content text
cover_image_path text nullable
active boolean default true
sort_order integer default 0

seo_title text nullable
seo_description text nullable
seo_image_path text nullable

created_at
updated_at
```

---

## 23.18 `service_inquiries`

```text
id uuid PK
service_page_id uuid nullable FK service_pages

name text
email text
phone text nullable
organization text nullable
people_count integer nullable
preferred_date date nullable
message text

status text default 'new'
admin_notes text nullable

created_at
updated_at
```

Stati:

```text
new
contacted
quote_sent
confirmed
lost
```

---

# 24. Data model tornei — V2

## 24.1 `tournaments`

```text
id uuid PK
event_id uuid FK events
event_activity_id uuid nullable FK event_activities

slug text
name text
description text nullable
rules text nullable

format text
status text

max_entries integer nullable
registration_opens_at timestamptz nullable
registration_closes_at timestamptz nullable
starts_at timestamptz nullable

checkin_required boolean default true
ranking_enabled boolean default true
is_public boolean default true

created_at
updated_at

UNIQUE(event_id, slug)
```

---

## 24.2 `tournament_entries`

Entry astratta.

```text
id uuid PK
tournament_id uuid FK tournaments
display_name text
seed integer nullable
status text
created_at
updated_at
```

UI V2 iniziale: una entry = un giocatore.

---

## 24.3 `tournament_entry_members`

```text
entry_id uuid FK tournament_entries
user_id uuid FK profiles
is_captain boolean default false
PRIMARY KEY(entry_id, user_id)
```

Permette future squadre senza cambiare schema.

---

## 24.4 `tournament_checkins`

```text
id uuid PK
tournament_id uuid FK tournaments
entry_id uuid FK tournament_entries
checked_in_at timestamptz
checked_in_by uuid nullable FK profiles
```

---

## 24.5 `matches`

```text
id uuid PK
tournament_id uuid FK tournaments
round_number integer
bracket_position integer

entry_a_id uuid nullable FK tournament_entries
entry_b_id uuid nullable FK tournament_entries
winner_entry_id uuid nullable FK tournament_entries

event_station_id uuid nullable FK event_stations

status text
scheduled_at timestamptz nullable
called_at timestamptz nullable
started_at timestamptz nullable
completed_at timestamptz nullable

score_payload jsonb default '{}'

next_match_id uuid nullable FK matches
next_match_slot text nullable

created_at
updated_at
```

Stati:

```text
pending
ready
called
running
completed
cancelled
```

---

# 25. Data model notifiche

## 25.1 `notifications`

```text
id uuid PK
user_id uuid FK profiles

type text
title text
message text
action_url text nullable

read_at timestamptz nullable
created_at
expires_at timestamptz nullable

metadata jsonb default '{}'
```

---

## 25.2 `push_subscriptions`

Astrazione del device/provider.

```text
id uuid PK
user_id uuid FK profiles
provider text
provider_subscription_id text
device_label text nullable
active boolean default true
created_at
updated_at

UNIQUE(provider, provider_subscription_id)
```

Non esporre dettagli provider al resto del dominio.

---

# 26. Data model ranking

## 26.1 `ranking_points_ledger`

```text
id uuid PK
user_id uuid FK profiles
activity_id uuid nullable FK activities
tournament_id uuid nullable FK tournaments

points integer
reason_code text
description text nullable

created_at
created_by uuid nullable FK profiles
metadata jsonb default '{}'
```

Le classifiche vengono derivate con query/view/materialized view in base ai volumi.

Non modificare manualmente un singolo campo `total_points` senza ledger, salvo cache derivata rigenerabile.

---

# 27. Audit log

## 27.1 `audit_logs`

Per azioni sensibili:

```text
id uuid PK
actor_user_id uuid nullable FK profiles
action text
entity_type text
entity_id uuid nullable
before_data jsonb nullable
after_data jsonb nullable
created_at
metadata jsonb default '{}'
```

Audit minimo per:

- cambio ruoli;
- check-in manuali;
- modifica pagamento;
- cancellazione prenotazioni da admin;
- modifica risultati torneo;
- modifiche ranking manuali;
- azioni amministrative distruttive.

---

# 28. Row Level Security

RLS deve essere abilitato per tutte le tabelle esposte tramite Data API.

Linee guida:

### Pubblico

Può leggere solo:

- eventi `is_public = true`;
- news pubblicate;
- service pages attive;
- catalogo pubblico;
- tornei pubblici;
- ranking pubblico se previsto.

### Utente

Può:

- leggere/modificare il proprio profilo entro i campi consentiti;
- leggere le proprie prenotazioni;
- creare prenotazioni attraverso workflow sicuro;
- leggere le proprie notifiche;
- gestire le proprie iscrizioni torneo nei limiti consentiti.

Non può:

- leggere dati privati di altri utenti;
- vedere admin notes;
- vedere capienza hidden tramite endpoint/API indiretti;
- modificare payment status;
- autoassegnarsi ruoli.

### Staff

Permessi operativi limitati alle funzioni assegnate.

### Admin

Accesso più ampio, preferibilmente attraverso policy + server operations privilegiate.

### Service role

Bypass RLS solo in ambienti server trusted.

L'agente deve creare test espliciti per verificare che un utente non possa accedere ai record di un altro.

---


# 29. Funzioni database/RPC

I contratti normativi sono definiti nelle sezioni:

```text
17F — Contratti RPC V1
17G — Contratti RPC V2 torneo
```

Implementare almeno:

```text
create_event_booking
cancel_event_booking
promote_waitlist
check_in_booking
mark_onsite_payment
```

V2:

```text
register_tournament_entry
check_in_tournament_entry
create_single_elimination_bracket
record_match_result
```

Regole generali:

- input tipizzato;
- validazione esplicita;
- atomicità;
- controllo autorizzazioni;
- race safety;
- error code stabili;
- idempotenza quando il contratto la richiede;
- test di integrazione;
- nessuna business logic critica duplicata nel client.

Le RPC che manipolano capienza o bracket devono essere considerate componenti critici e ricevere test dedicati.

---


# 30. Supabase Realtime

Utilizzare Realtime solo dove crea valore.

Casi:

- dashboard admin evento;
- check-in count;
- bracket;
- risultati;
- VRSUS Live;
- eventuali notifiche in-app.

Non sottoscrivere indiscriminatamente intere tabelle.

Usare canali/filtri e cleanup corretto delle subscription.

---

# 31. Storage

Bucket concettuali:

```text
public-content
avatars
```

Possibile separazione ulteriore se necessaria.

### Public content

- cover eventi;
- immagini news;
- immagini attività;
- immagini postazioni;
- servizi.

### Avatar

Valutare policy dedicate.

Regole:

- limitare MIME type;
- limitare dimensioni;
- nomi file non basati su input utente non sanitizzato;
- ottimizzare immagini;
- usare `@nuxt/image` sul frontend.

---

# 32. SEO

## 32.1 Obiettivo

La parte pubblica deve essere indicizzabile e tecnicamente solida già dalla V1.

## 32.2 Tecnologie

- Nuxt SSR/hybrid rendering;
- `useSeoMeta`;
- `useHead`;
- `@nuxtjs/sitemap`;
- `@nuxtjs/robots`;
- `nuxt-schema-org`;
- `@nuxt/image`.

`nuxt-og-image` può essere aggiunto se utile, ma non è requisito V1.

## 32.3 Regole

Ogni pagina pubblica significativa deve avere:

- `<title>` unico;
- meta description;
- canonical;
- Open Graph;
- Twitter card dove appropriato;
- heading hierarchy corretta;
- HTML semantico;
- alt text immagini;
- URL leggibile;
- contenuto SSR/prerender;
- status code corretto;
- breadcrumb dove utile.

## 32.4 Sitemap

Includere:

- pagine statiche pubbliche;
- eventi pubblici;
- news pubblicate;
- servizi;
- attività pubbliche se hanno pagina propria;
- tornei pubblici se indicizzabili.

Escludere:

```text
/app/**
/admin/**
/checkin/**
preview/draft
```

## 32.5 Robots

- produzione: consentire indicizzazione delle route pubbliche;
- staging/beta privata: possibilità di `noindex` globale;
- `/app` e `/admin`: sempre noindex.

## 32.6 Structured data

Usare Schema.org almeno per:

- `Organization`;
- `Event` sulle pagine evento;
- `BreadcrumbList` dove appropriato;
- `Article`/`NewsArticle` per news se coerente.

Non forzare schema non pertinente.

## 32.7 Performance

Target indicativo pagine pubbliche:

- Lighthouse SEO >= 90;
- Accessibility >= 90;
- Best Practices >= 90;
- Performance >= 85 mobile in condizioni ragionevoli.

I numeri sono obiettivi di qualità, non motivo per bloccare una release beta per differenze marginali.

## 32.8 Search Console

Quando sarà disponibile un dominio pubblico:

- configurare Google Search Console;
- inviare sitemap;
- monitorare indicizzazione.

Costo: €0.

---

# 33. PWA

Requisiti:

- manifest;
- icone;
- theme color;
- installabilità;
- service worker;
- strategia cache controllata;
- offline fallback minimo.

Non cacheare indiscriminatamente dati personali.

Priorità offline:

1. shell applicativa;
2. pagine pubbliche statiche selezionate;
3. fallback offline.

Azioni critiche come:

- prenotazione;
- check-in;
- risultato torneo;

richiedono connessione nella V1, salvo futura progettazione offline-first.

---

# 34. Push notifications

Prima implementazione:

```text
Nuxt PWA
↓
OneSignal SDK
↓
provider subscription id
↓
push_subscriptions
```

Invio:

```text
business event
↓
notification record
↓
Edge Function / Notification service
↓
PushProvider
↓
OneSignal
```

Se push fallisce, la notifica in-app deve restare disponibile.

Non richiedere permesso push immediatamente all'apertura del sito.

Chiedere il permesso in un contesto comprensibile, ad esempio:

- dopo login;
- dopo iscrizione a un torneo;
- da impostazioni notifiche.

---

# 35. QR

Generazione locale, senza SaaS.

Token:

- almeno 128 bit di entropia equivalente;
- non sequenziale;
- non contenente ID prevedibile se può diventare vettore di enumerazione;
- possibilità di revoca/rigenerazione.

Scanner:

- Camera API;
- fallback inserimento codice;
- feedback chiaro per successo/errore;
- protezione dal doppio check-in.

---

# 36. Autenticazione

Supabase Auth.

### Beta

Preferenza:

- Google OAuth per tester;
- email/password se necessario.

### Produzione

Supportare almeno:

- email/password;
- reset password;
- Google OAuth opzionale.

Le email di sistema devono passare a SMTP custom prima dell'apertura pubblica significativa.

Il servizio SMTP di default Supabase è solo da test.

---

# 37. Privacy / GDPR / sicurezza dati

Principi:

- minimizzazione dati;
- nessuna PII nei QR;
- nessun dato admin nel payload pubblico;
- separazione `admin_notes`;
- privacy policy quando il sito diventa pubblico;
- consenso push separato;
- cookie banner solo se vengono introdotti cookie/tracker non strettamente necessari;
- possibilità futura di cancellazione/account export;
- nessun analytics invasivo nella beta.

Il trattamento di eventuali minorenni deve essere deciso separatamente prima di introdurre flussi specifici.

---

# 38. Costi e servizi

> Limiti verificati al **29/08/2026**. I free tier cambiano nel tempo: l'agente deve verificare i limiti correnti prima di una release.

## 38.1 Supabase Free

Al momento della stesura:

- €0/mese;
- 50.000 MAU;
- 500 MB database;
- 1 GB file storage;
- 5 GB egress;
- 2 milioni messaggi Realtime/mese;
- 200 connessioni Realtime di picco;
- 500.000 Edge Function invocations;
- i progetti Free possono essere sospesi dopo un periodo di inattività.

Adeguato per beta.

Upgrade previsto quando necessario:

- Supabase Pro da circa **$25/mese** secondo pricing corrente.

Trigger tipici:

- applicazione realmente production-critical;
- rischio pausa non accettabile;
- storage/db oltre quota;
- necessità backup/supporto/risorse superiori.

## 38.2 Cloudflare Pages / Workers Free

Beta:

- hosting Pages €0;
- static assets gratuiti;
- Pages Functions conteggiate come Workers;
- Free Workers: 100.000 richieste/giorno;
- Pages Free: 500 build/mese secondo limiti correnti.

Upgrade Workers Paid:

- da circa **$5/mese** secondo pricing corrente.

## 38.3 OneSignal Free

Beta:

- €0;
- Web Push Free con limite corrente di 10.000 subscriber per singolo invio.

Growth:

- da circa **$19/mese + usage**.

## 38.4 Resend

Quando serve SMTP affidabile:

Free:

- €0;
- 3.000 email/mese;
- 100/giorno secondo pricing corrente.

Pro:

- circa $20/mese / 50.000 email secondo pricing corrente.

## 38.5 QR

- generazione: €0;
- scanner: €0.

## 38.6 Dominio

Beta:

- usare `*.pages.dev`;
- costo €0.

Produzione:

- acquistare dominio;
- costo dipendente da TLD/provider;
- indicativamente ~10–20 €/anno per domini comuni, da verificare.

L'acquisto del dominio non obbliga al passaggio a hosting a pagamento.

---

# 39. Configurazione ambienti

Minimo:

```text
local
beta/staging
production
```

La beta può inizialmente coincidere con il primo ambiente cloud.

Variabili concettuali:

```text
NUXT_PUBLIC_SUPABASE_URL
NUXT_PUBLIC_SUPABASE_KEY

SUPABASE_SERVICE_ROLE_KEY       # server only

ONESIGNAL_APP_ID
ONESIGNAL_REST_API_KEY          # server only

RESEND_API_KEY                  # server only, quando introdotto

APP_BASE_URL
APP_ENV
```

I nomi effettivi devono rispettare il runtime Nuxt scelto.

Creare `.env.example`.

Mai committare `.env` reali.

---

# 40. Migrazioni e sviluppo Supabase

Il database deve essere **migration-first**.

Usare Supabase CLI.

Requisiti:

- `supabase/migrations`;
- seed riproducibile;
- ambiente locale avviabile;
- migrazioni idempotenti dove appropriato;
- schema modificato tramite migration, non solo dashboard;
- types TypeScript generati dallo schema;
- migration history committata.

L'agente non deve creare manualmente in dashboard strutture non rappresentate nel repository.

---

# 41. Seed data

Creare dati demo sufficienti per testare l'intero flusso.

Esempio:

```text
Evento VRSUS Demo
  max_capacity: 20
  capacity_visibility: hidden

Stations:
  PS5 #1 — capacity 2
  Tavolo D&D — capacity 6
  Area Board Game — capacity 8
  VR #1 — capacity 1

Activities:
  Tekken 8
  One Shot D&D
  Board Games Free Play
  Beat Saber

Event mappings:
  Tekken 8 -> PS5 #1
  One Shot D&D -> Tavolo D&D
  Board Games Free Play -> Area Board Game
  Beat Saber -> VR #1
```

Creare utenti/ruoli di sviluppo senza inserire credenziali reali nel repository.

---

# 42. Testing strategy

## 42.1 Gate obbligatori

Prima di marcare una fase come completa devono passare:

```text
lint
typecheck
unit tests
integration tests pertinenti
build
```

Per flussi critici:

```text
Playwright E2E
```

## 42.2 Flussi E2E prioritari

### Booking

```text
visitatore
→ login
→ prenota
→ vede conferma
→ vede QR
```

### Capacity/waitlist

```text
evento pieno
→ utente prova a prenotare
→ entra in waiting list
```

### Check-in

```text
staff
→ apre scanner/fallback codice
→ trova booking
→ registra pagamento
→ check-in
```

### RLS

```text
user A
→ tenta di leggere booking user B
→ access denied
```

### Tournament

```text
utente
→ iscrizione torneo
→ check-in
→ bracket
→ admin inserisce risultato
→ bracket avanza
```

### SEO

Testare almeno:

- title;
- meta description;
- canonical;
- robots;
- sitemap;
- structured data essenziale;
- noindex app/admin.

---

# 43. Accessibilità

Target: WCAG 2.1 AA come riferimento pratico.

Requisiti minimi:

- navigazione tastiera;
- focus visibile;
- label form;
- errori comprensibili;
- contrasto;
- semantic HTML;
- ARIA solo quando necessario;
- scanner con fallback;
- non affidarsi esclusivamente al colore per gli stati.

---

# 44. Logging ed error handling

Gli errori devono essere:

- strutturati;
- utili per il debug;
- non contenere secret/PII inutile;
- trasformati in messaggi utenti comprensibili.

Pattern consigliato:

```ts
{
  code: "EVENT_FULL",
  message: "...",
  details: {}
}
```

Codici business esempi:

```text
EVENT_BOOKING_CLOSED
EVENT_FULL
ALREADY_BOOKED
WAITLIST_DISABLED
BOOKING_NOT_FOUND
ALREADY_CHECKED_IN
PAYMENT_STATUS_INVALID
TOURNAMENT_FULL
TOURNAMENT_REGISTRATION_CLOSED
MATCH_INVALID_STATE
FORBIDDEN
```

---


# 45. Design system, UX e direzione visuale

## 45.1 Obiettivo estetico

VRSUS deve apparire come una **esperienza gaming contemporanea**, non come:

- un gestionale aziendale generico;
- un template SaaS standard;
- un sito “gamer” sovraccarico di RGB, glitch e neon casuali.

Parole chiave:

```text
modern
gaming
premium
dark
minimal
immersive
fluid
energetic
clean
red/blue branded accents
```

Il risultato beta non deve essere un capolavoro di art direction, ma deve già avere una identità visiva intenzionale e soddisfacente.

## 45.2 Riferimenti concettuali

Usare come riferimento di principio, senza copiarne layout o asset:

### Sandbox VR

Prendere ispirazione da:

- forte focalizzazione sull'esperienza;
- percorso verso prenotazione semplice;
- cards visive e CTA evidenti;
- riduzione delle distrazioni nei funnel.

### Zero Latency VR

Prendere ispirazione da:

- storytelling immersivo;
- visual grandi;
- sensazione cinematografica;
- sezioni experience-driven;
- forte gerarchia tipografica.

### Velocity Esports

Prendere ispirazione da:

- separazione chiara tra gaming, tornei, eventi e servizi;
- comunicazione diretta delle attività;
- centralità degli eventi fisici.

### Interfacce esports/data-heavy moderne

Per bracket, ranking e dashboard:

- alta leggibilità;
- gerarchia dei dati;
- stati evidenti;
- densità controllata;
- chiarezza prima della decorazione.

Riferimenti consultati nella definizione:

```text
https://sandboxvr.com/
https://zerolatencyvr.com/
https://velocityesports.com/
```

Non replicare branding, copy, layout o materiale protetto.

## 45.3 Due modalità visuali, stesso design system

### Public / Marketing

Può essere più scenografica:

- hero immersivi;
- fotografie/video/event imagery;
- titoli grandi;
- composizione editoriale;
- scroll reveal;
- sezioni con forte ritmo;
- CTA molto evidenti.

### App / Event operations

Deve essere più funzionale:

- gerarchia immediata;
- pochi elementi prioritari;
- card/status chiari;
- navigazione mobile rapida;
- animazioni corte e utili.

### Admin

Deve privilegiare:

- velocità;
- leggibilità;
- tabelle;
- filtri;
- form;
- keyboard usability;
- densità superiore rispetto al marketing site.

Non rendere l'admin inutilmente cinematografico.

## 45.4 Tema

Approccio **dark-first**.

Il design deve essere tokenizzato tramite CSS variables / Tailwind theme.

Token obbligatori concettuali:

```text
--color-bg
--color-surface-1
--color-surface-2
--color-border
--color-text
--color-text-muted
--color-primary
--color-secondary
--color-success
--color-warning
--color-danger
```

I colori identitari approvati del progetto VRSUS sono:

```text
ROSSO
BLU
```

Devono essere usati come **accenti di brand**, non come colori dominanti distribuiti ovunque.

Direzione beta consigliata:

```text
background      #07080D
surface-1       #0F1118
surface-2       #161925
border          rgba(255,255,255,.10)
text            #F5F7FA
text-muted      #9AA3B2

primary         VRSUS Red
secondary       VRSUS Blue
```

Le tonalità esatte di rosso e blu possono essere raffinate quando saranno disponibili logo e brand assets definitivi.

Fino ad allora l'agente deve scegliere tonalità moderne e coerenti con il tema dark, documentandole nei design token.

Regole:

- Rosso e Blu sono i due colori tematici del brand;
- usarli con parsimonia;
- preferire superfici neutre/scure;
- usare il rosso per CTA, highlight, energia o stati selezionati quando semanticamente appropriato;
- usare il blu per contrasto, elementi secondari, informazioni live o profondità visuale;
- non usare rosso e blu contemporaneamente su ogni componente;
- evitare effetto “carnevale” o RGB;
- evitare gradienti rosso-blu ovunque;
- non trasformare ogni bordo in neon;
- glow solo occasionale;
- mantenere contrasto WCAG;
- non usare il rosso per messaggi non-error se questo crea ambiguità con gli stati `danger`: il design system deve distinguere **brand red** e **semantic danger red** se necessario.

Esempio di distribuzione corretta:

```text
80–90% superfici neutre/scure
10–20% accenti complessivi di brand
```

La percentuale è una linea guida visuale, non un vincolo matematico.

Il risultato deve comunicare VRSUS attraverso rosso e blu senza sembrare un'interfaccia RGB generica.

## 45.5 Typography

Usare una combinazione moderna e leggibile.

Regola:

- font display distintivo ma leggibile per hero/headline;
- sans-serif molto leggibile per UI, dati e body;
- massimo due famiglie font.

Preferire font open source / Google Fonts o font già licenziati nel progetto.

Non introdurre licenze a pagamento.

Le tabelle, ranking e numeri devono mantenere ottima scansione visiva; usare tabular numbers dove utile.

## 45.6 Layout

### Public

- content width controllato;
- sezioni respirate;
- hero full-bleed o quasi full-bleed quando opportuno;
- grid responsive;
- immagini importanti non confinate in piccole thumbnail.

### App

- mobile-first;
- bottom navigation per sezioni primarie su mobile quando migliora UX;
- desktop può usare header/sidebar;
- CTA primaria sempre facilmente raggiungibile.

### Admin

- sidebar desktop;
- drawer/sidebar mobile;
- data tables responsive con alternative card quando la tabella diventa inutilizzabile.

## 45.7 Component architecture

Usare **Nuxt UI 4** per primitives/accessibility e per ridurre boilerplate:

- Button;
- Form;
- FormField;
- Modal/Dialog;
- Drawer/Slideover;
- Toast;
- Dropdown;
- Table;
- Tabs;
- Badge;
- Skeleton;
- Tooltip;
- command/search se utile.

Tuttavia:

**NON lasciare l'aspetto Nuxt UI default come design finale.**

Definire theme VRSUS centralizzato.

Creare componenti brand-specific:

```text
VrsusHero
EventCard
ExperienceCard
TournamentCard
RankingRow
StatusBadge
LiveMetric
SectionHeading
GamingSurface
```

Non creare wrapper inutili per ogni singolo componente Nuxt UI.

## 45.8 Motion system

L'animazione deve rendere la UX “viva”, non rallentarla.

### Livelli

#### Micro-interactions

Esempi:

- hover;
- press;
- focus;
- toggle;
- badge update;
- toast;
- card selection.

Durata indicativa:

```text
120–220 ms
```

Usare principalmente CSS/Vue transitions.

#### Component/section transitions

Esempi:

- card entrance;
- modal/drawer;
- filtro;
- cambio tab;
- reveal contenuto.

Durata:

```text
180–350 ms
```

#### Editorial / cinematic

Esempi:

- hero homepage;
- reveal titolo;
- sequenza immagini;
- scroll storytelling selezionato.

Durata:

```text
400–900 ms
```

Usare GSAP quando porta un reale vantaggio.

### Regole GSAP

- import client-safe;
- cleanup timeline/listener;
- niente global selector fragili;
- preferire refs;
- preset condivisi;
- ScrollTrigger solo su sezioni realmente progettate per esso;
- non animare ogni blocco al scroll.

### Performance motion

Animare preferibilmente:

```text
transform
opacity
```

Evitare layout thrashing.

### Reduced motion

Con:

```text
prefers-reduced-motion: reduce
```

- eliminare parallax;
- eliminare grandi trasformazioni;
- ridurre/dismettere animazioni decorative;
- mantenere feedback essenziali non disturbanti.

## 45.9 Anti-pattern visuali

Evitare:

- glow su ogni elemento;
- gradienti su ogni superficie;
- bordi neon ovunque;
- testi con glitch continui;
- scanline;
- animazioni infinite pervasive;
- parallax pesante su mobile;
- glassmorphism che riduce contrasto;
- 10 colori accent;
- caroselli inutili;
- autoplay video pesanti senza ottimizzazione;
- layout che sacrificano UX per effetto wow.

## 45.10 Feedback e stato

Ogni azione mutativa deve fornire feedback.

Stati standard:

```text
idle
loading
success
error
disabled
empty
```

Esempi:

- prenotazione: CTA -> loading -> conferma visibile;
- check-in: feedback success molto evidente;
- QR invalido: errore evidente, nessun dubbio;
- match salvato: stato aggiornato + toast;
- tabella senza dati: empty state utile, non spazio vuoto.

## 45.11 Touch e mobile UX

Target touch minimo indicativo:

```text
44x44 CSS px
```

Evitare CTA critiche troppo vicine.

Lo scanner e il check-in devono essere progettati principalmente per smartphone.

## 45.12 Performance visuale

Il design non deve compromettere i target SEO/performance.

- lazy-load media below fold;
- immagini responsive;
- video compressi e caricati intenzionalmente;
- animazioni non devono bloccare LCP;
- niente canvas/WebGL decorativo nella V1 salvo approvazione;
- nessuna libreria 3D per puro ornamento.

## 45.13 Design acceptance criteria beta

La beta visuale è accettabile quando:

- nessuna pagina principale appare come HTML/Tailwind boilerplate;
- esiste un tema VRSUS coerente;
- public site, app e admin sembrano parti dello stesso prodotto;
- homepage ha almeno un momento visuale distintivo;
- CTA evento è evidente;
- stati interattivi sono fluidi;
- layout mobile è curato;
- animazioni sono presenti ma non invasive;
- dati live rimangono leggibili;
- Lighthouse/accessibilità restano nei target.

## 45.14 Processo visuale dell'agente

Prima di implementare tutte le pagine:

1. costruire theme/tokens;
2. creare primitives;
3. completare una vertical slice visuale:
   - header;
   - homepage hero;
   - EventCard;
   - una pagina admin;
   - una pagina app mobile;
4. verificare coerenza;
5. soltanto dopo propagare il design.

Evitare di costruire 30 pagine tutte diverse per poi “sistemare il design alla fine”.

---


# PARTE III — ROADMAP ESECUTIVA PER L'AGENTE AI

## 46. Regole operative dell'agente

### 46.0 Regola di granularità

L'agente non deve tentare di implementare un'intera fase in un singolo task se contiene più domini critici.

Unità di lavoro consigliata:

```text
1 obiettivo verificabile
1 set coerente di file
1 migration/RPC o 1 vertical slice UI
test
documentazione stato
commit
```

Esempio corretto:

```text
Implementare create_event_booking + integration test + RLS necessaria.
```

Esempio troppo ampio:

```text
Implementare tutto il sistema eventi, booking, QR e admin.
```

Questo requisito esiste per mantenere affidabilità anche con modelli AI piccoli/economici.


Prima di scrivere codice:

1. leggere interamente questo documento;
2. ispezionare repository e stato attuale;
3. leggere `.ai/STATUS.md`, `.ai/HANDOFF.md`, `.ai/DECISIONS.md` se presenti;
4. verificare le versioni correnti delle dipendenze;
5. identificare la fase roadmap attiva;
6. non iniziare feature future se la fase corrente non supera i gate.

Dopo ogni sessione significativa:

- aggiornare stato;
- aggiornare next step;
- annotare decisioni;
- annotare migrazioni;
- annotare test eseguiti;
- lasciare il progetto eseguibile.

---

# 47. File operativi dell'agente

## `.ai/STATUS.md`

Deve contenere:

```text
Current phase:
Overall status:
Last completed task:
Current branch/commit:
Known issues:
Services configured:
Migrations applied:
Tests status:
```

## `.ai/NEXT_STEPS.md`

Massimo 5–10 azioni concrete in ordine.

Ogni item deve essere riprendibile da un altro agente.

## `.ai/HANDOFF.md`

Da aggiornare prima di interrompere una sessione lunga o cambiare agente.

Contenuti:

- cosa è stato fatto;
- cosa è parzialmente implementato;
- file principali;
- decisioni;
- comandi per avvio/test;
- next step preciso;
- problemi noti.

## `.ai/DECISIONS.md`

Formato ADR leggero:

```text
Date
Decision
Context
Alternatives
Reason
Consequences
```

## `.ai/CHANGELOG.md`

Modifiche funzionali realizzate dall'agente.

## `.ai/TEST_REPORT.md`

Ultimi risultati:

```text
lint:
typecheck:
unit:
integration:
e2e:
build:
manual smoke test:
```

---

# 48. Definition of Done globale

Una feature è completa solo quando:

- comportamento implementato;
- validazione presente;
- permessi/RLS verificati;
- error state presente;
- loading state presente;
- responsive;
- accessibile in modo ragionevole;
- test appropriati;
- build passa;
- documentazione agente aggiornata.

“Il codice compila” non equivale a feature completata.

---

# 49. FASE 0 — Bootstrap

## Obiettivo

Creare una base riproducibile e pronta allo sviluppo.

## Task

1. inizializzare Nuxt 4 + TypeScript;
2. configurare pnpm;
3. configurare Tailwind CSS 4;
4. configurare ESLint;
5. configurare formatting;
6. configurare test unit;
7. configurare Playwright;
8. configurare Supabase CLI;
9. creare `.env.example`;
10. creare struttura `.ai/`;
11. configurare Git ignore;
12. configurare Nuxt UI 4;
13. definire design tokens VRSUS iniziali;
14. preparare layout base;
15. configurare runtime config;
16. configurare strategia motion (native transitions + GSAP client-safe);
17. aggiungere README developer;
18. verificare build Cloudflare-compatible.

## Exit criteria

```text
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

tutti funzionanti.

---

# 50. FASE 1 — Database foundation

## Obiettivo

Creare lo schema V1 e sviluppo Supabase locale.

## Implementare

- profiles;
- roles;
- user_roles;
- events;
- bookings;
- event_checkins;
- station_categories;
- stations;
- activity_categories;
- activities;
- station_activities;
- event_stations;
- event_activities;
- event_station_activities;
- news_posts;
- site_settings;
- service_pages;
- service_inquiries;
- notifications;
- push_subscriptions;
- audit_logs.

Tabelle tornei/ranking possono essere inserite ora se non aumentano il rischio, ma la feature UI resta V2.

## Task

1. migrazioni;
2. constraint;
3. indici;
4. trigger `updated_at`;
5. seed ruoli;
6. seed demo;
7. types generati;
8. prime RLS policy;
9. test database.

## Exit criteria

Database ricreabile da zero con:

```text
migration + seed
```

senza interventi manuali dashboard.

---

# 51. FASE 2 — Authentication, RBAC e sicurezza

## Obiettivo

Rendere disponibili autenticazione e ruoli.

## Implementare

- login;
- logout;
- sessione;
- profile bootstrap;
- route middleware;
- role checks;
- area `/app`;
- area `/admin`;
- RLS completa V1;
- admin role management protetto;
- test accessi.

## UI minima

```text
/login
/app
/admin
```

## Exit criteria

- utente non vede admin;
- staff vede solo strumenti autorizzati;
- user A non vede dati privati user B;
- service role non è nel client;
- test RLS passano.

---

# 52. FASE 3 — Sito pubblico + CMS base + SEO

## Obiettivo

Realizzare il sito VRSUS pubblico.

Se copy o asset definitivi non sono disponibili, applicare integralmente la **Content Policy 17H**: lo sviluppo deve proseguire con copy provvisorio non-fattuale e visual temporanei controllati, tracciando i CONTENT TODO.

## Route

```text
/
/eventi
/eventi/:slug
/esperienze
/news
/news/:slug
/servizi
/servizi/:slug
/regolamento
```

Ranking/tornei possono essere placeholder se V2 non è ancora attiva.

## Implementare

Prima della propagazione completa del frontend, implementare la vertical slice visuale definita in 45.14.

- homepage;
- prossimo evento;
- catalogo dinamico;
- news;
- servizi;
- CTA prenotazione;
- CMS admin news;
- CMS admin attività/postazioni;
- CMS admin servizi;
- campi SEO;
- sitemap;
- robots;
- schema.org;
- OG/meta;
- immagini responsive;
- noindex beta configurabile.

## Exit criteria

- design VRSUS coerente e non-default;
- Rosso + Blu usati come accenti controllati del brand;
- vertical slice visuale approvabile;
- responsive mobile/desktop;
- motion system rispettato;
- Content Policy rispettata;
- nessuna factual claim inventata;
- CONTENT TODO documentati;
- contenuti arrivano da Supabase;
- nessuna duplicazione CMS/app;
- pagine pubbliche SSR/prerender leggibili;
- Lighthouse baseline;
- sitemap valida;
- private routes escluse.

---

# 53. FASE 4 — Event management + prenotazioni

## Obiettivo

Gestire un evento VRSUS end-to-end prima del check-in.

## Admin

- lista eventi;
- crea;
- modifica;
- archivia;
- duplica evento precedente;
- configura capienza;
- configura `capacity_visibility`;
- configura prezzo sul posto;
- configura date prenotazioni;
- associa postazioni;
- associa attività;
- lista prenotazioni;
- waiting list.

## Utente

- dettaglio evento;
- prenota;
- annulla;
- waiting list;
- stato prenotazione;
- dashboard.

## Business logic critica

`create_event_booking` deve essere race-safe.

## Exit criteria

Testare concorrenza/logica capienza.

Caso:

```text
capacity 1
due utenti prenotano contemporaneamente
→ massimo uno confirmed
→ l'altro waitlisted/error secondo configurazione
```

---

# 54. FASE 5 — QR + check-in + pagamento sul posto

## Obiettivo

Gestire ingresso fisico all'evento.

## Implementare

- generazione QR;
- pagina QR utente;
- scanner staff;
- fallback manuale;
- lookup prenotazione;
- stato pagamento;
- check-in;
- blocco doppio check-in;
- audit log;
- dashboard live base.

## Exit criteria

E2E:

```text
booking
→ QR
→ scan
→ payment paid_on_site
→ check-in
→ count aggiornato
```

Nessuna PII nel QR.

---

# 55. FASE 6 — PWA

## Obiettivo

Rendere VRSUS installabile e mobile-ready.

## Implementare

- manifest;
- icone;
- service worker;
- caching safe;
- offline page;
- install prompt/istruzioni quando opportuno;
- test smartphone;
- scanner in PWA;
- no cache accidentale dati sensibili.

## Exit criteria

- installabile su browser compatibili;
- navigazione base funzionante;
- check service worker;
- aggiornamento nuova versione gestito senza loop.

---

# 56. FASE 7 — Deployment beta €0

## Obiettivo

Avere una versione usabile dal team.

## Servizi

- Supabase Free;
- Cloudflare Pages Free;
- OneSignal non ancora obbligatorio;
- nessun dominio;
- nessun SMTP production.

## Implementare

- ambiente cloud Supabase;
- deployment Cloudflare;
- variabili environment;
- redirect auth;
- HTTPS;
- seed/tester;
- noindex beta se desiderato;
- smoke test completo.

## Exit criteria

URL:

```text
https://<project>.pages.dev
```

accessibile ai tester.

Costo ricorrente infrastrutturale:

```text
€0/mese
```

---

# 57. MILESTONE — V1 / MVP

La V1 è completata quando esistono:

```text
✓ sito pubblico
✓ account
✓ ruoli
✓ eventi
✓ prenotazioni
✓ capienza privata/configurabile
✓ waiting list
✓ QR
✓ check-in
✓ pagamento sul posto registrabile
✓ catalogo flessibile
✓ postazioni/attività per evento
✓ news
✓ servizi/leads
✓ admin
✓ PWA
✓ SEO base
✓ deployment beta
```

Non serve ancora un tournament engine completo per dichiarare V1 usabile.

---

# 58. FASE 8 — Tournament System V2

## Obiettivo

Gestire un torneo completo.

## Implementare database

- tournaments;
- tournament_entries;
- tournament_entry_members;
- tournament_checkins;
- matches.

## Implementare

- creazione torneo;
- iscrizione;
- cancellazione;
- capienza;
- check-in;
- single elimination;
- seeding;
- bracket;
- match;
- assegnazione postazione;
- risultato;
- avanzamento automatico;
- storico;
- realtime.

## Vincolo

Il bracket engine deve essere isolato e testabile.

Non inserire la logica di avanzamento direttamente nei componenti Vue.

## Exit criteria

Torneo demo 8 partecipanti:

```text
registrazione
→ check-in
→ bracket
→ quarti
→ semifinali
→ finale
→ winner
```

senza interventi manuali sul database.

---

# 59. FASE 9 — Notification System + Push

## Obiettivo

Comunicazioni affidabili durante l'evento.

## Implementare

- inbox notifiche;
- unread badge;
- preference base;
- OneSignal adapter;
- Edge Function invio;
- mapping subscription;
- notifiche torneo;
- “è il tuo turno”;
- retry/log fallimenti;
- fallback in-app.

## Exit criteria

Tournament admin:

```text
Call players
```

Utenti target:

```text
push + notification inbox
```

Altri utenti:

```text
nessuna notifica
```

---

# 60. FASE 10 — Ranking

## Obiettivo

Classifiche derivate dai risultati.

## Implementare

- ranking_points_ledger;
- regole punteggio iniziali;
- ranking globale;
- ranking per attività;
- profilo statistiche base;
- admin adjustment auditabile.

## Exit criteria

Completando torneo:

- punti attribuiti una sola volta;
- ricalcolo idempotente;
- ranking aggiornato;
- modifica risultato gestita senza duplicazioni.

---

# 61. MILESTONE — V2

```text
✓ tournament engine
✓ tournament check-in
✓ bracket
✓ match
✓ realtime
✓ push
✓ ranking
```

A questo punto VRSUS può utilizzare la piattaforma come vero strumento operativo dell'evento.

---

# 62. FASE 11 — Community V3

Implementare solo dopo feedback reale.

Possibili feature:

- statistiche avanzate;
- achievement;
- profili pubblici;
- stagioni;
- streak;
- storico tornei;
- squadre;
- ranking evoluto.

Ogni feature deve essere validata contro reale utilizzo prima di essere costruita.

---

# 63. FASE 12 — Event Experience V4

Possibili feature:

- stato postazioni live;
- code virtuali;
- prenotazione postazione;
- chiamata utenti;
- display VRSUS Live;
- monitor risultati;
- schedule live;
- analytics evento.

Non costruire prima di avere dati reali sugli eventi.

---

# 64. FASE 13 — Production hardening

Prima dell'apertura ampia al pubblico:

## Infrastruttura

- dominio;
- SMTP custom;
- Resend;
- valutazione Supabase Pro;
- backup strategy;
- disaster recovery;
- monitor quote;
- rate limiting;
- abuse prevention.

## Sicurezza

- audit RLS;
- dependency audit;
- CSP;
- security headers;
- CSRF dove applicabile;
- XSS;
- upload policy;
- input fuzzing sui flussi critici;
- secret rotation.

## Privacy

- privacy policy;
- cookie policy;
- termini/regolamento;
- data retention;
- procedure delete/export.

## SEO

- Search Console;
- sitemap;
- canonical;
- rich results;
- redirect definitivi;
- 404;
- robots production.

## Qualità

- cross-browser;
- smartphone reali;
- evento simulato end-to-end;
- load test sui flussi importanti.

---

# 65. Dashboard admin finale attesa

Navigazione indicativa:

```text
Dashboard
├── Eventi
│   ├── Lista
│   ├── Prenotazioni
│   ├── Waiting list
│   ├── Check-in
│   └── Presenze
├── Tornei
│   ├── Iscritti
│   ├── Check-in
│   ├── Bracket
│   ├── Match
│   └── Risultati
├── Utenti
├── Ranking
├── Catalogo
│   ├── Categorie
│   ├── Postazioni
│   └── Attività
├── News
├── Notifiche
├── Servizi / Lead
└── Impostazioni
```

---

# 66. Dashboard evento live attesa

Esempio:

```text
VRSUS — SETTEMBRE

Prenotazioni       124
Presenti            87
Pagati sul posto    82
Waiting list        12

Tornei attivi        3
Match in corso        6

[CHECK-IN]
[PRENOTAZIONI]
[TORNEI]
[INVIA NOTIFICA]
```

La presenza di `max_capacity` non implica che debba essere mostrata pubblicamente.

---

# 67. Journey finale partecipante

```text
Visita sito
↓
Scopre VRSUS
↓
Consulta prossimo evento
↓
Prenota
↓
Riceve conferma
↓
Trova QR nell'app
↓
Arriva all'evento
↓
Pagamento sul posto
↓
Check-in
↓
Free play / attività
↓
Iscrizione torneo
↓
Check-in torneo
↓
Push: “è il tuo turno”
↓
Match
↓
Risultato
↓
Ranking aggiornato
↓
Storico profilo
```

Ogni passaggio deve evitare navigazioni superflue.

---

# 68. Criteri per decisioni future

Quando l'agente deve scegliere tra due soluzioni, usare questo ordine di priorità:

1. correttezza;
2. sicurezza;
3. semplicità;
4. manutenibilità;
5. costo €0 durante beta;
6. performance;
7. facilità di sostituzione del provider;
8. developer experience.

Evitare overengineering.

Una soluzione semplice e robusta per 100–500 partecipanti è preferibile a un'architettura distribuita progettata prematuramente per milioni di utenti.

---

# 69. Anti-pattern vietati

Non fare:

- ruoli salvati solo nel frontend;
- admin guard basata solo su UI;
- service-role key nel browser;
- QR con nome/email;
- controllo capienza solo client-side;
- calcolo ranking irreversibile senza audit;
- logica tournament dispersa nei componenti;
- chiamate OneSignal sparse nella UI;
- `any` sistematico;
- tabella `games` usata per rappresentare qualsiasi cosa;
- enum fisso delle piattaforme;
- duplicazione contenuti sito/app;
- pagine pubbliche SPA-only senza necessità;
- indicizzazione `/admin`;
- migrazioni eseguite solo manualmente via dashboard;
- secret committati;
- feature a pagamento introdotte senza approvazione;
- pagamento online;
- testimonianze, numeri, partner, storia o claim commerciali inventati;
- immagini competitor o fotografie web non verificate usate come asset VRSUS;
- trasformare la V1 in un page-builder CMS generico senza necessità.

---

# 70. Strategia handoff

Prima di terminare una sessione con lavoro incompleto, l'agente deve garantire:

```text
git diff comprensibile
nessun secret
build state documentato
migration state documentato
test state documentato
TODO espliciti
```

`HANDOFF.md` deve permettere a un agente senza memoria della sessione precedente di riprendere in pochi minuti.

Esempio:

```text
Current phase: Phase 4
Completed:
- create_event_booking RPC
- booking form
- booking dashboard card

Incomplete:
- cancellation flow
- waiting list promotion

Important files:
- supabase/migrations/...
- app/pages/eventi/[slug].vue
- app/composables/useBooking.ts

Known issue:
- race test waiting list not yet implemented

Next action:
1. implement cancel_event_booking
2. write integration tests
3. implement waiting list promotion
```

---

# 71. Principio di autonomia dell'agente

L'agente è autorizzato a decidere autonomamente dettagli implementativi che non cambiano:

- requisiti;
- costi;
- UX fondamentale;
- stack principale;
- sicurezza;
- data ownership.

Può, ad esempio:

- rinominare un composable;
- rifattorizzare una cartella;
- scegliere una libreria open source piccola;
- cambiare implementazione interna.

Deve richiedere decisione umana quando vuole:

- cambiare Nuxt/Supabase;
- introdurre un servizio a pagamento;
- introdurre pagamenti online;
- cambiare il comportamento della prenotazione;
- rendere pubblici dati prima privati;
- eliminare feature richieste;
- introdurre raccolta dati/analytics non prevista;
- cambiare il modello di autorizzazione.

---

# 72. Metriche di successo della beta

La beta è considerata valida quando il team VRSUS riesce realmente a:

1. creare il prossimo evento;
2. configurare postazioni e attività eterogenee;
3. pubblicarlo;
4. far iscrivere tester;
5. raggiungere capienza senza oversubscription;
6. gestire waiting list;
7. visualizzare QR;
8. effettuare check-in da telefono;
9. registrare pagamento sul posto;
10. consultare dati live;
11. aggiornare news senza toccare codice;
12. utilizzare la PWA da smartphone.

V2 aggiunge:

13. creare torneo;
14. iscrivere partecipanti;
15. generare bracket;
16. gestire match;
17. inviare push;
18. aggiornare ranking.

---

# 73. Riferimenti ufficiali

Le versioni e i pricing possono cambiare. Prima di upgrade o rilascio verificare le fonti ufficiali.

## Nuxt

- Nuxt 4 deployment: https://nuxt.com/docs/4.x/getting-started/deployment
- Cloudflare deployment: https://nuxt.com/deploy/cloudflare
- SEO & Meta: https://nuxt.com/docs/4.x/getting-started/seo-meta
- Supabase Nuxt module: https://nuxt.com/modules/supabase
- PWA module: https://nuxt.com/modules/vite-pwa-nuxt
- Sitemap: https://nuxt.com/modules/sitemap
- Robots: https://nuxt.com/modules/robots
- Schema.org: https://nuxt.com/modules/schema-org
- Nuxt Image: https://nuxt.com/modules/image

## Supabase

- Home/docs: https://supabase.com/
- Pricing: https://supabase.com/pricing
- Billing/quotas: https://supabase.com/docs/guides/platform/billing-on-supabase
- Auth: https://supabase.com/docs/guides/auth
- SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Realtime pricing: https://supabase.com/docs/guides/realtime/pricing
- Edge Functions: https://supabase.com/docs/guides/functions
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security

## Cloudflare

- Pages: https://developers.cloudflare.com/pages/
- Pages pricing: https://developers.cloudflare.com/pages/functions/pricing/
- Pages limits: https://developers.cloudflare.com/pages/platform/limits/
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/

## UI / Motion / Inspiration

- Nuxt UI: https://ui.nuxt.com/
- Nuxt transitions: https://nuxt.com/docs/4.x/getting-started/transitions
- GSAP: https://gsap.com/
- Sandbox VR: https://sandboxvr.com/
- Zero Latency VR: https://zerolatencyvr.com/
- Velocity Esports: https://velocityesports.com/

## OneSignal

- Pricing: https://onesignal.com/pricing

## Resend

- Pricing: https://resend.com/pricing

---

# 74. Stato iniziale della roadmap

Al momento della creazione di questo documento:

```text
Phase 0   NOT STARTED
Phase 1   NOT STARTED
Phase 2   NOT STARTED
Phase 3   NOT STARTED
Phase 4   NOT STARTED
Phase 5   NOT STARTED
Phase 6   NOT STARTED
Phase 7   NOT STARTED

V1       NOT STARTED

Phase 8   NOT STARTED
Phase 9   NOT STARTED
Phase 10  NOT STARTED

V2       NOT STARTED
```

Il primo agente deve iniziare da **FASE 0 — Bootstrap**.

---

# 75. Sintesi finale per l'agente

Costruire **VRSUS** come PWA full-stack con:

```text
Nuxt 4
TypeScript
Tailwind CSS 4
Nuxt UI 4 + tema VRSUS custom
Native/Vue transitions + GSAP selettivo
Supabase
Cloudflare Pages
OneSignal
QR locale
SEO SSR
```

Priorità immediata:

```text
V1
=
sito pubblico
+ utenti
+ eventi
+ prenotazioni
+ capienza configurabile e privata di default
+ waiting list
+ catalogo flessibile
+ QR
+ check-in
+ pagamento sul posto
+ CMS
+ servizi/leads
+ admin
+ PWA
+ SEO
```

Successivamente:

```text
V2
=
tornei
+ bracket
+ match
+ realtime
+ push
+ ranking
```

Il sistema deve restare semplice, sicuro, economico e progettato attorno alla gestione reale degli eventi VRSUS.

Il sito pubblico deve avere un'identità moderna dark/gaming con **Rosso e Blu come accenti VRSUS usati con parsimonia**, e deve poter essere sviluppato anche prima della disponibilità di copy e fotografie definitive applicando la Content Policy.

**Non progettare la piattaforma attorno alle tecnologie o ai videogiochi: progettala attorno all'evento e alle esperienze che VRSUS può offrire.**
