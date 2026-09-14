-- Motore tornei elastico: schema.
--
-- Fino a qui una partita era due sfidanti per costruzione
-- (`matches.entry_a_id` e `matches.entry_b_id`) e il "formato" del torneo
-- teneva insieme tre domande diverse. Con giochi di corsa o a punti quel
-- modello non regge: sedici persone che corrono quattro alla volta non sono
-- otto duelli, e un tempo sul giro non e una vittoria.
--
-- Il torneo ora risponde a tre domande indipendenti:
--
--   A. chi gioca          -> `entry_size` (1 singolo, 2 coppia, N squadra)
--                            piu `team_formation`, cioe come si compone
--   B. come ci si affronta -> `format` piu `group_size` e `rounds_count`
--                            (eliminazione, tutti contro tutti, manche,
--                             time attack)
--   C. come si vince       -> `result_kind` (vittoria, punti, tempo, ordine
--                            di arrivo), `score_direction`, `standing_metric`
--
-- Combinandole si ottengono tutti i casi reali senza codice dedicato: Mario
-- Kart e `heats` da 4 a ordine di arrivo, Gran Turismo e `time_trial` a tempo,
-- Tekken resta `single_elimination` a vittoria secca.
--
-- Questa migration porta soltanto lo schema. Il motore (generazione
-- calendario, registrazione risultati, classifica, squadre) sta nella
-- migration successiva, che chiude la transizione togliendo le colonne
-- `entry_a_id`, `entry_b_id` e `score_payload`.

-- ---------------------------------------------------------------------------
-- 1. Configurazione del torneo
-- ---------------------------------------------------------------------------

alter table public.tournaments
  add column entry_size integer not null default 1,
  add column team_formation text not null default 'solo',
  add column group_size integer,
  add column rounds_count integer,
  add column result_kind text not null default 'win_loss',
  add column score_direction text,
  add column standing_metric text,
  add column heat_seeding text not null default 'rotation',
  add column allow_draw boolean not null default false,
  add column scoring_config jsonb not null default '{}'::jsonb;

comment on column public.tournaments.entry_size is
  'Quante persone compongono un iscritto: 1 singolo, 2 coppia, N squadra.';
comment on column public.tournaments.team_formation is
  'Come nasce una squadra: solo, open (chiunque entra), invite (codice), admin.';
comment on column public.tournaments.group_size is
  'Quanti iscritti si affrontano nella stessa partita.';
comment on column public.tournaments.rounds_count is
  'Quante manche per i formati a manche o a tempo.';
comment on column public.tournaments.result_kind is
  'Cosa si registra a fine partita: win_loss, points, time, placement.';
comment on column public.tournaments.standing_metric is
  'Come si ordina la classifica e quali colonne mostra l interfaccia.';
comment on column public.tournaments.heat_seeding is
  'Composizione delle manche: rotation (avversari sempre diversi) o standings.';
comment on column public.tournaments.scoring_config is
  'Parametri tabellari: placement_points, tiebreakers.';

-- Normalizzazione: la maschera manda quello che ha capito l'operatore, qui si
-- riempiono i vuoti e si tolgono le combinazioni senza senso. E un trigger e
-- non una funzione chiamata dalla UI perche deve valere per ogni strada che
-- scrive un torneo: maschere, seed, fixture, script di supporto.
-- `security definer` non e un vezzo: il trigger legge `games` per ricavare la
-- direzione del punteggio, e quella tabella non ha grant per il browser. Senza,
-- creare un torneo dalla console fallirebbe con "permission denied".
create function public.tournaments_normalize_config()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_direction text;
  v_points jsonb := '[]'::jsonb;
  v_index integer;
