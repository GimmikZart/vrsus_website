# VRSUS — AGENT_START_HERE V_1.2

> Entry point operativo per qualsiasi agente AI che sviluppa il progetto.
>
> Leggere questo file **prima di modificare codice**.

## 1. Missione

Implementare la piattaforma VRSUS seguendo integralmente:

```text
VRSUS_TECHNICAL_SPEC_AND_ROADMAP_v1.2.md
```

Il documento tecnico è la source of truth di prodotto, architettura, data model, UX, sicurezza e roadmap.

Non progettare un prodotto diverso.

---

## 2. Ordine di autorità

```text
1. ultima istruzione esplicita del proprietario
2. VRSUS_TECHNICAL_SPEC_AND_ROADMAP_v1.2.md
3. .ai/DECISIONS.md
4. .ai/STATUS.md + .ai/NEXT_STEPS.md
5. codice esistente
6. giudizio autonomo agente
```

Non modificare silenziosamente requisiti per adattarli al codice già scritto.

---

## 3. Stack da non cambiare senza approvazione

```text
Nuxt 4
Vue 3
TypeScript strict
Tailwind CSS 4
Nuxt UI 4
Supabase/PostgreSQL
Supabase Auth
Supabase RLS
Supabase Storage
Supabase Realtime
Supabase RPC/Edge Functions
@vite-pwa/nuxt
Cloudflare Pages
OneSignal Free
qrcode
@zxing/browser
Vitest
Playwright
pnpm
```

Motion:

```text
CSS/Vue/Nuxt transitions prima scelta
GSAP soltanto per animazioni complesse selezionate
```

---

## 4. Vincoli non negoziabili

NON:

- implementare pagamenti online;
- introdurre SaaS a pagamento senza approvazione;
- usare `service_role` nel browser;
- indebolire RLS;
- assumere che una station sia una console;
- rendere pubblica la capienza di default;
- mettere PII nel QR;
- salvare `full` come event status;
- usare `checked_in` come booking status;
- implementare waiting-list timer in V1;
- modificare ranking senza ledger/audit;
- mettere business logic critica nei componenti Vue;
- chiamare OneSignal direttamente dai componenti;
- creare schema DB soltanto dalla dashboard Supabase;
- eliminare test per far passare una build;
- saltare fasi roadmap senza motivo documentato;
- inventare storia, numeri, testimonianze, partner o claim commerciali;
- usare immagini competitor/web come se fossero asset VRSUS;
- ignorare la Content Policy 17H quando mancano contenuti reali.

---

## 5. Concetti fondamentali

### Event status

```text
draft
scheduled
running
completed
cancelled
```

`full` è derivato.

Booking open/closed è derivato.

### Booking status

```text
confirmed
waitlisted
cancelled
no_show
```

Check-in:

```text
checked_in_at != null
```

### Waiting list V1

```text
FIFO
promozione automatica
nessuna finestra di accettazione
```

### Capacity

```text
event.max_capacity
!=
station.default_capacity
!=
event_station.capacity_override
!=
event_activity.capacity
!=
tournament.max_entries
```

Leggere la semantica nel documento principale prima di implementare.

### Station / Activity

```text
event
├── event_stations
├── event_activities
└── event_station_activities
```

Una attività può essere disponibile su più postazioni.

---

## 6. Session start protocol

All'inizio di OGNI sessione:

1. leggere questo file;
2. leggere la sezione della roadmap corrente nel documento tecnico;
3. leggere `.ai/STATUS.md`;
4. leggere `.ai/NEXT_STEPS.md`;
5. leggere `.ai/HANDOFF.md` se contiene lavoro recente;
6. leggere `.ai/DECISIONS.md`;
7. eseguire `git status`;
8. ispezionare diff non committati;
9. eseguire i test pertinenti allo stato corrente;
10. continuare il primo next step non completato.

Se `.ai/` non esiste, crearla durante Phase 0.

---

## 7. Task granularity

Non implementare una fase intera in un unico passo.

Preferire:

```text
1 task
-> implementazione
-> test
-> verifica
-> documentazione
-> commit
```

Esempio:

