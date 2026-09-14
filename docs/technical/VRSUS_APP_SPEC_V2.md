# VRSUS — Specifica applicativa V2

> Documento operativo per la riorganizzazione di vetrina, app utente e console
> admin. Redatto il 2026-09-10 su richiesta esplicita del proprietario.

## 1. Stato e autorita di questo documento

Questo documento descrive il prodotto da costruire da ora in avanti. Nasce da
una richiesta esplicita del proprietario nella sessione del 2026-09-10, che
nell'ordine di autorita del progetto precede la Technical Specification.

Rapporto con i documenti esistenti:

- `docs/technical/TECHNICAL_SPECIFICATION.md` resta valido per tutto cio che
  qui non e ridefinito: sicurezza, RLS, semantica di booking e check-in, QR
  senza PII, capienza privata, vincoli non negoziabili.
- Dove i due documenti divergono sul modello di dominio, sulle rotte o sulla
  UX, **prevale questo documento**, e la divergenza e registrata in
  `docs/ai/DECISIONS.md`.
- I vincoli non negoziabili di `docs/technical/AGENT_START_HERE.md` restano in
  vigore, con la sola eccezione esplicitata al punto 3.1.

## 2. Chiarimenti raccolti dal proprietario

Quattro ambiguita sono state chiuse prima della redazione. Sono decisioni di
prodotto, non interpretazioni dell'agente.

| Tema | Decisione |
| --- | --- |
| Postazione / Piattaforma | Sono **la stessa entita**. "Piattaforma" e il nome interno, "Postazione" quello usato in vetrina. |
| Ranking | **Punti + record per gioco**: classifica a punti VRSUS e, filtrando per gioco, il record di punteggio assoluto. |
| Sfide arcade | I punteggi li registra **solo staff o admin**. |
| Console admin esistenti | **Assorbite dove ha senso**: News confluisce nella Bacheca, Catalogo e sostituito da Piattaforme/Giochi, il resto va in un menu secondario. |
| Minorenni | **Accettati**, con raccolta del consenso di un genitore o tutore. |
| Punti dei tornei | **Configurabili per torneo**: la gestione del punteggio deve essere elastica, non cablata nel codice. |
| Politica nickname | Confermata come proposta: unico, moderabile, con storico dei cambi. |

## 3. Modello concettuale

### 3.1 Piattaforma

Una **piattaforma** e un sistema di gioco messo a disposizione da VRSUS: PS5,
Nintendo Switch, un visore VR, un cabinato arcade, un tavolo da gioco da tavolo.

Campi: nome, codice breve, descrizione, immagine (opzionale), flag `internal`,
stato attivo, capienza standard.

Il **codice** e la label corta mostrata sulle card dei giochi (es. `PS5`, `SW`,
`VR`). Unico e leggibile a colpo d'occhio su mobile.

Il flag **`internal`** governa la visibilita pubblica: una piattaforma
`internal = true` non compare mai in vetrina ne nei filtri pubblici, ma resta
utilizzabile internamente per eventi, tornei e punteggi.

> **Nota sul vincolo storico.** `AGENT_START_HERE.md` vietava di "assumere che
> una station sia una console". Il proprietario ha deliberatamente unificato i
> due concetti in sessione. Il vincolo e quindi **superato per decisione
> esplicita del proprietario**, non per adattamento al codice esistente. La
> distinzione fra le diverse capienze resta invece intatta: si veda 4.3.

### 3.2 Gioco

Un **gioco** appartiene sempre a una e una sola piattaforma.

Campi: nome, genere, numero giocatori (minimo e massimo), descrizione,
immagine (opzionale), direzione del punteggio.

La **direzione del punteggio** (`score_direction`) dice se nel record vince il
valore piu alto (default, es. punti) o il piu basso (es. tempo su un time
attack). Serve al Ranking per ordinare correttamente e non e esposta in vetrina.

### 3.3 Evento

Un evento acquisisce un **tipo**: compleanno, all you can play, team building,
giornata privata.

Un evento mette a disposizione un insieme di **piattaforme** e, per ciascuna,
un sottoinsieme dei suoi **giochi**. Questo sostituisce l'attuale tripletta
postazioni / attivita / associazioni.

### 3.4 Torneo

Un torneo ha sempre una piattaforma e un gioco. Puo appartenere a un evento
oppure esistere **a se stante**.

> **Aggiornamento del 2026-09-13 (DEC-037).** Il torneo non ha piu un solo
> "formato": si descrive con tre domande indipendenti, decise alla creazione.
>
> | Asse | Valori |
> | --- | --- |
> | Chi gioca | singolo, coppia, squadra da N; squadre aperte, a invito con codice, o composte dallo staff |
> | Come ci si affronta | eliminazione diretta, tutti contro tutti (anche andata e ritorno), manche a gruppi di N, uno alla volta |
> | Come si vince | vittoria secca, punteggio, tempo, ordine di arrivo |
>
> Una partita ha N posti, non due lati: e questo che permette una manche da
> quattro o un tentativo a cronometro. La classifica si ordina secondo il
> criterio scelto (tabellone, vittorie, somma punti, miglior tempo, tempo
> totale) e l'interfaccia mostra le colonne corrispondenti.

### 3.5 Ranking

Due letture degli stessi dati:

1. **Punti VRSUS** — ledger auditabile gia esistente, alimentato dai
   piazzamenti nei tornei e dalle rettifiche admin. E la classifica generale.
2. **Record per gioco** — filtrando su un gioco specifico, la classifica mostra
   il miglior punteggio assoluto registrato su quel gioco.

I punteggi delle sfide arcade sono inseriti esclusivamente da staff o admin.

### 3.6 Utenti minorenni

