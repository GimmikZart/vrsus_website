create table public.tournaments (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  event_activity_id uuid references public.event_activities(id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 180),
  description text,
  rules text,
  format text not null default 'single_elimination' check (format in ('single_elimination')),
  status text not null default 'draft' check (status in ('draft', 'registration_open', 'registration_closed', 'running', 'completed', 'cancelled')),
  max_entries integer check (max_entries is null or max_entries > 1),
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  starts_at timestamptz,
  checkin_required boolean not null default true,
  ranking_enabled boolean not null default true,
  requires_event_booking boolean not null default false,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournaments_registration_window_check check (
    registration_closes_at is null
    or registration_opens_at is null
    or registration_closes_at >= registration_opens_at
  )
);

create unique index tournaments_event_slug_idx on public.tournaments (event_id, slug);
create index tournaments_public_status_idx on public.tournaments (is_public, status, starts_at);

create table public.tournament_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 180),
  seed integer check (seed is null or seed > 0),
  status text not null default 'registered' check (status in ('registered', 'checked_in', 'eliminated', 'winner', 'withdrawn')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index tournament_entries_tournament_status_idx on public.tournament_entries (tournament_id, status, created_at);

create table public.tournament_entry_members (
  entry_id uuid not null references public.tournament_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_captain boolean not null default false,
  primary key (entry_id, user_id)
);

create unique index tournament_entry_one_active_user_idx
  on public.tournament_entry_members (user_id, entry_id);

create table public.tournament_checkins (
  id uuid primary key default extensions.gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  entry_id uuid not null references public.tournament_entries(id) on delete cascade,
  checked_in_at timestamptz not null default timezone('utc', now()),
  checked_in_by uuid references public.profiles(id) on delete set null,
  unique (tournament_id, entry_id)
);

create index tournament_checkins_tournament_idx on public.tournament_checkins (tournament_id, checked_in_at);

create table public.matches (
  id uuid primary key default extensions.gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  bracket_position integer not null check (bracket_position > 0),
  entry_a_id uuid references public.tournament_entries(id) on delete set null,
  entry_b_id uuid references public.tournament_entries(id) on delete set null,
  winner_entry_id uuid references public.tournament_entries(id) on delete set null,
  event_station_id uuid references public.event_stations(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'called', 'running', 'completed', 'cancelled')),
  scheduled_at timestamptz,
  called_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  score_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(score_payload) = 'object'),
  next_match_id uuid references public.matches(id) on delete set null,
  next_match_slot text check (next_match_slot is null or next_match_slot in ('a', 'b')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tournament_id, round_number, bracket_position),
  constraint matches_winner_belongs_check check (winner_entry_id is null or winner_entry_id = entry_a_id or winner_entry_id = entry_b_id)
);

create index matches_tournament_round_idx on public.matches (tournament_id, round_number, bracket_position);

