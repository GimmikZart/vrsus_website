# Next Steps

## Prossima attivita

Completare la Phase 3 con l’upload asset e la preparazione dei contenuti reali.

### Area interessata

- upload asset con storage configurabile;
- test autenticato manuale di `/admin/news` e `/admin/servizi`;
- test autenticato manuale di `/admin/richieste` e invio form servizio;
- sostituzione dei fixture editoriali con contenuti e asset approvati;
- `docs/dev/guideline_test_features.md` per le procedure manuali.

### Comportamento atteso

- esperienze, news e servizi provengono da contenuti pubblicati e non da copy
  inventato nel frontend;
- draft, archived e contenuti non pubblicati non compaiono nelle route pubbliche;
- le operazioni CMS restano protette da ruolo e RLS;
- immagini, Open Graph e metadata restano coerenti con il contenuto effettivo.
- le richieste servizi non espongono dati interni e restano autorizzate lato
  server secondo il ruolo previsto.
- l'endpoint pubblico valida input e servizio attivo prima di creare un lead;
- admin e super-admin possono aggiornare stato e note interne delle richieste.

### Gia verificato in Phase 3

- home alimentata dalla view `public_events`;
- lista `/eventi` e dettaglio `/eventi/[slug]` alimentati da Supabase;
- postazioni e attivita lette dalle view `public_event_*`;
- loading/error/empty state senza dati fittizi lato frontend;
- robots, sitemap, canonical e JSON-LD evento;
- noindex/disallow in ambienti non production.
- view pubbliche `public_activities`, `public_news_posts` e
  `public_service_pages`, con filtering dei soli contenuti `published`;
- route pubbliche esperienze/news/servizi/regolamento con fixture DEV e
  dettagli editoriali;
- sitemap dinamica con slug di eventi, news e servizi pubblicati.
- console CMS news/servizi con scritture protette da RLS e ruoli admin.
- form servizio, endpoint server validato e console `/admin/richieste`.
- console `/admin/eventi` con date, stato, prenotazioni, prezzo e visibilità
  capienza privata.
- console `/admin/catalogo` con CRUD globale di attività/postazioni e categorie.
- configurazione `/admin/eventi/[id]` con associazioni many-to-many tra attività
  e postazioni.
- override per evento di nome, descrizione, capienza, visibilità, disponibilità,
  orari e modalità d’accesso.

### Verifica

Dopo il prossimo blocco eseguire `pnpm db:test`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm test:e2e` e `pnpm build`.
