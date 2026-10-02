-- Event booking is a separate, explicit step before tournament registration.
-- A waitlisted booking does not grant tournament access.
update public.tournaments
set requires_event_booking = true
where event_id is not null and not requires_event_booking;

alter table public.tournaments
  alter column requires_event_booking set default true;

alter table public.tournaments
  add constraint tournaments_event_booking_required
  check (event_id is null or requires_event_booking);

-- Also cover staff/service-role inserts and serialize with cancellation.
create function public.require_event_booking_for_tournament_member()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_event_id uuid;
begin
  select tournament.event_id into v_event_id
  from public.tournament_entries entry
  join public.tournaments tournament on tournament.id = entry.tournament_id
  where entry.id = new.entry_id;

  if v_event_id is not null and not exists (
    select 1 from public.bookings booking
    where booking.event_id = v_event_id
      and booking.user_id = new.user_id
      and booking.status = 'confirmed'
    for share
  ) then
    raise exception using errcode = 'P0001', message = 'EVENT_BOOKING_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger tournament_member_requires_event_booking
before insert or update of entry_id, user_id on public.tournament_entry_members
for each row execute function public.require_event_booking_for_tournament_member();


create or replace function public.create_tournament_team(
  p_tournament_id uuid, p_name text default null, p_visibility text default 'open')
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
  v_visibility text := coalesce(nullif(p_visibility, ''), 'open');
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'TOURNAMENT_NOT_FOUND';
  end if;
  if v_tournament.entry_size = 1 then
    raise exception using errcode = 'P0001', message = 'SOLO_TOURNAMENT';
  end if;
  if v_tournament.team_formation = 'admin' then
    raise exception using errcode = 'P0001', message = 'TEAMS_MANAGED_BY_STAFF';
  end if;
  if v_tournament.status <> 'registration_open'
    or (v_tournament.registration_opens_at is not null and now() < v_tournament.registration_opens_at)
    or (v_tournament.registration_closes_at is not null and now() > v_tournament.registration_closes_at)
  then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;
  if v_tournament.team_formation = 'open' then
    v_visibility := 'open';
  end if;

  if exists (
    select 1 from public.tournament_entry_members member
    join public.tournament_entries entry on entry.id = member.entry_id
    where entry.tournament_id = p_tournament_id
      and member.user_id = v_user_id
      and entry.status not in ('withdrawn', 'eliminated')
  ) then
    raise exception using errcode = '23505', message = 'ALREADY_REGISTERED';
  end if;

  select count(*) into v_count from public.tournament_entries
  where tournament_id = p_tournament_id and status <> 'withdrawn';
  if v_tournament.max_entries is not null and v_count >= v_tournament.max_entries then
    raise exception using errcode = 'P0001', message = 'TOURNAMENT_FULL';
  end if;

  if v_tournament.event_id is not null and not exists (
    select 1 from public.bookings booking
    where booking.event_id = v_tournament.event_id
      and booking.user_id = v_user_id and booking.status = 'confirmed'
  ) then
    raise exception using errcode = 'P0001', message = 'EVENT_BOOKING_REQUIRED';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;

  insert into public.tournament_entries (tournament_id, display_name, status, visibility, join_code)
  values (
    p_tournament_id,
    coalesce(nullif(trim(coalesce(p_name, '')), ''),
      'Squadra di ' || coalesce(v_profile.nickname, v_profile.display_name, 'VRSUS')),
    'forming',
    v_visibility,
    case when v_visibility = 'invite' then public._generate_join_code() else null end)
  returning id into v_entry_id;

  insert into public.tournament_entry_members (entry_id, user_id, is_captain)
  values (v_entry_id, v_user_id, true);

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'create_team', 'tournament_entry', v_entry_id,
    jsonb_build_object('tournament_id', p_tournament_id, 'visibility', v_visibility));

  return v_entry_id;
end;
$$;