begin
  -- A. chi gioca
  if new.entry_size <= 1 then
    new.entry_size := 1;
    new.team_formation := 'solo';
  elsif new.team_formation = 'solo' then
    new.team_formation := 'open';
  end if;

  -- B. come ci si affronta
  if new.format = 'time_trial' then
    new.group_size := 1;
    new.rounds_count := greatest(coalesce(new.rounds_count, 1), 1);
  elsif new.format = 'heats' then
    new.group_size := greatest(coalesce(new.group_size, 4), 2);
    new.rounds_count := greatest(coalesce(new.rounds_count, 3), 1);
  else
    new.group_size := 2;
    new.rounds_count := null;
  end if;

  -- C. come si vince. Un solo concorrente per partita non puo vincere contro
  -- nessuno, e fra piu di due non esiste "il perdente": il tipo di risultato
  -- si adatta alla struttura invece di lasciare il torneo incoerente.
  if new.format = 'time_trial' and new.result_kind not in ('time', 'points') then
    new.result_kind := 'time';
  elsif new.format = 'heats' and new.group_size > 2 and new.result_kind = 'win_loss' then
    new.result_kind := 'placement';
  end if;

  if new.result_kind = 'time' then
    new.score_direction := 'asc';
  elsif new.result_kind = 'points' then
    if new.score_direction is null then
      select game.score_direction into v_game_direction
      from public.games game where game.id = new.game_id;
      new.score_direction := coalesce(v_game_direction, 'desc');
    end if;
  else
    new.score_direction := null;
  end if;

  if new.standing_metric is null then
    new.standing_metric := case
      when new.format = 'single_elimination' then 'bracket'
      when new.result_kind = 'placement' then 'placement_points'
      when new.result_kind = 'time' then 'best_time'
      when new.result_kind = 'points' then 'points_sum'
      else 'wins'
    end;
  end if;

  if new.format = 'single_elimination' then
    new.standing_metric := 'bracket';
  end if;

  -- Punti per posizione: senza una tabella esplicita ne serve una di scorta,
  -- altrimenti una classifica a punti non saprebbe cosa sommare.
  if new.standing_metric = 'placement_points'
     and (new.scoring_config -> 'placement_points') is null then
    for v_index in 1 .. new.group_size loop
      v_points := v_points || to_jsonb((new.group_size - v_index + 1) * 2 + 2);
    end loop;
    new.scoring_config := new.scoring_config
      || jsonb_build_object('placement_points', v_points);
  end if;

  -- Il pareggio ha senso solo dove esiste un avversario diretto e la partita
  -- non deve produrre per forza chi passa il turno.
  if new.format = 'single_elimination'
     or new.format = 'time_trial'
     or (new.format = 'heats' and new.group_size > 2) then
    new.allow_draw := false;
  end if;

  return new;
end;
$$;

create trigger tournaments_normalize_config
before insert or update on public.tournaments
for each row execute function public.tournaments_normalize_config();

-- I tornei gia esistenti vanno normalizzati prima dei vincoli: senza questo
-- passaggio avrebbero `group_size` nullo e il controllo di struttura
-- fallirebbe sul posto.
update public.tournaments set updated_at = updated_at;

-- Le combinazioni impossibili non devono nemmeno poter essere scritte via SQL:
-- il seed e i test passano di qui come le maschere.
alter table public.tournaments
  drop constraint tournaments_format_check,
  add constraint tournaments_format_check check (
    format in ('single_elimination', 'round_robin', 'double_round_robin', 'heats', 'time_trial')
  ),
  add constraint tournaments_entry_size_check check (entry_size between 1 and 10),
  add constraint tournaments_team_formation_check check (
    team_formation in ('solo', 'open', 'invite', 'admin')
    and (entry_size = 1) = (team_formation = 'solo')
  ),
  add constraint tournaments_rounds_count_check check (
    rounds_count is null or rounds_count between 1 and 30
  ),
  add constraint tournaments_result_kind_check check (
    result_kind in ('win_loss', 'points', 'time', 'placement')
  ),
  add constraint tournaments_score_direction_check check (
    score_direction is null or score_direction in ('asc', 'desc')
  ),
  add constraint tournaments_standing_metric_check check (
    standing_metric is null
    or standing_metric in ('bracket', 'wins', 'points_sum', 'placement_points', 'best_time', 'total_time')
  ),
  add constraint tournaments_heat_seeding_check check (heat_seeding in ('rotation', 'standings')),
  add constraint tournaments_scoring_config_check check (jsonb_typeof(scoring_config) = 'object'),
  add constraint tournaments_structure_check check (
    (format = 'time_trial' and group_size = 1 and rounds_count is not null)
    or (format = 'heats' and group_size >= 2 and rounds_count is not null)
    or (format in ('single_elimination', 'round_robin', 'double_round_robin')
        and group_size = 2 and rounds_count is null)
  );

-- ---------------------------------------------------------------------------
-- 2. Slug automatico
-- ---------------------------------------------------------------------------
--
-- Lo slug non si scrive piu a mano: nessuna rotta lo usa (si naviga per id) e
-- scriverlo a mano obbligava a inventare codici diversi per tornei che si
-- ripetono sullo stesso gioco. Ora e `piattaforma-gioco-data`, che e gia
-- univoco nella pratica, con suffisso numerico nei casi limite.

