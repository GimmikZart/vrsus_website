-- Fase A della specifica applicativa V2.
-- Il dominio del catalogo passa da postazioni/attivita a piattaforme/giochi
-- (DEC-021, DEC-022), la registrazione acquisisce nickname, data di nascita e
-- consenso genitoriale (DEC-024, DEC-026), il punteggio dei tornei diventa
-- configurabile per schema (DEC-027) e la bacheca sostituisce le news.
--
-- Le revoke di DEC-005 seguono l'oggetto e non il nome, ma questa migration le
-- ri-applica comunque in modo esplicito: le tabelle nuove nascono con i grant
-- di default verso anon/authenticated e senza revoke la capienza tornerebbe
-- leggibile dal browser.

-- ---------------------------------------------------------------------------
-- 1. View dipendenti dagli oggetti che stanno per cambiare
-- ---------------------------------------------------------------------------

drop view if exists public.public_event_station_activities;
drop view if exists public.public_event_activities;
drop view if exists public.public_event_stations;
drop view if exists public.public_activities;
drop view if exists public.public_ranking_by_activity;
drop view if exists public.public_ranking;
drop view if exists public.public_tournaments;
drop view if exists public.public_tournament_matches;
drop view if exists public.public_news_posts;

-- ---------------------------------------------------------------------------
-- 2. Ritiro del catalogo attivita
-- ---------------------------------------------------------------------------

drop trigger if exists event_station_activities_same_event
  on public.event_station_activities;
drop function if exists public.validate_event_station_activity_event();

drop table if exists public.event_station_activities;
drop table if exists public.event_activities cascade;
drop table if exists public.station_activities;
drop table if exists public.activities cascade;
drop table if exists public.activity_categories;

alter table public.tournaments drop column if exists event_activity_id;

-- ---------------------------------------------------------------------------
-- 3. Rinomina del dominio postazioni in piattaforme
-- ---------------------------------------------------------------------------

alter table public.stations rename to platforms;
alter table public.station_categories rename to platform_categories;
alter table public.event_stations rename to event_platforms;
alter table public.event_platforms rename column station_id to platform_id;
alter table public.matches rename column event_station_id to event_platform_id;

alter table public.platforms add column code text;

-- Il codice breve deriva dallo slug esistente: e la label mostrata sulle card
-- dei giochi e deve esistere gia dalla prima riga.
update public.platforms
set code = upper(left(regexp_replace(slug, '[^a-z0-9]', '', 'g'), 12))
where code is null;

update public.platforms set code = 'PLT' || left(id::text, 4) where code = '';

alter table public.platforms alter column code set not null;
alter table public.platforms
  add constraint platforms_code_check
  check (char_length(trim(code)) between 1 and 12);
create unique index platforms_code_key on public.platforms (upper(code));

alter table public.platforms
  add column internal boolean not null default false;

comment on column public.platforms.internal is
  'Una piattaforma internal non compare mai in vetrina ne nei filtri pubblici.';

-- ---------------------------------------------------------------------------
-- 4. Giochi
-- ---------------------------------------------------------------------------

create table public.games (
  id uuid primary key default extensions.gen_random_uuid(),
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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  unique (platform_id, slug),
  constraint games_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint games_name_check
    check (char_length(trim(name)) between 1 and 180),
  constraint games_min_players_check
    check (min_players is null or min_players > 0),
  constraint games_max_players_check
    check (max_players is null or min_players is null or max_players >= min_players),
  constraint games_metadata_check check (jsonb_typeof(metadata) = 'object')
);

create index games_platform_active_idx on public.games (platform_id, active);

comment on column public.games.score_direction is
  'desc: vince il punteggio piu alto. asc: vince il piu basso, es. tempo.';

-- Giochi resi disponibili su una piattaforma durante uno specifico evento.
create table public.event_platform_games (
  id uuid primary key default extensions.gen_random_uuid(),
  event_platform_id uuid not null
    references public.event_platforms(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_platform_id, game_id)
);

-- ---------------------------------------------------------------------------
-- 5. Tipo evento
-- ---------------------------------------------------------------------------

alter table public.events
  add column event_type text not null default 'all_you_can_play'
  check (event_type in ('birthday', 'all_you_can_play', 'team_building', 'private_day'));

-- ---------------------------------------------------------------------------
-- 6. Schemi di punteggio configurabili
-- ---------------------------------------------------------------------------

create table public.point_schemes (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint point_schemes_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint point_schemes_name_check
    check (char_length(trim(name)) between 1 and 120)
);

create table public.point_scheme_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  scheme_id uuid not null references public.point_schemes(id) on delete cascade,
  rule_type text not null check (rule_type in (
    'placement', 'participation', 'match_win', 'match_draw', 'match_loss', 'bonus')),
  placement_from integer,
  placement_to integer,
  points integer not null,
  sort_order integer not null default 0,
  -- Una regola di piazzamento senza posizione, o una regola di altro tipo con
  -- una posizione, verrebbe silenziosamente ignorata dal motore.
  constraint point_scheme_rules_placement_check check (
    (rule_type = 'placement'
      and placement_from is not null
      and placement_from > 0
      and (placement_to is null or placement_to >= placement_from))
    or (rule_type <> 'placement'
      and placement_from is null
      and placement_to is null)
  )
);

create index point_scheme_rules_scheme_idx
  on public.point_scheme_rules (scheme_id, rule_type, sort_order);

-- ---------------------------------------------------------------------------
-- 7. Tornei: piattaforma, gioco, formati, schema punti, tornei standalone
-- ---------------------------------------------------------------------------