```text
create_event_booking RPC
+ migration
+ RLS
+ integration tests
```

Non:

```text
implementa tutto V1
```

---

## 8. Database protocol

Ogni modifica schema:

```text
migration
-> local reset/test
-> regenerate types
-> integration/RLS test
-> commit
```

Non modificare lo schema soltanto dal dashboard remoto.

Per logica capienza/bracket:

- usare transazioni/database;
- prevenire race condition;
- testare concorrenza/idempotenza.

---

## 9. Frontend protocol

Prima di creare molte pagine:

1. design tokens;
2. tema Nuxt UI VRSUS;
3. primitives;
4. vertical slice visuale:
   - header;
   - homepage hero;
   - EventCard;
   - una pagina app mobile;
   - una pagina admin;
5. verificare mobile/desktop;
6. propagare.

Design:

```text
dark-first
modern gaming
premium
minimal
immersive
fluid
Rosso + Blu come accenti VRSUS controllati
```

Evitare:

```text
template SaaS generico
neon ovunque
RGB rainbow
glitch continui
animazioni invasive
```

---

## 10. Motion protocol

Usare:

```text
microinteraction -> CSS/Vue
page/section -> Vue/Nuxt transition
hero/editorial complesso -> GSAP se necessario
```

Sempre:

- cleanup;
- client-safe;
- transform/opacity;
- reduced-motion;
- niente animazioni che bloccano l'azione utente.

---

## 10A. Content protocol

Quando copy o asset definitivi non sono disponibili:

1. NON bloccare lo sviluppo;
2. applicare la Content Policy 17H;
3. usare copy provvisorio basato soltanto su fatti approvati;
4. usare visual astratti/placeholder controllati;
5. NON inventare social proof, storia, numeri o claim;
6. NON prendere immagini dai competitor;
7. documentare tutto ciò che resta da sostituire in `.ai/STATUS.md`;
8. creare `.ai/CONTENT_TODO.md` se i TODO diventano numerosi.

I colori di brand approvati sono:

```text
ROSSO
BLU
```

Usarli con parsimonia su una base dark/neutra.

---

## 11. Security protocol

Prima di considerare una feature completa verificare:

- auth;
- authorization;
- RLS;
- ownership;
- input validation;
- audit dove richiesto;
- no secret leak;
- no PII leak.

Un controllo route/client non sostituisce RLS.

---

## 12. Definition of Done per task

Un task è `DONE` soltanto se:

```text
implementation        PASS
lint                  PASS
typecheck             PASS
relevant tests        PASS
build if impacted     PASS
RLS/security review   PASS when relevant
mobile check          PASS when UI
.ai status update     DONE
```

Se qualcosa non passa, lo stato deve rimanere `IN PROGRESS` o `BLOCKED`.

---

## 13. Session end protocol

Prima di interrompere:

1. `git status`;
2. lint;
3. typecheck;
4. test pertinenti;
5. build se necessario;
6. aggiornare `.ai/STATUS.md`;
7. aggiornare `.ai/NEXT_STEPS.md`;
8. aggiornare `.ai/HANDOFF.md`;
9. aggiornare `.ai/TEST_REPORT.md`;
10. aggiornare `.ai/DECISIONS.md` se sono state prese decisioni;
11. non lasciare secret o credenziali;
12. lasciare un next step eseguibile e specifico.

---

## 14. Quando fermarsi e chiedere decisione umana

Fermarsi prima di:

- cambiare framework/backend;
- introdurre costi ricorrenti;
- implementare pagamento online;
- cambiare data model fondamentale;
- rendere pubblici dati definiti privati;
- cambiare ruoli/permission model;
- introdurre analytics/tracking;
- eliminare una feature prevista;
- fare una scelta UX che cambia un workflow fondamentale.

Per normali dettagli tecnici interni, procedere autonomamente e annotare la decisione.

---

## 15. Primo task di un repository vuoto

Se il progetto non è ancora iniziato:

```text
PHASE 0 — BOOTSTRAP
```

Seguire esattamente la sezione Phase 0 del documento principale.

Non iniziare dal database remoto o dalle feature.