create function public.tournament_slug_source(
  p_platform_id uuid, p_game_id uuid, p_name text, p_starts_at timestamptz)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(
    trim(both '-' from regexp_replace(
      lower(
        coalesce((select platform.slug from public.platforms platform where platform.id = p_platform_id), '')
        || '-'
        || coalesce(
             (select game.slug from public.games game where game.id = p_game_id),
             coalesce(p_name, 'torneo'))
        || '-'
        || to_char(timezone('Europe/Rome', coalesce(p_starts_at, timezone('utc', now()))), 'DD-MM-YYYY')
      ),
      '[^a-z0-9]+', '-', 'g')),
    '');
$$;

-- Anche qui serve `security definer`: l'unicita dello slug si misura su tutti
-- i tornei, non solo su quelli che chi scrive puo vedere.
create function public.tournaments_set_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_slug text;
  v_suffix integer := 2;
begin
  -- Si rigenera alla creazione e quando cambia uno degli ingredienti: lo slug
  -- deve continuare a descrivere il torneo che rappresenta.
  if tg_op = 'UPDATE'
     and new.platform_id is not distinct from old.platform_id
     and new.game_id is not distinct from old.game_id
     and new.starts_at is not distinct from old.starts_at
     and new.slug is not null then
    return new;
  end if;

  v_base := coalesce(
    public.tournament_slug_source(new.platform_id, new.game_id, new.name, new.starts_at),
    'torneo');
  v_slug := v_base;

  while exists (
    select 1 from public.tournaments other
    where other.slug = v_slug and other.id <> new.id
  ) loop
    v_slug := v_base || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;

  new.slug := v_slug;
  return new;
end;
$$;

create trigger tournaments_set_slug
before insert or update on public.tournaments
for each row execute function public.tournaments_set_slug();

-- Gli slug scritti a mano finora vanno portati alla nuova convenzione, uno
-- alla volta perche il suffisso dipende da quelli gia assegnati.
do $$
declare
  v_row record;
  v_base text;
  v_slug text;
  v_suffix integer;
begin
  for v_row in
    select id, platform_id, game_id, name, starts_at
    from public.tournaments order by created_at
  loop
    v_base := coalesce(
      public.tournament_slug_source(v_row.platform_id, v_row.game_id, v_row.name, v_row.starts_at),
      'torneo');
    v_slug := v_base;
    v_suffix := 2;
    while exists (
      select 1 from public.tournaments other
      where other.slug = v_slug and other.id <> v_row.id
    ) loop
      v_slug := v_base || '-' || v_suffix::text;
      v_suffix := v_suffix + 1;
    end loop;
    update public.tournaments set slug = v_slug where id = v_row.id;
  end loop;
end;
$$;

-- Lo slug non si scrive piu da nessuna maschera: gli si da un default vuoto
-- solo perche chi inserisce un torneo non debba fornirlo. Il trigger lo
-- sostituisce prima che la riga tocchi il disco.
alter table public.tournaments alter column slug set default '';

-- Uno slug per torneo, non piu uno per evento: i tornei senza evento
-- restavano fuori dal vincolo.
drop index if exists public.tournaments_event_slug_idx;
create unique index tournaments_slug_idx on public.tournaments (slug);

-- ---------------------------------------------------------------------------
-- 3. Squadre
-- ---------------------------------------------------------------------------

alter table public.tournament_entries
  add column visibility text not null default 'open',
  add column join_code text;

comment on column public.tournament_entries.visibility is
  'open: chiunque puo entrare. invite: serve il codice del capitano.';
comment on column public.tournament_entries.join_code is
  'Codice di sei caratteri per entrare in una squadra a invito.';

alter table public.tournament_entries
  drop constraint tournament_entries_status_check,
  add constraint tournament_entries_status_check check (
    status in ('forming', 'registered', 'checked_in', 'eliminated', 'winner', 'withdrawn')
  ),
  add constraint tournament_entries_visibility_check check (visibility in ('open', 'invite')),
  add constraint tournament_entries_join_code_check check (
    join_code is null or join_code ~ '^[A-Z0-9]{6}$'
  );

create unique index tournament_entries_join_code_idx
  on public.tournament_entries (join_code)
  where join_code is not null;

