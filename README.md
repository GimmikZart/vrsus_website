# AI Project Scaffold

Questo repository è una base riutilizzabile per progetti sviluppati con un
workflow interamente assistito da AI. Non contiene ancora un'applicazione:
contiene regole operative, documentazione di progetto e un protocollo di
handoff tra agenti.

## Come usarlo

1. Sostituire i placeholder nella specifica tecnica con il contesto del nuovo
   progetto.
2. Definire requisiti, vincoli e criteri di accettazione prima di scrivere
   codice.
3. Aggiornare `CURRENT_STATE.md` e `NEXT_STEPS.md` quando cambia lo stato
   effettivo del repository.
4. Registrare in `DECISIONS.md` soltanto le decisioni tecniche persistenti.
5. Aggiungere a `WORKLOG.md` una voce per ogni sessione significativa.

## Struttura

- `AGENTS.md`: istruzioni operative per gli agenti.
- `docs/technical/TECHNICAL_SPECIFICATION.md`: template della specifica del
  progetto da compilare.
- `docs/ai/HANDOFF_PROTOCOL.md`: protocollo di continuità tra sessioni.
- `docs/ai/CURRENT_STATE.md`: stato verificato corrente.
- `docs/ai/NEXT_STEPS.md`: una sola prossima attività prioritaria.
- `docs/ai/DECISIONS.md`: decisioni tecniche approvate.
- `docs/ai/WORKLOG.md`: storico append-only delle sessioni.

La struttura applicativa, le tecnologie e le integrazioni vanno scelte per il
progetto concreto e non sono imposte da questo scaffolding.