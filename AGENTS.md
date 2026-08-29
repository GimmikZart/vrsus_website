# AI Project Scaffold — Agent Instructions

Agisci come agente software autonomo incaricato di portare avanti e completare
il progetto descritto nella specifica tecnica.

---

# DOCUMENTI DI PROGETTO

Prima di lavorare sul codice leggi, in questo ordine:

1. `docs/technical/TECHNICAL_SPECIFICATION.md`
2. `docs/ai/HANDOFF_PROTOCOL.md`
3. `docs/ai/DECISIONS.md`
4. `docs/ai/CURRENT_STATE.md`
5. `docs/ai/NEXT_STEPS.md`

Consulta `docs/ai/WORKLOG.md` solo quando serve ricostruire informazioni storiche.

Consulta inoltre quando pertinenti:

- `docs/ai/TEST_REPORT.md`
- `docs/dev/guideline_test_features.md`
- `docs/dev/guideline_implementations.md`

Il repository corrente rappresenta l'effettivo stato dell'implementazione.

---

# SOURCE OF TRUTH E PRIORITÀ

In caso di informazioni contrastanti usa questo ordine di priorità:

1. istruzioni esplicite dell'utente nella sessione corrente;
2. `docs/technical/TECHNICAL_SPECIFICATION.md`;
3. `docs/ai/DECISIONS.md`;
4. stato effettivo del repository;
5. `docs/ai/CURRENT_STATE.md`;
6. `docs/ai/NEXT_STEPS.md`;
7. `docs/ai/WORKLOG.md`;
8. `README.md`.

`HANDOFF_PROTOCOL.md` definisce il processo operativo di handoff e deve essere
rispettato, ma non sostituisce i requisiti della Technical Specification.

Non modificare silenziosamente requisiti o decisioni già approvate.

Se una decisione precedente deve essere cambiata per un motivo tecnico,
documenta esplicitamente il motivo prima di sostituirla.

---

# AVVIO DI OGNI SESSIONE

Prima di modificare il codice:

1. leggi i documenti di progetto richiesti;
2. controlla lo stato Git del repository;
3. ispeziona i file rilevanti per la prossima attività;
4. verifica che `CURRENT_STATE.md` e `NEXT_STEPS.md` siano coerenti con lo
   stato reale del repository;
5. individua la prima attività ancora incompleta da eseguire.

La documentazione operativa è un aiuto alla continuità, ma deve sempre essere
verificata contro il repository reale.

Non ricominciare da zero.

---

# OBIETTIVO

Porta avanti il lavoro direttamente nel repository fino al completamento
della Technical Specification.

Mantieni:

- comportamento approvato;
- decisioni architetturali;
- convenzioni esistenti;
- workflow multi-agent definito dal progetto.

Procedi per unità di lavoro coerenti e verificabili.

Quando una milestone è completata, passa autonomamente alla successiva salvo
presenza di blocker o necessità di una decisione esplicita dell'utente.

---

# REGOLE DI SVILUPPO

1. Non rifattorizzare parti già funzionanti senza una motivazione tecnica.

2. Prima di ogni modifica significativa individua:
   - il file o simbolo che controlla il comportamento;
   - l'ipotesi tecnica;
   - il controllo o test più economico per verificarla.

3. Mantieni le modifiche:
   - piccole;
   - coerenti con l'architettura esistente;
   - limitate allo scope della specifica o del task corrente.

4. Non annullare modifiche preesistenti senza una motivazione documentata.

5. Non introdurre framework, pattern architetturali o dipendenze importanti
   senza una reale necessità.

6. Non hardcodare:
   - credenziali;
   - token;
   - secret;
   - valori specifici dell'ambiente;
   - identificatori infrastrutturali che devono essere configurabili.

7. Dopo ogni modifica significativa esegui le verifiche pertinenti:
   - build;
   - unit test;
   - integration test;
   - lint/typecheck se presenti;
   - verifiche manuali quando necessarie.

8. Se un controllo fallisce, correggi prima il problema nella stessa area
   prima di ampliare il perimetro del lavoro.

9. Non dichiarare completata una funzionalità solo perché il codice è stato
   scritto. Il comportamento deve essere verificato.

---

# DOCUMENTAZIONE TEST E CONFIGURAZIONE

Mantieni questi documenti quando pertinenti al lavoro svolto:

- `docs/ai/TEST_REPORT.md`: registra sinteticamente test/verifiche eseguiti,
  esito, failure e verifiche ancora pendenti. Non segnare come eseguito un test
  che non è stato realmente effettuato.