create table public.ranking_points_ledger (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  activity_id uuid references public.activities(id) on delete set null,
  tournament_id uuid references public.tournaments(id) on delete set null,
  points integer not null check (points <> 0),
  reason_code text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create unique index ranking_tournament_user_reason_idx
  on public.ranking_points_ledger (tournament_id, user_id, reason_code)
  where tournament_id is not null;
create index ranking_user_points_idx on public.ranking_points_ledger (user_id, created_at desc);

create trigger tournaments_set_updated_at before update on public.tournaments
  for each row execute function public.set_updated_at();
create trigger tournament_entries_set_updated_at before update on public.tournament_entries
  for each row execute function public.set_updated_at();
create trigger matches_set_updated_at before update on public.matches
  for each row execute function public.set_updated_at();

alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_entry_members enable row level security;
alter table public.tournament_checkins enable row level security;
alter table public.matches enable row level security;
alter table public.ranking_points_ledger enable row level security;

create policy tournaments_public_select on public.tournaments
  for select to anon, authenticated
  using (is_public = true and status not in ('draft', 'cancelled'));
create policy tournaments_staff_select on public.tournaments
  for select to authenticated
  using (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']));
create policy tournaments_admin_write on public.tournaments
  for all to authenticated
  using (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']))
  with check (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']));

create policy tournament_entries_owner_select on public.tournament_entries
  for select to authenticated
  using (exists (select 1 from public.tournament_entry_members member where member.entry_id = id and member.user_id = auth.uid()));
create policy tournament_entries_admin_select on public.tournament_entries
  for select to authenticated
  using (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']));

create policy tournament_members_owner_select on public.tournament_entry_members
  for select to authenticated
  using (user_id = auth.uid());
create policy tournament_members_admin_select on public.tournament_entry_members
  for select to authenticated
  using (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']));

create policy tournament_checkins_owner_select on public.tournament_checkins
  for select to authenticated
  using (exists (select 1 from public.tournament_entry_members member where member.entry_id = entry_id and member.user_id = auth.uid()));
create policy tournament_checkins_admin_all on public.tournament_checkins
  for all to authenticated
  using (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']))
  with check (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']));

create policy matches_public_select on public.matches
  for select to anon, authenticated
  using (exists (select 1 from public.tournaments tournament where tournament.id = tournament_id and tournament.is_public = true and tournament.status not in ('draft', 'cancelled')));
create policy matches_admin_all on public.matches
  for all to authenticated
  using (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']))
  with check (public.has_any_role(array['tournament_admin', 'admin', 'super_admin']));

create policy ranking_public_select on public.ranking_points_ledger
  for select to anon, authenticated
  using (exists (select 1 from public.tournaments tournament where tournament.id = tournament_id and tournament.is_public = true and tournament.ranking_enabled = true));
create policy ranking_admin_all on public.ranking_points_ledger
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

create or replace view public.public_tournaments as
select
  tournament.id,
  tournament.event_id,
  tournament.event_activity_id,
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
  and tournament.status not in ('draft', 'cancelled');

create or replace view public.public_tournament_matches as
select
  match.id,
  match.tournament_id,
  match.round_number,
  match.bracket_position,
  match.entry_a_id,
  match.entry_b_id,
  match.winner_entry_id,
  match.event_station_id,
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
  and tournament.status not in ('draft', 'cancelled');

create or replace view public.public_tournament_entries as
select
  entry.id,
  entry.tournament_id,
  entry.display_name,
  entry.seed,
  entry.status,
  entry.created_at,
  entry.updated_at
from public.tournament_entries entry
join public.tournaments tournament on tournament.id = entry.tournament_id
where tournament.is_public = true
  and tournament.status not in ('draft', 'cancelled');

create or replace view public.public_ranking as
select
  ledger.user_id,
  profile.display_name,
  sum(ledger.points)::integer as points,
  count(distinct ledger.tournament_id)::integer as tournaments_played
from public.ranking_points_ledger ledger
join public.profiles profile on profile.id = ledger.user_id and profile.is_public_profile = true
join public.tournaments tournament on tournament.id = ledger.tournament_id and tournament.is_public = true and tournament.ranking_enabled = true
group by ledger.user_id, profile.display_name;

create or replace function public.register_tournament_entry(p_tournament_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_tournament public.tournaments%rowtype;
  v_profile public.profiles%rowtype;
  v_entry_id uuid;
  v_count integer;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'TOURNAMENT_NOT_FOUND'; end if;
  if v_tournament.status <> 'registration_open'
    or (v_tournament.registration_opens_at is not null and now() < v_tournament.registration_opens_at)
    or (v_tournament.registration_closes_at is not null and now() > v_tournament.registration_closes_at)
  then raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED'; end if;
  if exists (
    select 1 from public.tournament_entry_members member
    join public.tournament_entries entry on entry.id = member.entry_id
    where entry.tournament_id = p_tournament_id and member.user_id = v_user_id and entry.status not in ('withdrawn', 'eliminated')
  ) then raise exception using errcode = '23505', message = 'ALREADY_REGISTERED'; end if;
  select count(*) into v_count from public.tournament_entries where tournament_id = p_tournament_id and status <> 'withdrawn';
  if v_tournament.max_entries is not null and v_count >= v_tournament.max_entries then
    raise exception using errcode = 'P0001', message = 'TOURNAMENT_FULL';
  end if;
  if v_tournament.requires_event_booking and not exists (
    select 1 from public.bookings booking where booking.event_id = v_tournament.event_id and booking.user_id = v_user_id and booking.status = 'confirmed'
  ) then
    perform public.create_event_booking(v_tournament.event_id);
  end if;
  select * into v_profile from public.profiles where id = v_user_id;
  insert into public.tournament_entries (tournament_id, display_name)
  values (p_tournament_id, coalesce(v_profile.display_name, 'Partecipante'))
  returning id into v_entry_id;
  insert into public.tournament_entry_members (entry_id, user_id, is_captain)
  values (v_entry_id, v_user_id, true);
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'register', 'tournament_entry', v_entry_id, jsonb_build_object('tournament_id', p_tournament_id));
  return v_entry_id;
end;
$$;

create or replace function public.withdraw_tournament_entry(p_tournament_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_entry_id uuid;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select entry.id into v_entry_id
  from public.tournament_entries entry
  join public.tournament_entry_members member on member.entry_id = entry.id
  where entry.tournament_id = p_tournament_id and member.user_id = auth.uid() and entry.status in ('registered', 'checked_in');
  if v_entry_id is null then raise exception using errcode = 'P0002', message = 'ENTRY_NOT_FOUND'; end if;
  if exists (select 1 from public.matches match where match.tournament_id = p_tournament_id and match.status not in ('pending', 'ready') and (match.entry_a_id = v_entry_id or match.entry_b_id = v_entry_id)) then
    raise exception using errcode = 'P0001', message = 'BRACKET_STARTED';
  end if;
  update public.tournament_entries set status = 'withdrawn' where id = v_entry_id;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'withdraw', 'tournament_entry', v_entry_id, jsonb_build_object('tournament_id', p_tournament_id));
  return true;
end;
$$;

create or replace function public.check_in_tournament_entry(p_entry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_entry public.tournament_entries%rowtype; v_allowed boolean;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select entry.* into v_entry from public.tournament_entries entry where entry.id = p_entry_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'ENTRY_NOT_FOUND'; end if;
  select exists (select 1 from public.tournament_entry_members member where member.entry_id = p_entry_id and member.user_id = auth.uid()) or public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) into v_allowed;
  if not v_allowed then raise exception using errcode = '42501', message = 'FORBIDDEN'; end if;
  if exists (select 1 from public.tournament_checkins where entry_id = p_entry_id) then return true; end if;
  insert into public.tournament_checkins (tournament_id, entry_id, checked_in_by) values (v_entry.tournament_id, p_entry_id, auth.uid());
  update public.tournament_entries set status = 'checked_in' where id = p_entry_id and status = 'registered';
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'tournament_checkin', 'tournament_entry', p_entry_id, jsonb_build_object('tournament_id', v_entry.tournament_id));
  return true;
end;
$$;

create or replace function public._advance_tournament_winner(p_match_id uuid, p_winner_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_match public.matches%rowtype; v_next public.matches%rowtype;
begin
  select * into v_match from public.matches where id = p_match_id for update;
  if v_match.next_match_id is null then
    update public.tournament_entries set status = 'winner' where id = p_winner_entry_id;
    update public.tournaments set status = 'completed' where id = v_match.tournament_id;
    return;
  end if;
  select * into v_next from public.matches where id = v_match.next_match_id for update;
  if v_match.next_match_slot = 'a' then
    update public.matches set entry_a_id = p_winner_entry_id where id = v_next.id;
  else
    update public.matches set entry_b_id = p_winner_entry_id where id = v_next.id;
  end if;
  select * into v_next from public.matches where id = v_next.id for update;
  if v_next.entry_a_id is not null and v_next.entry_b_id is not null then
    update public.matches set status = 'ready' where id = v_next.id;
  elsif v_next.entry_a_id is not null or v_next.entry_b_id is not null then
    update public.matches set winner_entry_id = coalesce(v_next.entry_a_id, v_next.entry_b_id), status = 'completed', completed_at = now() where id = v_next.id;
    perform public._advance_tournament_winner(v_next.id, coalesce(v_next.entry_a_id, v_next.entry_b_id));
  end if;
end;
$$;

create or replace function public._award_tournament_points(p_tournament_id uuid, p_entry_id uuid, p_reason text, p_points integer)
returns void
language sql
security definer
set search_path = public, auth, extensions
as $$
  insert into public.ranking_points_ledger (user_id, activity_id, tournament_id, points, reason_code, description, created_by, metadata)
  select member.user_id, tournament.event_activity_id, p_tournament_id, p_points, p_reason,
    case when p_reason = 'tournament_win' then 'Vittoria torneo' else 'Secondo posto torneo' end,
    auth.uid(), jsonb_build_object('entry_id', p_entry_id)
  from public.tournament_entry_members member
  join public.tournaments tournament on tournament.id = p_tournament_id
  where member.entry_id = p_entry_id
  on conflict (tournament_id, user_id, reason_code) where tournament_id is not null do nothing;
$$;

create or replace function public.create_single_elimination_bracket(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_entries uuid[];
  v_count integer;
  v_slots integer := 2;
  v_rounds integer := 1;
  v_round integer;
  v_position integer;
  v_matches integer;
  v_match_id uuid;
  v_next_id uuid;
  v_a uuid;
  v_b uuid;
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then raise exception using errcode = '42501', message = 'FORBIDDEN'; end if;
  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'TOURNAMENT_NOT_FOUND'; end if;
  if exists (select 1 from public.matches where tournament_id = p_tournament_id and status not in ('pending', 'ready')) then raise exception using errcode = 'P0001', message = 'BRACKET_STARTED'; end if;
  select array_agg(entry.id order by entry.seed nulls last, entry.created_at, entry.id)
    into v_entries from public.tournament_entries entry
    where entry.tournament_id = p_tournament_id
      and entry.status in (case when v_tournament.checkin_required then 'checked_in' else 'registered' end, 'checked_in');
  v_count := coalesce(array_length(v_entries, 1), 0);
  if v_count < 2 then raise exception using errcode = 'P0001', message = 'NOT_ENOUGH_ENTRIES'; end if;
  while v_slots < v_count loop v_slots := v_slots * 2; v_rounds := v_rounds + 1; end loop;
  if exists (select 1 from public.matches where tournament_id = p_tournament_id) then
    select count(*) into v_matches from public.matches where tournament_id = p_tournament_id;
    return v_matches;
  end if;
  for v_round in 1..v_rounds loop
    for v_position in 1..(v_slots / (2 ^ v_round)) loop
      v_a := null; v_b := null;
      if v_round = 1 then
        if ((v_position * 2) - 1) <= v_count then v_a := v_entries[(v_position * 2) - 1]; end if;
        if (v_position * 2) <= v_count then v_b := v_entries[v_position * 2]; end if;
      end if;
      insert into public.matches (tournament_id, round_number, bracket_position, entry_a_id, entry_b_id, status)
      values (p_tournament_id, v_round, v_position, v_a, v_b,
        case when v_a is not null and v_b is not null then 'ready' when v_a is not null or v_b is not null then 'completed' else 'pending' end);
    end loop;
  end loop;
  for v_round in 1..(v_rounds - 1) loop
    for v_match_id, v_position in select id, bracket_position from public.matches where tournament_id = p_tournament_id and round_number = v_round loop
      select id into v_next_id from public.matches where tournament_id = p_tournament_id and round_number = v_round + 1 and bracket_position = ceil(v_position / 2.0);
      update public.matches set next_match_id = v_next_id, next_match_slot = case when mod(v_position, 2) = 1 then 'a' else 'b' end where id = v_match_id;
    end loop;
  end loop;
  for v_round in 1..v_rounds loop
    for v_match_id, v_a, v_b in select id, entry_a_id, entry_b_id from public.matches where tournament_id = p_tournament_id and round_number = v_round and status = 'completed' and winner_entry_id is null loop
      update public.matches set winner_entry_id = coalesce(v_a, v_b), completed_at = now() where id = v_match_id;
      perform public._advance_tournament_winner(v_match_id, coalesce(v_a, v_b));
    end loop;
  end loop;
  update public.tournaments set status = 'running' where id = p_tournament_id;
  select count(*) into v_matches from public.matches where tournament_id = p_tournament_id;
  return v_matches;
end;
$$;

create or replace function public.record_match_result(p_match_id uuid, p_score_payload jsonb, p_winner_entry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_match public.matches%rowtype;
  v_tournament public.tournaments%rowtype;
  v_loser_id uuid;
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then raise exception using errcode = '42501', message = 'FORBIDDEN'; end if;
  select match.* into v_match from public.matches match where match.id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'MATCH_NOT_FOUND'; end if;
  if v_match.status not in ('ready', 'called', 'running') then raise exception using errcode = 'P0001', message = 'MATCH_NOT_PLAYABLE'; end if;
  if p_winner_entry_id is null or p_winner_entry_id not in (v_match.entry_a_id, v_match.entry_b_id) then raise exception using errcode = 'P0001', message = 'WINNER_NOT_IN_MATCH'; end if;
  v_loser_id := case when p_winner_entry_id = v_match.entry_a_id then v_match.entry_b_id else v_match.entry_a_id end;
  update public.matches set winner_entry_id = p_winner_entry_id, score_payload = coalesce(p_score_payload, '{}'::jsonb), status = 'completed', completed_at = now() where id = p_match_id;
  update public.tournament_entries set status = 'eliminated' where id = v_loser_id and status <> 'winner';
  select * into v_tournament from public.tournaments where id = v_match.tournament_id;
  if v_match.round_number = (select max(round_number) from public.matches where tournament_id = v_match.tournament_id) then
    update public.tournament_entries set status = 'winner' where id = p_winner_entry_id;
    update public.tournaments set status = 'completed' where id = v_match.tournament_id;
    if v_tournament.ranking_enabled then
      perform public._award_tournament_points(v_match.tournament_id, p_winner_entry_id, 'tournament_win', 100);
      if v_loser_id is not null then perform public._award_tournament_points(v_match.tournament_id, v_loser_id, 'tournament_runner_up', 60); end if;
    end if;
  else
    perform public._advance_tournament_winner(p_match_id, p_winner_entry_id);
  end if;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'record_match_result', 'match', p_match_id, jsonb_build_object('winner_entry_id', p_winner_entry_id, 'score_payload', coalesce(p_score_payload, '{}'::jsonb)));
  return p_match_id;
end;
$$;

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.event_checkins;

grant select on public.public_tournaments, public.public_tournament_entries, public.public_tournament_matches, public.public_ranking to anon, authenticated;
grant execute on function public.register_tournament_entry(uuid) to authenticated;
grant execute on function public.withdraw_tournament_entry(uuid) to authenticated;
grant execute on function public.check_in_tournament_entry(uuid) to authenticated;
grant execute on function public.create_single_elimination_bracket(uuid) to authenticated;
grant execute on function public.record_match_result(uuid, jsonb, uuid) to authenticated;
revoke all on function public._advance_tournament_winner(uuid, uuid) from public, anon, authenticated;
revoke all on function public._award_tournament_points(uuid, uuid, text, integer) from public, anon, authenticated;
