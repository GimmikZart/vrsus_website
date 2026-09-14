-- Fase A, seconda parte: view pubbliche, RLS, grant e funzioni riscritte per il
-- dominio piattaforme/giochi.
--
-- Le tabelle create nella migration precedente nascono con i grant di default
-- verso anon e authenticated. Qui vengono revocati dove i dati non sono
-- pubblici (DEC-005) e sostituiti da view di proiezione.

-- ---------------------------------------------------------------------------
-- 1. Funzioni di supporto per le policy
-- ---------------------------------------------------------------------------

-- Le policy su games non possono interrogare direttamente platforms, che non
-- ha grant per authenticated: si usa una funzione security definer, come gia
-- fa is_public_event().
create function public.is_public_platform(p_platform_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platforms platform
    where platform.id = p_platform_id
      and platform.active = true
      and platform.internal = false
      and platform.archived_at is null
  );
$$;

revoke all on function public.is_public_platform(uuid) from public;
grant execute on function public.is_public_platform(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. RLS sulle nuove tabelle
-- ---------------------------------------------------------------------------

alter table public.games enable row level security;
alter table public.event_platform_games enable row level security;
alter table public.point_schemes enable row level security;
alter table public.point_scheme_rules enable row level security;
alter table public.game_scores enable row level security;
alter table public.board_posts enable row level security;
alter table public.board_poll_options enable row level security;
alter table public.board_poll_votes enable row level security;
alter table public.user_feedback enable row level security;
alter table public.guardian_consents enable row level security;
alter table public.profile_nickname_history enable row level security;

create policy games_public_read on public.games
  for select to anon, authenticated
  using (active = true and archived_at is null and public.is_public_platform(platform_id));

create policy games_admin_manage on public.games
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

create policy event_platform_games_admin_manage on public.event_platform_games
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

create policy point_schemes_read on public.point_schemes
  for select to anon, authenticated using (active = true);

create policy point_schemes_admin_manage on public.point_schemes
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

create policy point_scheme_rules_read on public.point_scheme_rules
  for select to anon, authenticated using (true);

create policy point_scheme_rules_admin_manage on public.point_scheme_rules
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

-- I punteggi li registra solo lo staff (DEC-023).
create policy game_scores_staff_manage on public.game_scores
  for all to authenticated
  using (public.has_any_role(array['staff', 'admin', 'super_admin']))
  with check (public.has_any_role(array['staff', 'admin', 'super_admin']));

create policy board_posts_admin_manage on public.board_posts
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

create policy board_poll_options_admin_manage on public.board_poll_options
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

create policy board_poll_votes_owner on public.board_poll_votes
  for select to authenticated using (user_id = auth.uid());

create policy board_poll_votes_insert on public.board_poll_votes
  for insert to authenticated with check (user_id = auth.uid());

create policy board_poll_votes_admin on public.board_poll_votes
  for select to authenticated
  using (public.has_any_role(array['admin', 'super_admin']));

create policy user_feedback_insert on public.user_feedback
  for insert to authenticated with check (user_id = auth.uid());

create policy user_feedback_owner_read on public.user_feedback
  for select to authenticated using (user_id = auth.uid());

create policy user_feedback_admin on public.user_feedback
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

-- guardian_consents e profile_nickname_history non hanno policy permissive:
-- nessun ruolo del browser vi accede direttamente. Passano da RPC security
-- definer e da endpoint service-role.

-- ---------------------------------------------------------------------------
-- 3. Grant e revoke
-- ---------------------------------------------------------------------------

revoke all on table public.platforms from anon, authenticated;
revoke all on table public.platform_categories from anon, authenticated;
revoke all on table public.event_platforms from anon, authenticated;
revoke all on table public.event_platform_games from anon, authenticated;
revoke all on table public.game_scores from anon, authenticated;
revoke all on table public.board_posts from anon, authenticated;
revoke all on table public.board_poll_options from anon, authenticated;
revoke all on table public.guardian_consents from anon, authenticated;
revoke all on table public.profile_nickname_history from anon, authenticated;

grant select on table public.games to anon, authenticated;
grant insert, update, delete on table public.games to authenticated;
grant select on table public.point_schemes to anon, authenticated;
grant insert, update, delete on table public.point_schemes to authenticated;
grant select on table public.point_scheme_rules to anon, authenticated;
grant insert, update, delete on table public.point_scheme_rules to authenticated;
grant select, insert on table public.board_poll_votes to authenticated;
grant select, insert on table public.user_feedback to authenticated;
grant update on table public.user_feedback to authenticated;

-- ---------------------------------------------------------------------------
-- 4. View pubbliche
-- ---------------------------------------------------------------------------

-- La capienza standard non viene mai proiettata in vetrina.
create view public.public_platforms as
  select
    platform.id,
    platform.slug,
    platform.name,
    platform.code,
    platform.description,
    platform.image_path,
    category.slug as category_slug,
    category.name as category_name
  from public.platforms platform
  left join public.platform_categories category on category.id = platform.category_id
  where platform.active = true
    and platform.internal = false
    and platform.archived_at is null
    and (category.id is null or category.active = true);

create view public.public_games as
  select
    game.id,
    game.platform_id,
    platform.slug as platform_slug,
    platform.name as platform_name,
    platform.code as platform_code,
    game.slug,
    game.name,
    game.genre,
    game.min_players,
    game.max_players,
    game.description,
    game.image_path
  from public.games game
  join public.platforms platform on platform.id = game.platform_id
  where game.active = true
    and game.archived_at is null
    and platform.active = true
    and platform.internal = false
    and platform.archived_at is null;

create view public.public_event_platforms as
  select
    event_platform.id,
    event_platform.event_id,
    coalesce(event_platform.public_name, platform.name) as name,
    coalesce(event_platform.description_override, platform.description) as description,
    platform.code,
    platform.image_path,
    category.slug as category_slug,
    category.name as category_name,
    event_platform.sort_order
  from public.event_platforms event_platform
  join public.events event on event.id = event_platform.event_id
  join public.platforms platform on platform.id = event_platform.platform_id
  left join public.platform_categories category on category.id = platform.category_id
  where event.is_public = true
    and event.status in ('scheduled', 'running', 'completed')
    and event.archived_at is null
    and event_platform.is_public = true
    and event_platform.active = true
    and platform.active = true
    and platform.internal = false
    and platform.archived_at is null;

create view public.public_event_platform_games as
  select
    link.event_platform_id,
    link.game_id,
    game.name as game_name,
    game.image_path,
    link.sort_order
  from public.event_platform_games link
  join public.public_event_platforms event_platform
    on event_platform.id = link.event_platform_id
  join public.public_games game on game.id = link.game_id
  where link.active = true;

-- Classifica generale a punti. Il nickname e uno pseudonimo: comparire in
-- classifica non richiede un profilo pubblico.
create view public.public_ranking as
  select
    ledger.user_id,
    profile.nickname,
    sum(ledger.points)::integer as points,
    count(distinct ledger.tournament_id)::integer as tournaments_played
  from public.ranking_points_ledger ledger
  join public.profiles profile on profile.id = ledger.user_id
  join public.tournaments tournament
    on tournament.id = ledger.tournament_id
   and tournament.is_public = true
   and tournament.ranking_enabled = true
  group by ledger.user_id, profile.nickname;

create view public.public_ranking_by_game as
  select
    ledger.game_id,
    game.name as game_name,
    game.platform_id,
    ledger.user_id,
    profile.nickname,
    sum(ledger.points)::integer as points,
    count(distinct ledger.tournament_id)::integer as tournaments_played
  from public.ranking_points_ledger ledger
  join public.profiles profile on profile.id = ledger.user_id
  join public.tournaments tournament
    on tournament.id = ledger.tournament_id
   and tournament.is_public = true
   and tournament.ranking_enabled = true
  left join public.games game on game.id = ledger.game_id
  group by ledger.game_id, game.name, game.platform_id, ledger.user_id, profile.nickname;

-- Record assoluto per gioco, ordinato secondo score_direction.
create view public.public_game_leaderboards as
  select
    score.game_id,
    game.platform_id,
    score.user_id,
    profile.nickname,
    case when game.score_direction = 'asc' then min(score.score) else max(score.score) end as best_score,
    count(*)::integer as attempts,
    max(score.recorded_at) as last_recorded_at
  from public.game_scores score
  join public.games game on game.id = score.game_id
  join public.profiles profile on profile.id = score.user_id
  where game.active = true and game.archived_at is null
  group by score.game_id, game.platform_id, game.score_direction, score.user_id, profile.nickname;

create view public.public_board_posts as
  select
    post.id,
    post.slug,
    post.title,
    post.body,
    post.post_type,
    post.image_path,
    post.pinned,
    post.published_at
  from public.board_posts post
  where post.status = 'published'
    and post.published_at is not null
    and post.published_at <= timezone('utc', now());

-- Conteggi aggregati dei sondaggi: mai l'identita dei votanti.
create view public.public_board_poll_options as
  select
    option.id,
    option.post_id,
    option.label,
    option.sort_order,
    count(vote.id)::integer as votes
  from public.board_poll_options option
  join public.public_board_posts post on post.id = option.post_id
  left join public.board_poll_votes vote on vote.option_id = option.id
  group by option.id, option.post_id, option.label, option.sort_order;

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

create view public.public_tournament_matches as
  select
    match.id,
    match.tournament_id,
    match.round_number,
    match.bracket_position,
    match.entry_a_id,
    match.entry_b_id,
    match.winner_entry_id,
    match.event_platform_id,
    match.status,
    match.scheduled_at,
    match.called_at,
    match.started_at,
    match.completed_at,
    match.score_payload,
    match.next_match_id,
    match.next_match_slot
  from public.matches match
  join public.tournaments tournament on tournament.id = match.tournament_id
  where tournament.is_public = true
    and tournament.status <> all (array['draft', 'cancelled']);

grant select on public.public_platforms to anon, authenticated;
grant select on public.public_games to anon, authenticated;
grant select on public.public_event_platforms to anon, authenticated;
grant select on public.public_event_platform_games to anon, authenticated;
grant select on public.public_ranking to anon, authenticated;
grant select on public.public_ranking_by_game to anon, authenticated;
grant select on public.public_game_leaderboards to anon, authenticated;
grant select on public.public_board_posts to anon, authenticated;
grant select on public.public_board_poll_options to anon, authenticated;
grant select on public.public_tournaments to anon, authenticated;
grant select on public.public_tournament_matches to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Funzioni che referenziavano gli oggetti rinominati o rimossi
-- ---------------------------------------------------------------------------

-- Il parametro cambia nome, quindi non basta create or replace.
drop function if exists public.assign_match_station(uuid, uuid);
create function public.assign_match_station(p_match_id uuid, p_event_platform_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_match public.matches%rowtype;
  v_tournament public.tournaments%rowtype;
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'MATCH_NOT_FOUND'; end if;
  select * into v_tournament from public.tournaments where id = v_match.tournament_id;
  if not exists (
    select 1 from public.event_platforms platform
    where platform.id = p_event_platform_id
      and platform.event_id = v_tournament.event_id
      and platform.active = true
  ) then
    raise exception using errcode = '23503', message = 'STATION_NOT_IN_EVENT';
  end if;
  update public.matches set event_platform_id = p_event_platform_id where id = p_match_id;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'assign_match_station', 'match', p_match_id,
    jsonb_build_object('event_platform_id', p_event_platform_id));
  return p_match_id;
end;
$$;

grant execute on function public.assign_match_station(uuid, uuid) to authenticated;

drop function if exists public.adjust_ranking_points(uuid, uuid, integer, text, text);
create function public.adjust_ranking_points(
  p_user_id uuid, p_game_id uuid, p_points integer, p_reason text, p_description text default null)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_id uuid;
begin
  if not public.has_any_role(array['admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if p_points is null or p_points = 0 or char_length(trim(coalesce(p_reason, ''))) < 2 then
    raise exception using errcode = '22023', message = 'INVALID_RANKING_ADJUSTMENT';
  end if;
  insert into public.ranking_points_ledger (user_id, game_id, points, reason_code, description, created_by, metadata)
  values (p_user_id, p_game_id, p_points, 'admin_adjustment', trim(p_description), auth.uid(),
    jsonb_build_object('reason', trim(p_reason)))
  returning id into v_id;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'adjust_ranking_points', 'ranking_points_ledger', v_id,
    jsonb_build_object('user_id', p_user_id, 'points', p_points, 'reason', trim(p_reason)));
  return v_id;
end;
$$;

revoke all on function public.adjust_ranking_points(uuid, uuid, integer, text, text) from public, anon;
grant execute on function public.adjust_ranking_points(uuid, uuid, integer, text, text) to authenticated;