create or replace function public.join_tournament_team(
  p_entry_id uuid default null, p_code text default null)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry public.tournament_entries%rowtype;
  v_tournament public.tournaments%rowtype;
  v_members integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  if p_code is not null and p_code <> '' then
    select * into v_entry from public.tournament_entries
    where join_code = upper(trim(p_code)) for update;
  else
    select * into v_entry from public.tournament_entries where id = p_entry_id for update;
  end if;

  if not found then
    raise exception using errcode = 'P0002', message = 'TEAM_NOT_FOUND';
  end if;

  select * into v_tournament from public.tournaments where id = v_entry.tournament_id;

  if v_tournament.status <> 'registration_open' then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;
  -- Una squadra a invito si raggiunge solo col codice: conoscerne l'id non basta.
  if v_entry.visibility = 'invite' and (p_code is null or p_code = '') then
    raise exception using errcode = '42501', message = 'CODE_REQUIRED';
  end if;
  if v_entry.status = 'withdrawn' then
    raise exception using errcode = 'P0001', message = 'TEAM_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.tournament_entry_members member
    join public.tournament_entries entry on entry.id = member.entry_id
    where entry.tournament_id = v_entry.tournament_id
      and member.user_id = v_user_id
      and entry.status not in ('withdrawn', 'eliminated')
  ) then
    raise exception using errcode = '23505', message = 'ALREADY_REGISTERED';
  end if;

  select count(*) into v_members from public.tournament_entry_members where entry_id = v_entry.id;
  if v_members >= v_tournament.entry_size then
    raise exception using errcode = 'P0001', message = 'TEAM_FULL';
  end if;

  if v_tournament.event_id is not null and not exists (
    select 1 from public.bookings booking
    where booking.event_id = v_tournament.event_id
      and booking.user_id = v_user_id and booking.status = 'confirmed'
  ) then
    raise exception using errcode = 'P0001', message = 'EVENT_BOOKING_REQUIRED';
  end if;

  insert into public.tournament_entry_members (entry_id, user_id, is_captain)
  values (v_entry.id, v_user_id, false);

  -- Squadra al completo: da qui in poi e un'iscrizione a tutti gli effetti.
  if v_members + 1 >= v_tournament.entry_size then
    update public.tournament_entries set status = 'registered'
    where id = v_entry.id and status = 'forming';
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'join_team', 'tournament_entry', v_entry.id,
    jsonb_build_object('tournament_id', v_entry.tournament_id));

  return v_entry.id;
end;
$$;

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
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'TOURNAMENT_NOT_FOUND';
  end if;
  if v_tournament.entry_size > 1 then
    raise exception using errcode = 'P0001', message = 'TEAM_TOURNAMENT';
  end if;
  if v_tournament.status <> 'registration_open'
    or (v_tournament.registration_opens_at is not null and now() < v_tournament.registration_opens_at)
    or (v_tournament.registration_closes_at is not null and now() > v_tournament.registration_closes_at)
  then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;
  if exists (
    select 1 from public.tournament_entry_members member
    join public.tournament_entries entry on entry.id = member.entry_id
    where entry.tournament_id = p_tournament_id
      and member.user_id = v_user_id
      and entry.status not in ('withdrawn', 'eliminated')
  ) then
    raise exception using errcode = '23505', message = 'ALREADY_REGISTERED';
  end if;

  select count(*) into v_count from public.tournament_entries
  where tournament_id = p_tournament_id and status <> 'withdrawn';
  if v_tournament.max_entries is not null and v_count >= v_tournament.max_entries then
    raise exception using errcode = 'P0001', message = 'TOURNAMENT_FULL';
  end if;

  if v_tournament.event_id is not null and not exists (
    select 1 from public.bookings booking
    where booking.event_id = v_tournament.event_id
      and booking.user_id = v_user_id and booking.status = 'confirmed'
  ) then
    raise exception using errcode = 'P0001', message = 'EVENT_BOOKING_REQUIRED';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;

  insert into public.tournament_entries (tournament_id, display_name)
  values (p_tournament_id, coalesce(v_profile.nickname, v_profile.display_name, 'Partecipante'))
  returning id into v_entry_id;

  insert into public.tournament_entry_members (entry_id, user_id, is_captain)
  values (v_entry_id, v_user_id, true);

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'register', 'tournament_entry', v_entry_id,
    jsonb_build_object('tournament_id', p_tournament_id));

  return v_entry_id;
end;
$$;

create or replace function public.cancel_event_booking(p_booking_id uuid)
returns table (booking_id uuid, promoted_count integer)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  booking_row public.bookings%rowtype;
  was_confirmed boolean;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select *
  into booking_row
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  if booking_row.user_id <> auth.uid()
    and not public.has_any_role(array['admin', 'super_admin']) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if booking_row.status not in ('confirmed', 'waitlisted') then
    raise exception 'BOOKING_NOT_CANCELLABLE' using errcode = 'P0001';
  end if;

  -- Keep event booking and active tournament membership in sync.
  if booking_row.status = 'confirmed' and exists (
    select 1
    from public.tournaments tournament
    join public.tournament_entries entry on entry.tournament_id = tournament.id
    join public.tournament_entry_members member on member.entry_id = entry.id
    where tournament.event_id = booking_row.event_id
      and member.user_id = booking_row.user_id
      and entry.status not in ('withdrawn', 'eliminated')
      and tournament.status not in ('completed', 'cancelled')
  ) then
    raise exception using errcode = 'P0001', message = 'TOURNAMENT_ENTRY_ACTIVE';
  end if;
  was_confirmed := booking_row.status = 'confirmed';

  update public.bookings
  set status = 'cancelled',
      cancelled_at = timezone('utc', now()),
      qr_token_hash = null,
      qr_issued_at = null
  where id = p_booking_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(),
    case when booking_row.user_id = auth.uid() then 'booking_cancelled' else 'booking_cancelled_by_admin' end,
    'booking',
    p_booking_id,
    jsonb_build_object('status', booking_row.status),
    jsonb_build_object('status', 'cancelled', 'event_id', booking_row.event_id)
  );

  if was_confirmed then
    promoted_count := public._promote_waitlist_for_event(booking_row.event_id);
  else
    promoted_count := 0;
  end if;

  return query select p_booking_id, promoted_count;
end;
$$;