-- Le due policy non possono interrogarsi a vicenda: la lista degli iscritti
-- guarderebbe i membri, i membri guarderebbero gli iscritti e Postgres
-- rifiuterebbe la query per ricorsione infinita. La visibilita passa quindi da
-- funzioni `security definer`, che leggono le tabelle senza riapplicare le
-- policy.
create function public.tournament_is_visible(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tournaments tournament
    where tournament.id = p_tournament_id
      and tournament.is_public = true
      and tournament.status <> all (array['draft', 'cancelled'])
  );
$$;

create function public.entry_tournament_is_visible(p_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournament_entries entry
    join public.tournaments tournament on tournament.id = entry.tournament_id
    where entry.id = p_entry_id
      and tournament.is_public = true
      and tournament.status <> all (array['draft', 'cancelled'])
  );
$$;

create function public.match_tournament_is_visible(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches match
    join public.tournaments tournament on tournament.id = match.tournament_id
    where match.id = p_match_id
      and tournament.is_public = true
      and tournament.status <> all (array['draft', 'cancelled'])
  );
$$;

grant execute on function public.tournament_is_visible(uuid) to anon, authenticated;
grant execute on function public.entry_tournament_is_visible(uuid) to anon, authenticated;
grant execute on function public.match_tournament_is_visible(uuid) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4. Partite a N partecipanti
-- ---------------------------------------------------------------------------

alter table public.matches
  add column stage_number integer not null default 1;

alter table public.matches
  add constraint matches_stage_number_check check (stage_number > 0);

comment on column public.matches.stage_number is
  'Fase del torneo. Oggi sempre 1: i tornei a fasi (girone che qualifica a un tabellone) useranno questo campo senza cambiare schema.';

alter table public.matches
  drop constraint matches_tournament_id_round_number_bracket_position_key;
alter table public.matches
  add constraint matches_position_key
  unique (tournament_id, stage_number, round_number, bracket_position);

create table public.match_participants (
  id uuid primary key default extensions.gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  -- Nullo finche il posto non e assegnato: in un tabellone i posti del round
  -- successivo esistono prima di sapere chi li occupera.
  entry_id uuid references public.tournament_entries(id) on delete cascade,
  slot smallint not null check (slot > 0),
  score numeric,
  placement integer check (placement is null or placement > 0),
  outcome text check (outcome is null or outcome in ('win', 'draw', 'loss', 'dnf')),
  points_awarded numeric not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, slot)
);

comment on table public.match_participants is
  'Un posto in una partita. Due righe per un duello, quattro per una manche da quattro, una sola per un tentativo a tempo.';
comment on column public.match_participants.score is
  'Punti o tempo in secondi, secondo result_kind e score_direction del torneo.';
comment on column public.match_participants.points_awarded is
  'Punti di classifica generati da questa partita, gia applicata la tabella dei piazzamenti.';

create unique index match_participants_entry_idx
  on public.match_participants (match_id, entry_id)
  where entry_id is not null;
create index match_participants_entry_lookup_idx
  on public.match_participants (entry_id);

create trigger match_participants_set_updated_at before update on public.match_participants
  for each row execute function public.set_updated_at();

-- Travaso dei duelli esistenti: lo slot 1 e il vecchio lato A, lo slot 2 il
-- lato B. I punteggi stavano in `score_payload` come {"a": n, "b": n}.
insert into public.match_participants (match_id, entry_id, slot, score, placement, outcome)
select
  match.id,
  side.entry_id,
  side.slot,
  nullif(match.score_payload ->> side.key, '')::numeric,
  case
    when side.entry_id is null or match.status <> 'completed' or match.winner_entry_id is null then null
    when match.winner_entry_id = side.entry_id then 1
    else 2
  end,
  case
    when side.entry_id is null or match.status <> 'completed' or match.winner_entry_id is null then null
    when match.winner_entry_id = side.entry_id then 'win'
    else 'loss'
  end
from public.matches match
cross join lateral (
  values (1::smallint, 'a', match.entry_a_id), (2::smallint, 'b', match.entry_b_id)
) as side(slot, key, entry_id);

alter table public.match_participants enable row level security;