- `docs/dev/guideline_test_features.md`: quando una feature diventa testabile
  manualmente, descrivi come verificarla passo passo. Indica prerequisiti,
  account/ruolo necessario, percorso UI, azioni da eseguire, risultato atteso
  e una checklist Markdown con spazio per commenti dell'utente. Non cancellare
  successivamente note o checklist compilate manualmente dall'utente.

- `docs/dev/guideline_implementations.md`: documenta passo passo le operazioni
  che l'utente deve eseguire personalmente e che l'agente non può o non deve
  compiere, ad esempio creazione/configurazione di Supabase, OneSignal,
  Cloudflare, OAuth, `.env`, secret, DNS o altri servizi esterni. Indica dove
  trovare i valori, dove inserirli, se sono `PUBLIC`, `SERVER-ONLY` o `SECRET`,
  come verificare la configurazione e fornisci una checklist.

Non inserire mai credenziali o secret reali nei documenti: usa placeholder.

Aggiorna questi file solo quando esiste nuova informazione utile; non generare
documentazione ridondante dopo ogni task.

Se un'azione manuale è necessaria per proseguire, documentala in
`guideline_implementations.md`, riportala in `CURRENT_STATE.md` e aggiungila a
`NEXT_STEPS.md` come `USER ACTION REQUIRED`. Continua su attività indipendenti
se possibile.

---

# DECISIONI TECNICHE

Le decisioni tecniche persistenti devono essere registrate in:

`docs/ai/DECISIONS.md`

Aggiungi una decisione solamente quando viene effettuata una scelta che
influenza significativamente il lavoro futuro, ad esempio:

- scelta architetturale;
- convenzione;
- comportamento non ovvio;
- strategia di integrazione;
- scelta tra alternative tecniche rilevanti.

Non utilizzare `DECISIONS.md` come worklog.

Non modificare o eliminare silenziosamente decisioni già accettate.

Se una decisione viene sostituita:

1. mantieni la decisione precedente;
2. marcala come `Superseded`;
3. indica la nuova decisione che la sostituisce.

---

# HANDOFF E CONTINUITÀ

Segui obbligatoriamente:

`docs/ai/HANDOFF_PROTOCOL.md`

Non presumere di poter conoscere con precisione il limite di contesto,
token o quota disponibile.

Utilizza checkpoint conservativi.

Durante il progetto mantieni aggiornati, secondo le regole del protocollo:

- `docs/ai/CURRENT_STATE.md`
- `docs/ai/NEXT_STEPS.md`
- `docs/ai/DECISIONS.md`
- `docs/ai/WORKLOG.md`
- `docs/ai/TEST_REPORT.md` quando pertinente
- `docs/dev/guideline_test_features.md` quando pertinente
- `docs/dev/guideline_implementations.md` quando pertinente

Non lasciare informazioni necessarie alla prosecuzione solamente nella
conversazione.

---

# INTERRUZIONE SICURA DELLA SESSIONE

Se il contesto disponibile sembra ridursi, la sessione diventa molto lunga,
compare un limite operativo oppure non puoi garantire una conclusione ordinata:

1. non iniziare nuove attività importanti;
2. completa, stabilizza o ripristina modifiche parziali;
3. esegui almeno la verifica più pertinente disponibile;
4. controlla `git status`;
5. esegui il protocollo di handoff;
6. registra chiaramente blocker e attività incomplete.

Prima di terminare, il repository deve trovarsi in uno stato comprensibile
da un nuovo agente.

---

# COMUNICAZIONE DURANTE LA SESSIONE

Durante il lavoro comunica brevemente:

- cosa stai analizzando;
- quale ipotesi stai verificando;
- quale modifica rilevante stai applicando;
- quale verifica hai eseguito;
- quale sarà il prossimo passo.
- a che percentuale stimi essere rispetto al completamento del progetto.

Evita aggiornamenti su operazioni banali.

---

# COMPLETAMENTO DEL PROGETTO

Quando tutti i requisiti della Technical Specification risultano implementati:

1. esegui la build completa;
2. esegui tutti i test disponibili;
3. verifica gli Acceptance Criteria e la Definition of Done della specifica;
4. verifica che la documentazione di test/configurazione pertinente sia aggiornata;
5. esegui il protocollo di handoff finale;
6. documenta eventuali limitazioni residue.

Inserisci in `CURRENT_STATE.md`:

`IMPLEMENTAZIONE COMPLETATA`

solo se l'implementazione è stata effettivamente verificata.

`NEXT_STEPS.md` deve indicare che non rimangono attività implementative
necessarie oppure riportare esclusivamente eventuali attività future
deliberatamente fuori scope.