alter table public.tournaments alter column event_id drop not null;
alter table public.tournaments
  add column platform_id uuid references public.platforms(id) on delete restrict;
alter table public.tournaments
  add column game_id uuid references public.games(id) on delete restrict;
alter table public.tournaments
  add column point_scheme_id uuid references public.point_schemes(id) on delete set null;

alter table public.tournaments drop constraint tournaments_format_check;
alter table public.tournaments add constraint tournaments_format_check
  check (format in ('single_elimination', 'round_robin', 'double_round_robin'));

-- Lo slug era unico per (event_id, slug): con event_id nullabile i tornei
-- standalone resterebbero scoperti.
create unique index tournaments_standalone_slug_idx
  on public.tournaments (slug) where event_id is null;

-- ---------------------------------------------------------------------------
-- 8. Ranking: il ledger passa dalle attivita ai giochi
-- ---------------------------------------------------------------------------

alter table public.ranking_points_ledger rename column activity_id to game_id;
alter table public.ranking_points_ledger
  add constraint ranking_points_ledger_game_id_fkey
  foreign key (game_id) references public.games(id) on delete set null;

-- Punteggi assoluti per gioco: tornei e sfide arcade.
create table public.game_scores (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete restrict,
  event_id uuid references public.events(id) on delete set null,
  tournament_id uuid references public.tournaments(id) on delete set null,
  score numeric not null,
  notes text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default timezone('utc', now())
);

create index game_scores_game_idx on public.game_scores (game_id, score);
create index game_scores_user_idx on public.game_scores (user_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- 9. Profili: nickname, data di nascita, storico
-- ---------------------------------------------------------------------------

alter table public.profiles add column nickname text;
alter table public.profiles add column birth_date date;

alter table public.profiles
  add constraint profiles_nickname_check
  check (nickname is null or char_length(trim(nickname)) between 3 and 24);

update public.profiles
set nickname = 'player-' || left(id::text, 8)
where nickname is null;

create unique index profiles_nickname_key
  on public.profiles (lower(nickname)) where nickname is not null;

create table public.profile_nickname_history (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  previous_nickname text not null,
  changed_at timestamptz not null default timezone('utc', now())
);

create index profile_nickname_history_user_idx
  on public.profile_nickname_history (user_id, changed_at desc);

-- L'eta si deriva sempre: un flag di minore eta diventerebbe falso al
-- diciottesimo compleanno senza che nulla lo aggiorni.
create function public.is_minor(p_birth_date date)
returns boolean
language sql
immutable
as $$
  select p_birth_date is not null
     and p_birth_date > (current_date - interval '18 years');
$$;

-- ---------------------------------------------------------------------------
-- 10. Consenso di genitore o tutore
-- ---------------------------------------------------------------------------

create table public.guardian_consents (
  id uuid primary key default extensions.gen_random_uuid(),
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
  revoked_at timestamptz,
  constraint guardian_consents_name_check check (
    char_length(trim(guardian_first_name)) between 1 and 120
    and char_length(trim(guardian_last_name)) between 1 and 120),
  constraint guardian_consents_email_check
    check (guardian_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

comment on table public.guardian_consents is
  'Recapiti di un adulto che non e utente della piattaforma. Mai in view pubbliche.';

-- ---------------------------------------------------------------------------
-- 11. Bacheca e feedback
-- ---------------------------------------------------------------------------

create table public.board_posts (
  id uuid primary key default extensions.gen_random_uuid(),
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
  updated_at timestamptz not null default timezone('utc', now()),
  constraint board_posts_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint board_posts_title_check
    check (char_length(trim(title)) between 1 and 200)
);

create index board_posts_published_idx
  on public.board_posts (status, pinned desc, published_at desc);

create table public.board_poll_options (
  id uuid primary key default extensions.gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  constraint board_poll_options_label_check
    check (char_length(trim(label)) between 1 and 120)
);

create index board_poll_options_post_idx
  on public.board_poll_options (post_id, sort_order);

create table public.board_poll_votes (
  id uuid primary key default extensions.gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  option_id uuid not null
    references public.board_poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  -- Un voto per utente per sondaggio, garantito dal database e non dalla UI.
  unique (post_id, user_id)
);

create table public.user_feedback (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('message', 'suggestion', 'review')),
  rating smallint check (rating is null or rating between 1 and 5),
  body text not null,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'archived')),
  internal_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_feedback_body_check
    check (char_length(trim(body)) between 1 and 5000)
);

create index user_feedback_status_idx
  on public.user_feedback (status, created_at desc);

-- I contenuti redazionali migrano nella bacheca come annunci.
insert into public.board_posts (slug, title, body, post_type, status, image_path, published_at, created_at)
select post.slug, post.title,
  coalesce(post.content, post.excerpt),
  'announcement',
  case when post.status = 'published' then 'published' else 'draft' end,
  post.cover_image_path,
  post.published_at,
  post.created_at
from public.news_posts post
on conflict (slug) do nothing;

drop table if exists public.news_posts cascade;

-- ---------------------------------------------------------------------------
-- 12. Trigger updated_at
-- ---------------------------------------------------------------------------

create trigger games_set_updated_at before update on public.games
  for each row execute function public.set_updated_at();
create trigger point_schemes_set_updated_at before update on public.point_schemes
  for each row execute function public.set_updated_at();
create trigger board_posts_set_updated_at before update on public.board_posts
  for each row execute function public.set_updated_at();