VRSUS accetta iscritti minorenni. Un account il cui `birth_date` indica meno di
18 anni richiede il **consenso di un genitore o tutore**, raccolto in fase di
registrazione e conservato come record a se stante.

Due soglie da tenere distinte, perche rispondono a esigenze diverse:

- **sotto i 14 anni**: in Italia il consenso al trattamento dei dati per i
  servizi online e prestato da chi esercita la responsabilita genitoriale
  (GDPR art. 8, come recepito dal D.lgs. 101/2018, che fissa la soglia a 14
  anni e non a 16);
- **fra 14 e 17 anni**: il minore puo prestare da se il consenso al
  trattamento, ma VRSUS richiede comunque l'autorizzazione di un adulto per la
  partecipazione fisica agli eventi. Questa e una regola di VRSUS, non un
  obbligo di legge.

> **Non e un parere legale.** Le soglie e i testi informativi vanno confermati
> con chi cura la privacy policy di VRSUS prima di aprire le registrazioni in
> QUALITY. Qui si descrive come il sistema le rende applicabili, non quali
> debbano essere.

Regole applicative:

- la minore eta e **sempre derivata** da `birth_date`, mai memorizzata come
  flag: un booleano diventerebbe falso al diciottesimo compleanno;
- il profilo di un minore non puo essere pubblico: `is_public_profile` resta
  forzato a `false` finche l'utente e minorenne;
- il nickname resta visibile in classifiche e liste partecipanti, perche e uno
  pseudonimo e non un dato identificativo diretto;
- al compimento dei 18 anni il consenso smette di essere richiesto ma il
  record **non viene cancellato**: resta come traccia storica.

### 3.7 Punteggio dei tornei

> **Nota di chiarezza (2026-09-13).** Questa sezione parla dei **punti VRSUS
> della classifica generale**, non del punteggio con cui si vince una partita.
> Quello dipende dalla configurazione del torneo (DEC-037). Nelle maschere il
> campo si chiama ora "Punti VRSUS".

L'assegnazione dei punti VRSUS non e uguale per tutti i tornei: dipende dal
formato, dal numero di partecipanti e dall'importanza dell'evento. Il sistema
deve quindi permettere di **configurare il punteggio per singolo torneo**.

