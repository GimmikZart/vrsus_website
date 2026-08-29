# AI Handoff Protocol

Questo documento definisce il protocollo obbligatorio di passaggio di consegne
tra gli agenti AI che lavorano sul progetto.

L'obiettivo è garantire che una nuova AI possa continuare il lavoro senza
dipendere dalla cronologia della conversazione precedente.

---

## Obiettivo del handoff

Ogni sessione deve lasciare nel repository tutte le informazioni necessarie
per permettere a un altro agente di capire:

- cosa è stato completato;
- cosa è ancora in corso;
- quali verifiche sono state eseguite;
- quali problemi sono aperti;
- quale attività deve essere eseguita successivamente;
- quali decisioni tecniche devono essere mantenute.

La conversazione dell'agente corrente non deve essere necessaria per continuare
lo sviluppo.

---

# Avvio di una nuova sessione

Prima di modificare il codice, l'agente deve:

1. leggere `docs/technical/TECHNICAL_SPECIFICATION.md`;
2. leggere `docs/ai/DECISIONS.md`;
3. leggere `docs/ai/CURRENT_STATE.md`;
4. leggere `docs/ai/NEXT_STEPS.md`;
5. controllare lo stato reale del repository;
6. controllare `git status`;
7. verificare che la documentazione di handoff sia coerente con il codice.

`WORKLOG.md` non deve essere letto integralmente a ogni sessione.
Deve essere consultato solo quando è necessario ricostruire informazioni storiche.

Se il repository contraddice `CURRENT_STATE.md`, l'agente deve verificare
la situazione e correggere la documentazione prima di procedere.

---

# Durante la sessione

L'agente deve lavorare per unità di lavoro coerenti e verificabili.

Dopo una milestone significativa deve aggiornare la documentazione di handoff
se lo stato del progetto è cambiato in modo rilevante.

Non è necessario aggiornare i documenti dopo ogni singola modifica.

Una milestone significativa può essere, ad esempio:

- completamento di un componente;
- completamento di una integrazione;
- risoluzione di un bug importante;
- modifica architetturale;
- completamento di un gruppo di test;
- scoperta di un blocker rilevante.

---

# Prima di terminare una sessione

Prima di interrompere il lavoro, l'agente deve:

1. evitare di lasciare modifiche parziali non comprensibili;
2. eseguire le verifiche pertinenti disponibili;
3. controllare `git status`;
4. aggiornare `CURRENT_STATE.md`;
5. aggiornare `NEXT_STEPS.md`;
6. aggiornare `DECISIONS.md` se sono state prese decisioni persistenti;
7. aggiungere una nuova voce a `WORKLOG.md`;
8. documentare eventuali blocker o problemi aperti.

---

# Aggiornamento di CURRENT_STATE.md

`CURRENT_STATE.md` rappresenta solamente lo stato attuale del progetto.

Deve essere mantenuto breve e aggiornato.

Deve contenere almeno:

## Stato sintetico

Descrizione breve della fase corrente del progetto.

## Lavoro completato

Funzionalità realmente implementate e verificate.

## Lavoro in corso

Componenti parzialmente implementati.

## Verifiche

Ultimo stato noto di:

- build;
- unit test;
- integration test;
- altre verifiche rilevanti.

Indicare solo verifiche realmente eseguite.

## Problemi aperti

Bug, blocker o limitazioni conosciute.

## Ultimo aggiornamento

Data dell'ultimo aggiornamento.

Non utilizzare `CURRENT_STATE.md` come storico.

Le informazioni non più attuali devono essere rimosse o aggiornate.

---

# Aggiornamento di NEXT_STEPS.md

`NEXT_STEPS.md` deve descrivere il lavoro immediatamente successivo.

Deve contenere una sola attività prioritaria principale.

Per la prossima attività indicare:

- obiettivo;
- area o file interessati;
- comportamento atteso;
- criterio di completamento;
- verifica da eseguire.

Esempio generico:

## Prossima attività

Implementare `[NomeComponente]`.

### Area interessata

`src/.../`

### Comportamento atteso

- validare l'input previsto;
- applicare la trasformazione richiesta;
- gestire gli errori previsti;
- restituire il risultato tramite il contratto definito.

### Criterio di completamento

Il componente gestisce correttamente input validi e gli errori previsti.

### Verifica

Eseguire i test relativi al componente.

---

# Aggiornamento di DECISIONS.md

`DECISIONS.md` contiene solamente decisioni tecniche persistenti.

Non deve contenere:

- attività svolte;
- bug temporanei;
- note operative;
- stato della sessione.

Una nuova decisione deve essere registrata solo se influenza il lavoro futuro.

Ogni decisione deve contenere almeno:

## DEC-XXX — Titolo

**Status:** Accepted

### Decisione

Descrizione della scelta effettuata.

### Motivazione

Perché è stata scelta questa soluzione.

### Conseguenze

Impatto sull'implementazione futura.

Se una decisione viene sostituita:

- non eliminarla;
- impostare `Status: Superseded`;
- indicare quale nuova decisione la sostituisce.

---

# Aggiornamento di WORKLOG.md

`WORKLOG.md` è append-only.

Non riscrivere o cancellare le sessioni precedenti.

Per ogni sessione aggiungere una voce:

## YYYY-MM-DD — Sessione N

### Lavoro svolto

Breve descrizione delle attività completate.

### File principali modificati

- `path/file.cs`
- `path/altro.cs`

### Verifiche

- `dotnet build` → PASS / FAIL
- `dotnet test` → risultato

### Problemi emersi

Eventuali problemi o blocker.

### Stato finale della sessione

Breve nota sul punto raggiunto.

---

# Gestione dell'esaurimento del contesto

L'agente non deve aspettare necessariamente di esaurire completamente il contesto.

Se la sessione diventa molto lunga o non è più possibile garantire una conclusione
ordinata, deve effettuare un handoff anticipato.

Prima di fermarsi deve:

1. non iniziare nuovi task importanti;
2. stabilizzare il lavoro corrente;
3. eseguire almeno la verifica più pertinente;
4. aggiornare tutti i documenti di handoff necessari;
5. indicare chiaramente il punto da cui riprendere.

Nel caso di sessione interrotta prima del completamento del progetto,
aggiungere in `CURRENT_STATE.md`:

`SESSIONE INTERROTTA - RIPRENDERE DA NEXT_STEPS.md`

---

# Completamento del progetto

Quando tutti i requisiti della Technical Specification risultano implementati:

1. eseguire la build completa;
2. eseguire tutti i test disponibili;
3. verificare i criteri di completamento della specifica;
4. aggiornare `CURRENT_STATE.md`;
5. aggiornare `WORKLOG.md`;
6. verificare che non rimangano attività necessarie in `NEXT_STEPS.md`.

Solo se il progetto è realmente verificato inserire in `CURRENT_STATE.md`:

`IMPLEMENTAZIONE COMPLETATA`

---

# Regola fondamentale

Un nuovo agente deve poter continuare il progetto utilizzando esclusivamente:

- repository;
- Technical Specification;
- `DECISIONS.md`;
- `CURRENT_STATE.md`;
- `NEXT_STEPS.md`;
- `WORKLOG.md`.

Se questo non è possibile, il handoff è incompleto.