create policy match_participants_admin_all on public.match_participants
  for all
  using (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']))
  with check (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']));

create policy match_participants_public_select on public.match_participants
  for select
  using (public.match_tournament_is_visible(match_id));

revoke truncate, references, trigger on table public.match_participants from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Le squadre devono essere visibili a chi vuole entrarci
-- ---------------------------------------------------------------------------
--
-- Finora un iscritto vedeva soltanto la propria iscrizione. Con le squadre
-- aperte serve poter guardare la lista per scegliere dove entrare: si
-- espongono nome della squadra e nickname dei membri, mai i codici di invito,
-- che restano leggibili al solo capitano.

create policy tournament_entries_public_select on public.tournament_entries
  for select
  using (public.tournament_is_visible(tournament_id));

create policy tournament_members_public_select on public.tournament_entry_members
  for select
  using (public.entry_tournament_is_visible(entry_id));

-- Difetto trovato lavorando qui: la policy dei check-in confrontava
-- `member.entry_id` con se stesso, quindi la condizione era sempre vera e
-- qualunque utente autenticato leggeva i check-in di chiunque. Il confronto
-- corretto e con la riga del check-in.
drop policy if exists tournament_checkins_owner_select on public.tournament_checkins;
create policy tournament_checkins_owner_select on public.tournament_checkins
  for select
  using (exists (
    select 1 from public.tournament_entry_members member
    where member.entry_id = tournament_checkins.entry_id
      and member.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 6. View pubbliche
-- ---------------------------------------------------------------------------

drop view if exists public.public_tournaments;
create view public.public_tournaments as
  select
    tournament.id,
    tournament.event_id,
    tournament.platform_id,
    tournament.game_id,
    tournament.slug,
    tournament.name,
    tournament.description,
    tournament.rules,
    tournament.format,
    tournament.status,
    tournament.max_entries,
    tournament.entry_size,
    tournament.team_formation,
    tournament.group_size,
    tournament.rounds_count,
    tournament.result_kind,
    tournament.score_direction,
    tournament.standing_metric,
    tournament.heat_seeding,
    tournament.allow_draw,
    tournament.scoring_config,
    tournament.registration_opens_at,
    tournament.registration_closes_at,
    tournament.starts_at,
    tournament.checkin_required,
    tournament.ranking_enabled,
    tournament.is_public,
    tournament.created_at,
    tournament.updated_at
  from public.tournaments tournament
  where tournament.is_public = true
    and tournament.status <> all (array['draft', 'cancelled']);

drop view if exists public.public_tournament_matches;
create view public.public_tournament_matches as
  select
    match.id,
    match.tournament_id,
    match.stage_number,
    match.round_number,
    match.bracket_position,
    match.winner_entry_id,
    match.event_platform_id,
    match.status,
    match.scheduled_at,
    match.called_at,
    match.started_at,
    match.completed_at,
    match.next_match_id,
    match.next_match_slot
  from public.matches match
  join public.tournaments tournament on tournament.id = match.tournament_id
  where tournament.is_public = true
    and tournament.status <> all (array['draft', 'cancelled']);

create view public.public_match_participants as
  select
    participant.id,
    participant.match_id,
    match.tournament_id,
    participant.entry_id,
    participant.slot,
    participant.score,
    participant.placement,
    participant.outcome,
    participant.points_awarded
  from public.match_participants participant
  join public.matches match on match.id = participant.match_id
  join public.tournaments tournament on tournament.id = match.tournament_id
  where tournament.is_public = true
    and tournament.status <> all (array['draft', 'cancelled']);

drop view if exists public.public_tournament_entries;
create view public.public_tournament_entries as
  select
    entry.id,
    entry.tournament_id,
    entry.display_name,
    entry.seed,
    entry.status,
    entry.visibility,
    (select count(*) from public.tournament_entry_members member where member.entry_id = entry.id)::integer
      as members_count,
    entry.created_at,
    entry.updated_at
  from public.tournament_entries entry
  join public.tournaments tournament on tournament.id = entry.tournament_id
  where tournament.is_public = true
    and tournament.status <> all (array['draft', 'cancelled']);

-- Chi c'e dentro una squadra: solo nickname, come ovunque nell'app utente.
create view public.public_tournament_entry_members as
  select
    member.entry_id,
    entry.tournament_id,
    member.user_id,
    member.is_captain,
    profile.nickname,
    profile.display_name
  from public.tournament_entry_members member
  join public.tournament_entries entry on entry.id = member.entry_id
  join public.tournaments tournament on tournament.id = entry.tournament_id
  join public.profiles profile on profile.id = member.user_id
  where tournament.is_public = true
    and tournament.status <> all (array['draft', 'cancelled']);

grant select on public.public_tournaments to anon, authenticated;
grant select on public.public_tournament_matches to anon, authenticated;
grant select on public.public_match_participants to anon, authenticated;
grant select on public.public_tournament_entries to anon, authenticated;
grant select on public.public_tournament_entry_members to anon, authenticated;