Il meccanismo si basa su **schemi di punteggio** riutilizzabili: si definisce
uno schema una volta (per esempio "Standard eliminazione diretta" o "Girone a
punti"), lo si collega ai tornei che lo usano e, se serve, lo si sostituisce
per un torneo specifico.

Uno schema e un insieme di regole di questi tipi:

| Tipo di regola | Quando si applica |
| --- | --- |
| `placement` | Piazzamento finale, singolo (1°) o per intervallo (5°-8°) |
| `participation` | A chi partecipa e fa check-in, indipendentemente dal risultato |
| `match_win`, `match_draw`, `match_loss` | Per singolo incontro, tipico dei gironi |
| `bonus` | Rettifica manuale prevista dallo schema (es. fair play) |

Un torneo a eliminazione diretta usera soprattutto `placement` e
`participation`; un girone usera `match_win` e `match_draw` piu un eventuale
`placement` finale. Lo stesso motore serve entrambi.

Il campo `tournaments.ranking_enabled` gia esistente resta la scorciatoia per
disattivare del tutto i punti su un torneo amichevole.

> **Stato attuale.** I punti derivano dallo schema collegato al torneo. Il
> piazzamento finale e la posizione in classifica, qualunque sia la struttura
> del torneo (DEC-037).

### 3.8 Bacheca

Flusso cronologico di comunicazioni redazionali VRSUS. Ogni post e un
**annuncio** oppure un **sondaggio**. Nella stessa pagina l'utente puo lasciare
un messaggio, un consiglio o una recensione, che resta **a uso interno** e non
viene mai pubblicato.

## 4. Modello dati

Il repository non e ancora stato distribuito su QUALITY o PRODUCTION: le
migration possono quindi rinominare e ristrutturare senza percorsi di
compatibilita. Restano comunque migration versionate in `supabase/migrations/`,
mai modifiche dalla dashboard.

### 4.1 Rinomina del dominio postazioni

`stations` diventa `platforms`. La rinomina si propaga agli oggetti dipendenti:

| Oggetto attuale | Nuovo nome |
| --- | --- |
| `stations` | `platforms` |
| `station_categories` | `platform_categories` |
| `event_stations` | `event_platforms` |
| `event_station_activities` | `event_platform_games` |
| `matches.event_station_id` | `matches.event_platform_id` |
| `station_activities` | rimossa, sostituita da `games.platform_id` |

Nuovi campi su `platforms`: `code` (unico, non nullo) e `internal` (default
`false`).

> **Attenzione.** Le `revoke` di DEC-005 sono legate ai nomi delle tabelle. La
> migration di rinomina deve **ri-applicare esplicitamente** `revoke`/`grant` e
> ricreare le view pubbliche, altrimenti le tabelle rinominate ereditano i
> grant di default e la capienza torna leggibile da `authenticated`.

### 4.2 Nuove tabelle

```sql
create table public.games (
  id uuid primary key default gen_random_uuid(),
  platform_id uuid not null references public.platforms(id) on delete restrict,
  slug text not null,
  name text not null,
  genre text,
  min_players integer,
  max_players integer,
  description text,
  image_path text,
  score_direction text not null default 'desc'
    check (score_direction in ('asc', 'desc')),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  unique (platform_id, slug),
  check (min_players is null or min_players > 0),
  check (max_players is null or min_players is null or max_players >= min_players)
);

create table public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  event_id uuid references public.events(id) on delete set null,
  tournament_id uuid references public.tournaments(id) on delete set null,
  score numeric not null,
  notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default timezone('utc', now())
);

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  body text,
  post_type text not null check (post_type in ('announcement', 'poll')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  image_path text,
  pinned boolean not null default false,
  published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.board_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0
);

create table public.board_poll_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  option_id uuid not null references public.board_poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, user_id)
);

create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('message', 'suggestion', 'review')),
  rating smallint check (rating is null or rating between 1 and 5),
  body text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'archived')),
  internal_notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Consenso di genitore o tutore per gli iscritti minorenni
create table public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  guardian_first_name text not null,
  guardian_last_name text not null,
  guardian_email text not null,
  guardian_phone text,
  relationship text not null default 'parent'
    check (relationship in ('parent', 'legal_guardian', 'other')),
  consent_given_at timestamptz not null default timezone('utc', now()),
  consent_source text not null default 'registration'
    check (consent_source in ('registration', 'staff_onsite')),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz
);

-- Schemi di punteggio riutilizzabili fra tornei
create table public.point_schemes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.point_scheme_rules (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.point_schemes(id) on delete cascade,
  rule_type text not null check (rule_type in (
    'placement', 'participation', 'match_win', 'match_draw', 'match_loss', 'bonus')),
  placement_from integer,
  placement_to integer,
  points integer not null,
  sort_order integer not null default 0,
  check (points <> 0 or rule_type = 'match_loss'),
  check (
    (rule_type = 'placement' and placement_from is not null
      and (placement_to is null or placement_to >= placement_from))
    or (rule_type <> 'placement' and placement_from is null and placement_to is null)
  )
);
```

`placement_from` / `placement_to` esprimono sia la posizione singola
(`from = to = 1`) sia l'intervallo (`from = 5, to = 8`). Il vincolo impedisce
di salvare una regola di piazzamento senza posizione e una regola di altro tipo
con una posizione, che sarebbe silenziosamente ignorata.

`match_loss` e l'unico tipo che ammette zero punti: serve a dichiarare
esplicitamente che una sconfitta non vale nulla, distinguendolo dal caso in cui
la regola non e stata configurata.

Il vincolo `unique (post_id, user_id)` su `board_poll_votes` garantisce un voto
per utente per sondaggio a livello di database, non solo di interfaccia.

### 4.3 Modifiche a tabelle esistenti

**`events`** — nuovo campo `event_type`:

```sql
alter table public.events add column event_type text not null
  default 'all_you_can_play'
  check (event_type in ('birthday', 'all_you_can_play', 'team_building', 'private_day'));
```

Gli eventi `birthday` e `private_day` nascono con `is_public = false`. Il
default va imposto nella UI di creazione e non con un trigger, per non
impedire un evento privato reso volutamente pubblico.

**`event_platforms`** mantiene gli override per singolo evento. La semantica
delle capienze **non cambia**: `events.max_capacity` !=
`platforms.default_capacity` != `event_platforms.capacity_override` !=
`tournaments.max_entries`.

**`tournaments`**:

```sql
alter table public.tournaments alter column event_id drop not null;
alter table public.tournaments add column platform_id uuid references public.platforms(id);
alter table public.tournaments add column game_id uuid references public.games(id);
alter table public.tournaments add column point_scheme_id uuid references public.point_schemes(id);
alter table public.tournaments drop constraint tournaments_format_check;
alter table public.tournaments add constraint tournaments_format_check
  check (format in ('single_elimination', 'round_robin', 'double_round_robin'));

create unique index tournaments_standalone_slug_idx
  on public.tournaments (slug) where event_id is null;
```

L'indice parziale serve perche lo slug e oggi unico per `(event_id, slug)` e
con `event_id` nullabile i tornei standalone resterebbero scoperti.

**`ranking_points_ledger`** — `activity_id` diventa `game_id`, con FK verso
`games`.

**`profiles`** — nuovi campi per la registrazione:

```sql
alter table public.profiles add column nickname text;
alter table public.profiles add column birth_date date;
create unique index profiles_nickname_key on public.profiles (lower(nickname));

create table public.profile_nickname_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  previous_nickname text not null,
  changed_at timestamptz not null default timezone('utc', now())
);
```

> **Decisione: si memorizza la data di nascita, non l'eta.** Il proprietario ha
> chiesto "eta" fra i campi di registrazione. Un intero invecchia e diventa
> falso dopo il primo compleanno: si chiede la data di nascita e l'eta si
> deriva a ogni lettura.

La minore eta si ricava con una funzione, non con una colonna:

```sql
create function public.is_minor(p_birth_date date) returns boolean
language sql immutable as $$
  select p_birth_date is not null
     and p_birth_date > (current_date - interval '18 years');
$$;
```

Lo storico dei nickname serve alla moderazione: senza di esso un utente puo
cambiare nickname e rendere irrintracciabile un comportamento segnalato.

**`news_posts`** — i contenuti migrano in `board_posts` come annunci
pubblicati; la tabella viene poi ritirata (fase J).

### 4.4 View pubbliche e RLS

Le letture anonime continuano a passare da view `public_*` (DEC-005). Nuove
view previste:

- `public_platforms` — solo `active = true and internal = false`; espone nome,
  codice, slug, descrizione, immagine. **Non espone `default_capacity`.**
- `public_games` — giochi attivi di piattaforme pubbliche.
- `public_board_posts` — post `published`, con conteggi aggregati dei voti dei
  sondaggi ma **senza l'identita dei votanti**.
- `public_game_leaderboards` — record per gioco, con nickname e punteggio,
  ordinati secondo `score_direction`.

| Tabella | anon | authenticated | staff | admin |
| --- | --- | --- | --- | --- |
| `platforms`, `games` | solo via view | solo via view | lettura | lettura/scrittura |
| `game_scores` | via leaderboard | via leaderboard | inserimento | tutto |
| `board_posts` | via view | via view | lettura | tutto |
| `board_poll_votes` | nessuno | solo il proprio voto | nessuno | aggregati |
| `user_feedback` | nessuno | inserimento proprio | nessuno | lettura/gestione |
| `guardian_consents` | nessuno | solo il proprio | esistenza del consenso | lettura/gestione |
| `point_schemes`, `point_scheme_rules` | nessuno | lettura dello schema del torneo | lettura | tutto |

`user_feedback` non deve **mai** comparire in una view pubblica: e materiale
interno e puo contenere lamentele nominative.

`guardian_consents` contiene dati di un adulto che **non e utente della
piattaforma**: nome, email e telefono di un genitore. Non deve comparire in
nessuna view pubblica ne raggiungere il browser di un utente diverso
dall'interessato. Allo staff serve sapere se il consenso esiste, non leggerne
il contenuto: la vista operativa espone un booleano, non i recapiti.

Il dominio evento resta senza grant diretti per `authenticated` (DEC-005) e
continua a passare dagli endpoint service-role introdotti con DEC-018. Le
tabelle rinominate ereditano lo stesso trattamento.

## 5. Architettura front-end

### 5.1 Impostazione mobile-first

Si costruisce partendo da **360-430 px** e si sale. Nessuna regola di base
contiene larghezze fisse: i breakpoint aggiungono, non correggono.

| Breakpoint | Larghezza | Uso |
| --- | --- | --- |
| base | < 640 px | telefono, colonna singola |
| `sm` | >= 640 px | telefono orizzontale, griglia a 2 colonne |
| `md` | >= 768 px | tablet, griglia a 2-3 colonne |
| `lg` | >= 1024 px | desktop: la tab bar diventa barra laterale |

Regole trasversali:

- area di tocco minima 44x44 px;
- la tab bar inferiore rispetta `env(safe-area-inset-bottom)`, indispensabile
  in modalita PWA standalone su iOS;
- il contenuto scrollabile riserva un padding pari all'altezza della tab bar;
- classifiche e bracket scorrono dentro un contenitore proprio, mai il body.

### 5.2 Le tre shell

**`layouts/site.vue` — vetrina.** Barra superiore con logo a sinistra e
hamburger a destra. L'hamburger apre un pannello a scomparsa con le quattro
voci del sito piu "Accedi" e "Registrati". Su `lg` le voci si distendono in
orizzontale e l'hamburger scompare.

**`layouts/app.vue` — utente autenticato.** Header contestuale sottile e **tab
bar inferiore a 5 icone**: Dashboard, Ranking, Tornei, Bacheca, Impostazioni.
Su `lg` la tab bar migra a sinistra come barra verticale.

**`layouts/admin.vue` — console.** Stessa meccanica, con Dashboard, Eventi,
Tornei, Piattaforme, Giochi e una sesta voce "Altro" per le console assorbite.

La shell si sceglie per gruppo di rotte, non per ruolo: un admin che visita
`/app` vede la shell utente. Il passaggio alla console e esplicito.

### 5.3 Mappa delle rotte

**Vetrina — layout `site`, accesso anonimo**

| Rotta | Contenuto |
| --- | --- |
| `/` | Locandina prossimo evento + landing |
| `/postazioni` | Elenco card delle piattaforme pubbliche |
| `/postazioni/[slug]` | Dettaglio piattaforma e giochi disponibili |
| `/chi-siamo` | Racconto di VRSUS (placeholder, vedi 8) |
| `/servizi`, `/servizi/[slug]` | Servizi offerti e richiesta |
| `/eventi/[slug]` | Landing pubblica dell'evento (SEO, gia esistente) |
| `/login`, `/registrati` | Accesso e registrazione |

**App utente — layout `app`, middleware `auth`**

| Rotta | Contenuto |
| --- | --- |
| `/app` | Dashboard: prossimo evento o biglietto QR |
| `/app/prenota/[eventId]` | Conferma prenotazione evento |
| `/app/ranking` | Classifica con filtri piattaforma e gioco |
| `/app/tornei` | Prossimi tornei e tornei passati |
| `/app/tornei/[id]` | Dettaglio torneo |
| `/app/tornei/[id]/prenota` | Conferma iscrizione |
| `/app/bacheca` | Annunci, sondaggi, invio feedback |
| `/app/impostazioni` | Nickname e logout |

**Console admin — layout `admin`, middleware `auth` + `role`**

| Rotta | Ruoli |
| --- | --- |
| `/admin` | admin, super_admin |
| `/admin/eventi` | admin, super_admin |
| `/admin/eventi/[id]` (scheda) | staff, admin, super_admin |
| `/admin/eventi/nuovo`, `/admin/eventi/[id]/modifica` | admin, super_admin |
| `/admin/eventi/[id]/tornei/nuovo` | tournament_admin, admin, super_admin |
| `/admin/tornei`, `/nuovo`, `/[id]` | tournament_admin, admin, super_admin |
| `/admin/piattaforme`, `/[id]` | admin, super_admin |
| `/admin/giochi`, `/[id]` | admin, super_admin |
| `/admin/utenti` | super_admin |
| `/admin/utenti/[id]` | staff, admin, super_admin |
| `/admin/altro` | secondo la console di destinazione |

La console non ha un passaggio all'area personale: chi amministra non ha un
profilo di gioco, non prenota e non si iscrive ai tornei (DEC-031).

**Rotte ritirate e reindirizzamenti**

| Vecchia rotta | Destinazione |
| --- | --- |
| `/esperienze`, `/esperienze/[slug]` | `/postazioni` (301) |
| `/news`, `/news/[slug]` | `/app/bacheca` (302) |
| `/tornei`, `/tornei/[slug]` | `/app/tornei` (302) |
| `/ranking` | `/app/ranking` (302) |

> **Compromesso SEO da mettere a verbale.** Portando tornei, ranking e news
> dietro autenticazione la superficie indicizzabile si riduce a home,
> postazioni, chi siamo, servizi ed eventi. E coerente con la richiesta, ma va
> saputo: se servira visibilita organica su tornei e classifiche, andranno
> create pagine pubbliche dedicate. La sitemap va aggiornata di conseguenza.

## 6. Specifica delle schermate

Ogni schermata e descritta prima nella forma mobile, poi nell'adattamento
desktop. Ogni elenco prevede sempre stato di caricamento, stato vuoto e stato
di errore: non sono opzionali.

### 6.1 Vetrina

**Home `/`** — In cima la **locandina del prossimo evento**: immagine di
copertina, tipo evento, data e ora, luogo, CTA "Prenota il tuo posto". La CTA
porta a `/registrati` se anonimo, a `/app/prenota/[eventId]` se autenticato.
Se non ci sono eventi pubblicati, la locandina lascia il posto a un blocco
neutro senza inventare un evento. Sotto: cosa facciamo, come funziona in tre
passi, anteprima delle postazioni, anteprima dei servizi, CTA finale.
Desktop: la locandina diventa a due colonne (immagine / testo), le anteprime
passano a griglia.

**Postazioni `/postazioni`** — Griglia di card a una colonna: immagine, nome,
codice, riga di descrizione, numero di giochi disponibili. Solo piattaforme
pubbliche e attive. Desktop: 2-3 colonne.

**Dettaglio postazione `/postazioni/[slug]`** — Intestazione con immagine e
descrizione, poi la griglia dei giochi disponibili su quella piattaforma.

**Chi siamo `/chi-siamo`** — Contenuto editoriale statico. Vedi 8.

**Servizi `/servizi`** — Card per tipo di servizio. Il dettaglio riusa il form
di richiesta gia esistente.

**Registrati `/registrati`** — Campi: nome, cognome, nickname, data di nascita,
email, password. Validazioni: nickname unico e verificato prima dell'invio,
password con requisiti minimi, email confermata secondo la configurazione
Supabase dell'ambiente. Un errore su un campo non deve svuotare gli altri.

Quando la data di nascita indica **meno di 18 anni**, il form rivela una
seconda sezione con i dati del genitore o tutore: nome, cognome, email,
telefono (facoltativo), relazione e spunta di consenso esplicita. La sezione
compare e scompare al cambiare della data, senza ricaricare la pagina e senza
perdere quanto gia digitato.

Il testo del consenso deve dire **chi** presta il consenso, **per cosa** e che
puo essere revocato. La spunta non e pre-selezionata: un consenso pre-spuntato
non e un consenso.

**Accedi `/login`** — Solo email e password.

### 6.2 App utente

**Dashboard `/app`** — Una sola card protagonista, in due stati:

- *non iscritto*: informazioni generali dell'evento e invito a prenotarsi;
- *iscritto*: la card **diventa il biglietto** con il QR code.

Il QR si sblocca solo dopo la conferma della prenotazione. Sotto la card:
prossimo torneo a cui l'utente e iscritto e ultime dalla bacheca.

**Conferma prenotazione `/app/prenota/[eventId]`** — Riepilogo di cosa si sta
prenotando, eventuale costo sul posto, condizioni, un solo pulsante di
conferma. Alla conferma si torna alla dashboard con il biglietto sbloccato.
Se l'evento e al completo la pagina propone la lista d'attesa invece della
conferma.

**Ranking `/app/ranking`** — In alto due selettori affiancati: **piattaforma a
sinistra, gioco a destra**. Sotto, la classifica verticale. Senza gioco
selezionato mostra i punti VRSUS; con un gioco selezionato passa al record di
punteggio su quel gioco. Ogni riga: posizione, nickname, valore. La posizione
dell'utente corrente e evidenziata e, se fuori schermo, resta ancorata in
fondo. Desktop: i selettori restano affiancati e la classifica si centra.

**Tornei `/app/tornei`** — Due sezioni in ordine cronologico: **Prossimi
tornei** in alto, con bordo acceso a indicare che sono giocabili e
prenotabili; **Tornei passati** sotto, senza bordo. Se l'utente e iscritto a un
torneo, quel torneo ha il **bordo verde luminoso**. In alto un filtro per data,
piattaforma o gioco. La card mostra: nome, piattaforma, gioco, data,
`iscritti / massimo`, e per i tornei conclusi il nome del vincitore.

> Il bordo e l'unico veicolo di stato: va accompagnato da un'etichetta testuale
> ("Iscritto", "Aperto", "Concluso"). Un bordo colorato da solo non e
> accessibile a chi non distingue i colori.

**Dettaglio torneo `/app/tornei/[id]`** — Descrizione del gioco, regole del
torneo, elenco dei partecipanti. Se futuro: pulsante per prenotare. Se
concluso: classifica finale.

**Conferma iscrizione `/app/tornei/[id]/prenota`** — Stessa impostazione della
conferma evento.

**Bacheca `/app/bacheca`** — Flusso verticale di post. Un annuncio mostra
titolo, immagine, testo e data. Un sondaggio mostra le opzioni votabili e,
dopo il voto, le percentuali. Un pulsante persistente apre il modulo per
lasciare un messaggio, un consiglio o una recensione. Il modulo dichiara
esplicitamente che il contenuto e a uso interno.

**Impostazioni `/app/impostazioni`** — Modifica del nickname con verifica di
unicita e logout. La sezione e predisposta per accogliere altre voci.

### 6.3 Console admin

**Dashboard `/admin`** — Dinamica sull'evento che conta adesso: quello in corso
se esiste, altrimenti il prossimo gia programmato (DEC-031). In alto le
informazioni della giornata: data e orario, prezzo, numero di postazioni,
prenotati o presenti sulla capienza. La capienza qui e visibile: e una vista
interna. Sotto, due schede che su desktop sono tabelle e su mobile liste di
card.

*Evento programmato, non ancora avviato.*

- **Prenotati**: totale in evidenza e, riga per riga, nome, cognome, eta,
  tornei a cui la persona e iscritta e un segno di spunta per chi viene da
  VRSUS per la prima volta, cioe chi non risulta prenotato su nessun evento
  cominciato prima di questo.
- **Tornei**: solo i tornei di questa giornata, con piattaforma, gioco, tipo di
  torneo, orario di inizio e numero di iscritti. Un torneo appartiene a un
  evento anche in database (`tournaments.event_id`): la dashboard non mostra
  mai tornei di altre date.
- **Piattaforme**: le postazioni configurate per l'evento, ognuna con i giochi
  resi disponibili quel giorno.

Due sole azioni, in evidenza, e si alternano: **Modifica** resta sempre,
accanto sta **Start evento** finche l'evento non e partito e **Check-in** dopo.
Il check-in prima dell'avvio non serve a nessuno. Start evento porta l'evento in
modalita live e manda una notifica a tutti gli iscritti confermati: e un'azione
che raggiunge le persone, quindi chiede conferma prima di partire.

*Evento in corso.*

- **Partecipanti**: chi ha effettivamente passato il QR code ed e presente in
  sede.
- **Tornei**: orario di inizio in evidenza, con conto alla rovescia nell'ultima
  ora e cronometro a torneo avviato; stato (da iniziare, inizia a breve entro
  mezz'ora, in corso, concluso), iscritti, presenti e partite giocate sul
  totale.

Le schede restano agganciate in alto durante lo scorrimento: con liste lunghe
si cambia vista senza risalire la pagina.

Senza eventi programmati la dashboard lo dice invece di mostrare numeri vuoti.

**Scheda utente `/admin/utenti/[id]`** — Struttura unica della pagina utente,
valida ovunque nell'applicazione si apra una persona (DEC-032). In alto
l'identita in forma di profilo social: iniziali o foto, nickname, nome
completo, eta, recapiti, ruoli, stato del consenso se minorenne e quattro
numeri (eventi, presenze, tornei, punti). Sotto tre schede:

- **Eventi**: card degli eventi a cui e prenotata o ha partecipato, prima i
  futuri, poi i passati in ordine cronologico;
- **Tornei**: iscrizioni con piazzamento, formato e record;
- **Ranking**: punteggi in ordine cronologico, filtrabili per piattaforma e
  gioco.

I dati anagrafici passano sempre da un endpoint service-role: `profiles`
espone in RLS solo la riga dell'utente corrente.

**Scheda torneo** — Struttura unica anche qui, condivisa fra console e app
utente (DEC-032). In alto le informazioni del torneo e, se c'e, il vincitore
con la corona. Sotto:

La testata mostra di suo soltanto stato, piattaforma, nome e vincitore: il
resto delle informazioni sta dietro a "Mostra dettagli", perche su un tabellone
lungo lo spazio verticale conta.

- **Classifica**: giocatori in ordine di piazzamento, con corona d'oro,
  d'argento e di bronzo ai primi tre. Se il torneo non e ancora cominciato o
  non ha risultati la lista segue l'ordine di iscrizione e nessuna posizione
  viene assegnata;
- **Partite**: tabellone a colonne per l'eliminazione diretta, sul modello di
  Challonge, e schede per fase (andata, ritorno) per i gironi;
- **Info**: descrizione e regole.

In console la stessa pagina mostra nome, cognome ed eta degli iscritti e
aggiunge i comandi riservati: avanzamento di stato, avvio del torneo,
modifica, eliminazione, iscrizione e rimozione manuale dei partecipanti,
assegnazione postazione, chiamata dei giocatori e registrazione dei risultati.
Nell'app utente restano i soli nickname e nessun comando.

**Eventi `/admin/eventi`** — Solo l'elenco: badge di visibilita e stato, slug,
titolo, data e luogo, e tre azioni per card. **Modifica** apre il wizard,
**Duplica** crea subito una copia in bozza e non pubblicata (per preparare la
data successiva) e **Elimina** cancella l'evento con tutto cio che contiene,
previa conferma. Il pulsante **Nuovo evento** porta alla vista di creazione:
nessun form dentro l'elenco.

**Scheda evento `/admin/eventi/[id]`** — Aprendo la card di un evento si vede
lo stesso riepilogo della dashboard (informazioni della giornata e le tre
schede prenotati, tornei, piattaforme), senza i comandi: modificare, avviare e
fare check-in sono azioni che vivono dove si sa di star cambiando qualcosa.

**Wizard evento `/admin/eventi/nuovo` e `/admin/eventi/[id]/modifica`** — Tre
passi rappresentati da tre schede (DEC-033).

- **Info**: titolo, slug, tipo evento, inizio, fine, apertura e chiusura
  prenotazioni, prezzo sul posto, capienza massima, luogo, indirizzo, cover
  della locandina, piu quattro caselle: pubblica sul sito, prenotazioni
  abilitate, lista d'attesa attiva, pagamento sul posto richiesto. Nient'altro.
  Lo stato non e un campo: pubblicare significa programmare, non pubblicare
  significa restare in bozza.
- **Piattaforme**: le postazioni a catalogo come card con casella di selezione,
  immagine e nome; dentro la card, espandibile, l'elenco dei giochi di quella
  postazione, anch'essi selezionabili. Si decide cosi, evento per evento, cosa
  c'e e con quali giochi.
- **Tornei**: elenco dei tornei gia creati per l'evento e pulsante per
  crearne uno nuovo. In fondo il salvataggio conclusivo.

Il primo "Avanti" salva l'evento come bozza: postazioni e tornei si agganciano
a un id, quindi devono avere un evento gia esistente. Un evento con quattro
postazioni e dieci giochi non si compila in un colpo solo, e la bozza permette
di riprenderlo.

**Nuovo torneo dell'evento `/admin/eventi/[id]/tornei/nuovo`** — Postazione
scelta fra quelle dell'evento, gioco scelto fra quelli resi disponibili su
quella postazione, orario di inizio (il giorno lo eredita dall'evento), numero
massimo di partecipanti, tipo di torneo, schema di punteggio, stato,
descrizione, regole e le tre caselle check-in richiesto, assegna punti ranking,
visibile agli utenti. Nome e slug derivano dal gioco. Alla creazione si torna
al wizard sulla scheda Tornei, dove il torneo compare come card con
piattaforma, gioco, orario, tipo e massimo di partecipanti.

**Tornei `/admin/tornei`** — Tre schede: **In corso**, che compare solo quando
c'e davvero un torneo in corso, **In programma** e **Storico**. Qui e possibile
creare un torneo **anche indipendente** da un evento. Campi: nome, piattaforma,
gioco, data, numero massimo di partecipanti, tipo di torneo, regole testuali,
descrizione, **schema di punteggio**.

Lo schema si sceglie da un elenco di schemi gia definiti, con l'anteprima delle
regole che verranno applicate ("1° 100 punti, 2° 60, 3°-4° 40, partecipazione
10"). Un torneo senza schema non assegna punti, esattamente come un torneo con
`ranking_enabled = false`: la differenza va mostrata in modo esplicito
nell'interfaccia, perche le due condizioni si assomigliano ma nascono da scelte
diverse.

**Schemi di punteggio** — Gestiti da `/admin/altro`, perche si toccano di rado:
elenco degli schemi, regole di ciascuno, duplicazione di uno schema esistente
come base per uno nuovo. Modificare uno schema **non ricalcola** i punti gia
assegnati: il ledger e uno storico e resta immutabile. Per correggere punti gia
attribuiti si usa la rettifica auditabile gia esistente.

**Piattaforme `/admin/piattaforme`** — Elenco card con nome, codice, immagine e
indicatore `internal`. Il dettaglio elenca i giochi associati e permette di
aggiungerne.

**Giochi `/admin/giochi`** — Card composte dalla sola immagine con la **label
della piattaforma in alto a destra** (codice). Senza immagine, un segnaposto
con il nome del gioco: la card non deve mai risultare vuota. Il dettaglio
mostra e modifica le informazioni.

**Altro `/admin/altro`** — Raccoglie Richieste, Live, Check-in, Utenti,
Impostazioni, Ranking e Servizi.

## 7. Flussi chiave

**Registrazione.** Il form invia i dati anagrafici come metadati utente. Il
trigger `handle_new_user` va esteso per popolare nickname, nome, cognome e data
di nascita nel profilo. Il nickname va verificato prima dell'invio e comunque
protetto dall'indice unico: la verifica anticipata e cortesia, l'indice e la
garanzia.

**Registrazione di un minore.** Stesso percorso, piu la creazione del record in
`guardian_consents` nella stessa transazione logica della creazione del
profilo. Un account minorenne **senza consenso registrato non deve poter
prenotare**: il controllo va messo nella RPC di prenotazione, non solo
nell'interfaccia, altrimenti basta una chiamata diretta per aggirarlo.

La verifica via email al genitore (doppio opt-in) e il rafforzamento naturale
di questo flusso, ma dipende da un provider SMTP configurato: si progetta ora
il campo `verified_at` e si attiva quando l'invio email sara disponibile in
QUALITY.

**Prenotazione evento.** Dashboard -> conferma -> `create_event_booking` ->
QR sbloccato. Le RPC esistenti coprono gia prenotazione atomica, lista d'attesa
FIFO, QR hash-only e check-in idempotente: **non vanno riscritte**, va
ricostruita la UI attorno.

**Iscrizione torneo.** Lista -> dettaglio -> conferma ->
`register_tournament_entry`. Al ritorno la card mostra il bordo verde.

**Punteggio arcade.** Staff o admin registrano un punteggio su un gioco per un
utente. Il record entra in `game_scores` e concorre alla leaderboard di quel
gioco. Non genera punti VRSUS: i punti restano legati ai piazzamenti nei tornei
e alle rettifiche auditabili.

**Assegnazione dei punti a fine torneo.** Alla chiusura del torneo il motore
legge lo schema collegato e scrive nel ledger una riga per ogni regola
applicabile: piazzamenti, partecipazione, esiti degli incontri per i gironi.
L'indice unico `(tournament_id, user_id, reason_code)` gia esistente garantisce
che una seconda esecuzione non duplichi i punti, quindi l'operazione resta
sicura se ripetuta.

## 8. Contenuti placeholder

Home, Chi siamo e Servizi richiedono testi che oggi non esistono. Il
proprietario ha chiesto di inventarli come segnaposto.

**Vincolo che resta in vigore.** `AGENT_START_HERE.md` vieta di inventare
storia, numeri, testimonianze, partner o claim commerciali. I testi segnaposto
saranno quindi **descrittivi e verificabili**: raccontano cosa si fa e come
funziona, senza date di fondazione, senza statistiche, senza recensioni finte,
senza loghi di partner. Ogni blocco segnaposto va marcato nel codice con un
commento e raccolto in un unico file di contenuti, cosi che la sostituzione con
i testi reali sia una singola operazione e non una caccia al tesoro.

## 9. Roadmap

Ogni fase si chiude solo quando la sua Definition of Done e verificata, non
quando il codice e scritto.

| Fase | Contenuto | Definition of Done |
| --- | --- | --- |
| **A** | Migration dominio: rinomina platforms, tabelle games/scores/bacheca/feedback/consensi/schemi punti, campi eventi e tornei, profili | `db:reset` da zero pulito; grant DEC-005 ri-applicati e verificati; pgTAP aggiornata e verde |
| **B** | Registrazione e login: form, trigger profilo, nickname unico, consenso genitoriale | Registrazione end-to-end in DEV per maggiorenne e minorenne; nickname duplicato rifiutato dal database; minore senza consenso non riesce a prenotare nemmeno chiamando la RPC |
| **C** | Le tre shell e la navigazione | Le tre shell rese su 375 px e su desktop; tab bar rispetta la safe area |
| **D** | Vetrina: home, postazioni, chi siamo, servizi | Le quattro pagine leggono da Supabase; nessun contenuto inventato fuori dal file segnaposto |
| **E** | Dashboard utente, conferma prenotazione, QR | Prenotazione reale in DEV che sblocca il QR; evento pieno instrada alla lista d'attesa |
| **F** | Tornei utente: lista, filtri, dettaglio, iscrizione | Stati bordo corretti; filtri combinabili; iscrizione end-to-end |
| **G** | Ranking: punti e record, filtri; schemi di punteggio configurabili e motore di assegnazione | Entrambe le letture verificate su dati di prova; `score_direction` rispettata; punti non piu cablati in `record_match_result`; riesecuzione dell'assegnazione non duplica punti |
| **H** | Bacheca: annunci, sondaggi, feedback | Un voto per utente garantito dal database; feedback non esposto pubblicamente |
| **I** | Console admin: piattaforme, giochi, eventi a passi, tornei, dashboard | Creazione completa di evento con tornei; propagazione su vetrina e app |
| **J** | Consolidamento: assorbimento console legacy, redirect, sitemap, ritiro `news_posts` | Nessuna rotta orfana; sitemap coerente; suite completa verde |

Le fasi A e B sono prerequisiti di tutto il resto. C e D possono procedere in
parallelo a E se il modello dati e stabile.

## 10. Impatti sul codice esistente

**Si riusa senza riscrivere:** RPC di booking, lista d'attesa, QR e check-in;
RPC dei tornei a eliminazione diretta; ledger ranking; notifiche e preferenze
push; uploader asset su Supabase Storage; endpoint service-role
`/api/admin/events` (DEC-018), da rinominare nel vocabolario piattaforme.

**Cambia:** le pagine admin catalogo e configurazione evento, che passano al
modello piattaforme/giochi; i tipi generati (`db:types` dopo ogni migration);
la suite pgTAP, che referenzia i nomi vecchi.

**Si ritira:** `activities` e `station_activities`; le pagine `/esperienze`;
`news_posts` dopo la migrazione dei contenuti in bacheca.

**Da riscrivere:** l'assegnazione dei punti dentro `record_match_result`, oggi
cablata a 100/60 per le prime due posizioni, che passa a leggere lo schema
collegato al torneo.

**Da costruire da zero:** formati di torneo tutti-contro-tutti e andata e
ritorno, con generazione calendario e classifica; schemi di punteggio e
relativa console; raccolta e verifica del consenso genitoriale. Il bracket a
eliminazione diretta esistente non si tocca.

## 11. Rischi e questioni aperte

1. **La rinomina e la migration piu rischiosa del piano.** Tocca sei tabelle,
   le view pubbliche, le policy e i 169 test pgTAP. Va fatta per prima, in una
   sola migration, con `db:reset` da zero come verifica.
2. **I grant DEC-005 possono perdersi nella rinomina.** E il modo piu probabile
   di reintrodurre silenziosamente la fuga di capienza. Serve un test pgTAP che
   asserisca l'assenza di grant per `authenticated` sulle tabelle del dominio
   evento.
3. **I punti cablati vanno rimossi, non affiancati.** Finche
   `record_match_result` contiene i valori 100 e 60, uno schema collegato al
   torneo produrrebbe punti doppi. La fase G deve sostituire la logica
   esistente, non aggiungersene una accanto.
4. **Dati di un adulto non utente.** `guardian_consents` contiene i recapiti di
   un genitore che non ha un account VRSUS. E la categoria di dati piu delicata
   dell'intero sistema: nessuna view pubblica, nessuna esposizione allo staff
   oltre l'esistenza del consenso, cancellazione a cascata con il profilo del
   minore.
5. **Testi legali da validare.** Informativa privacy, testo del consenso
   genitoriale e soglie di eta vanno confermati da chi cura la privacy policy
   prima delle registrazioni in QUALITY. Il sistema li rende applicabili, non
   li decide.
6. **Modificare uno schema non ricalcola lo storico.** E una scelta
   deliberata (il ledger e immutabile), ma va spiegata in interfaccia,
   altrimenti un admin si aspettera che cambiare lo schema aggiorni le
   classifiche passate.

## 12. Fuori scope in questa fase

Gestione della bacheca lato admin, moderazione dei feedback, notifiche push
legate ai nuovi flussi, pagamenti online (vietati dalla specifica), profili
pubblici degli utenti.
