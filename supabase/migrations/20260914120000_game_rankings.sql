-- Ranking: la sfida lunga di un gioco.
--
-- Un torneo si apre e si chiude in un'ora. Un ranking no: e una gara aperta a
-- tutti che dura una serata, un trimestre o una stagione intera, e in cui
-- chiunque, in qualunque momento dell'evento, puo chiedere allo staff di
-- registrare il proprio record. Chi arriva dopo prova a battere quello degli
-- altri.
--
-- Il ranking non e il gioco: lo stesso gioco puo averne molti, perche la sfida
-- e su una mappa, una pista, una macchina o una configurazione precisa. Quel
-- dettaglio si scrive nel regolamento del ranking, in chiaro, e lo leggono
-- anche i clienti dall'app. Un gioco puo anche non avere nessun ranking: in
-- classifica compaiono solo quelli che ce l'hanno.

-- ---------------------------------------------------------------------------
-- 1. La tabella
-- ---------------------------------------------------------------------------

create table public.game_rankings (
  id uuid primary key default extensions.gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 180),
  -- Regolamento della sfida: mappa, traccia, vettura, impostazioni. Testo
  -- libero perche ogni gioco ha il suo vocabolario.
  rules text,
  score_kind text not null default 'points'
    check (score_kind in ('points', 'time')),
  score_direction text not null default 'desc'
    check (score_direction in ('asc', 'desc')),
  status text not null default 'open' check (status in ('open', 'closed')),
  starts_at timestamptz,
  -- Scadenza facoltativa: distingue una sfida di giornata da una stagionale.
  ends_at timestamptz,
  is_public boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint game_rankings_window_check check (
    ends_at is null or starts_at is null or ends_at > starts_at
  )
);

create index game_rankings_game_idx
  on public.game_rankings (game_id, created_at desc);

create trigger game_rankings_set_updated_at
  before update on public.game_rankings
  for each row
  execute function public.set_updated_at();

comment on table public.game_rankings is
  'Sfida lunga su un gioco: i punteggi registrati dallo staff confluiscono qui.';
comment on column public.game_rankings.rules is
  'Regolamento in chiaro: mappa, traccia, vettura o configurazione della sfida.';

-- Un punteggio appartiene alla sfida, non solo al gioco: senza questo due
-- ranking sulla stessa pista finirebbero nella stessa classifica.
alter table public.game_scores
  add column ranking_id uuid references public.game_rankings(id) on delete cascade;

create index game_scores_ranking_idx on public.game_scores (ranking_id, score);

-- ---------------------------------------------------------------------------
-- 2. Accesso
-- ---------------------------------------------------------------------------

alter table public.game_rankings enable row level security;

create policy game_rankings_admin_manage on public.game_rankings
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

-- Lo staff registra i punteggi durante la serata: per farlo deve poter
-- leggere le sfide aperte, non modificarle.
create policy game_rankings_staff_read on public.game_rankings
  for select to authenticated
  using (public.has_any_role(array['staff', 'admin', 'super_admin']));

revoke all on table public.game_rankings from anon, authenticated;
grant select, insert, update, delete on table public.game_rankings to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Proiezioni pubbliche
-- ---------------------------------------------------------------------------

-- Le sfide visibili in app, con il nome del gioco e della postazione gia
-- risolti: l'app filtra le tende da qui e non deve incrociare tre tabelle.
create view public.public_game_rankings as
  select
    ranking.id,
    ranking.game_id,
    game.name as game_name,
    game.platform_id,
    platform.name as platform_name,
    platform.code as platform_code,
    ranking.name,
    ranking.rules,
    ranking.score_kind,
    ranking.score_direction,
    ranking.status,
    ranking.starts_at,
    ranking.ends_at,
    ranking.created_at
  from public.game_rankings ranking
  join public.games game on game.id = ranking.game_id
  join public.platforms platform on platform.id = game.platform_id
  where ranking.is_public = true
    and game.active = true
    and game.archived_at is null
    and platform.active = true
    and platform.internal = false
    and platform.archived_at is null;

-- Classifica di una sfida: il miglior risultato di ogni giocatore, con quanti
-- tentativi ha fatto. L'ordinamento dipende da score_direction e lo applica
-- chi legge, perche la stessa view serve tempi e punti.
create view public.public_ranking_standings as
  select
    score.ranking_id,
    score.user_id,
    profile.nickname,
    case
      when ranking.score_direction = 'asc' then min(score.score)
      else max(score.score)
    end as best_score,
    count(*)::integer as attempts,
    max(score.recorded_at) as last_recorded_at
  from public.game_scores score
  join public.game_rankings ranking on ranking.id = score.ranking_id
  join public.profiles profile on profile.id = score.user_id
  where ranking.is_public = true
  group by score.ranking_id, ranking.score_direction, score.user_id, profile.nickname;

grant select on public.public_game_rankings to anon, authenticated;
grant select on public.public_ranking_standings to anon, authenticated;

comment on view public.public_game_rankings is
  'Sfide pubbliche con gioco e postazione risolti.';
comment on view public.public_ranking_standings is
  'Miglior risultato per giocatore su ogni sfida.';
