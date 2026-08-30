alter table public.tournaments
  drop constraint if exists tournaments_status_check;

alter table public.tournaments
  add constraint tournaments_status_check check (
    status in ('draft', 'registration_open', 'registration_closed', 'checkin', 'running', 'completed', 'cancelled')
  );

create or replace function public.prevent_duplicate_tournament_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
begin
  select tournament_id into v_tournament_id
  from public.tournament_entries
  where id = new.entry_id;

  if exists (
    select 1
    from public.tournament_entry_members member
    join public.tournament_entries entry on entry.id = member.entry_id
    where member.user_id = new.user_id
      and entry.tournament_id = v_tournament_id
      and member.entry_id <> new.entry_id
      and entry.status <> 'withdrawn'
  ) then
    raise exception using errcode = '23505', message = 'USER_ALREADY_IN_TOURNAMENT';
  end if;

  return new;
end;
$$;

drop trigger if exists tournament_entry_membership_guard on public.tournament_entry_members;
create trigger tournament_entry_membership_guard
  before insert or update on public.tournament_entry_members
  for each row execute function public.prevent_duplicate_tournament_membership();

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default false,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger notification_preferences_set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
create policy notification_preferences_owner_manage on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notify_booking_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message, action_url, metadata)
  values (
    new.user_id,
    case when new.status = 'confirmed' then 'booking_confirmed' else 'booking_waitlisted' end,
    case when new.status = 'confirmed' then 'Prenotazione confermata' else 'Lista d’attesa' end,
    case when new.status = 'confirmed'
      then 'La tua prenotazione è confermata. Trovi il QR nella tua area personale.'
      else 'La tua richiesta è stata inserita nella lista d’attesa.' end,
    '/app/prenotazioni/' || new.id::text,
    jsonb_build_object('booking_id', new.id, 'event_id', new.event_id)
  );
  return new;
end;
$$;

drop trigger if exists booking_created_notification on public.bookings;
create trigger booking_created_notification
  after insert on public.bookings
  for each row execute function public.notify_booking_created();

create or replace function public.notify_tournament_entry_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message, action_url, metadata)
  select new.user_id,
    'tournament_registered',
    'Iscrizione torneo registrata',
    format('La tua iscrizione a %s è stata registrata.', tournament.name),
    '/tornei/' || tournament.slug,
    jsonb_build_object('tournament_id', tournament.id, 'entry_id', new.entry_id)
  from public.tournament_entries entry
  join public.tournaments tournament on tournament.id = entry.tournament_id
  where entry.id = new.entry_id;
  return new;
end;
$$;

drop trigger if exists tournament_entry_created_notification on public.tournament_entry_members;
create trigger tournament_entry_created_notification
  after insert on public.tournament_entry_members
  for each row execute function public.notify_tournament_entry_created();

create or replace function public.upsert_notification_preferences(
  p_push_enabled boolean default false,
  p_email_enabled boolean default false
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_preferences public.notification_preferences%rowtype;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  insert into public.notification_preferences (user_id, push_enabled, email_enabled)
  values (auth.uid(), coalesce(p_push_enabled, false), coalesce(p_email_enabled, false))
  on conflict (user_id) do update set
    push_enabled = excluded.push_enabled,
    email_enabled = excluded.email_enabled
  returning * into v_preferences;
  return v_preferences;
end;
$$;

create or replace function public.upsert_push_subscription(
  p_provider text,
  p_provider_subscription_id text,
  p_device_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  if char_length(trim(coalesce(p_provider, ''))) not between 2 and 40
    or char_length(trim(coalesce(p_provider_subscription_id, ''))) not between 1 and 255
  then
    raise exception using errcode = '22023', message = 'INVALID_PUSH_SUBSCRIPTION';
  end if;
  insert into public.push_subscriptions (user_id, provider, provider_subscription_id, device_label, active)
  values (auth.uid(), trim(p_provider), trim(p_provider_subscription_id), nullif(trim(p_device_label), ''), true)
  on conflict (provider, provider_subscription_id) do update set
    user_id = excluded.user_id,
    device_label = excluded.device_label,
    active = true
  returning id into v_id;
  perform public.upsert_notification_preferences(true, false);
  return v_id;
end;
$$;

create or replace function public.deactivate_push_subscription(p_subscription_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  update public.push_subscriptions
  set active = false
  where id = p_subscription_id and user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.assign_match_station(
  p_match_id uuid,
  p_event_station_id uuid
)
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
    select 1 from public.event_stations station
    where station.id = p_event_station_id and station.event_id = v_tournament.event_id and station.active = true
  ) then
    raise exception using errcode = '23503', message = 'STATION_NOT_IN_EVENT';
  end if;
  update public.matches set event_station_id = p_event_station_id where id = p_match_id;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'assign_match_station', 'match', p_match_id, jsonb_build_object('event_station_id', p_event_station_id));
  return p_match_id;
end;
$$;

create or replace function public._award_tournament_points(p_tournament_id uuid, p_entry_id uuid, p_reason text, p_points integer)
returns void
language sql
security definer
set search_path = public, auth, extensions
as $$
  insert into public.ranking_points_ledger (user_id, activity_id, tournament_id, points, reason_code, description, created_by, metadata)
  select member.user_id, event_activity.activity_id, p_tournament_id, p_points, p_reason,
    case when p_reason = 'tournament_win' then 'Vittoria torneo' else 'Secondo posto torneo' end,
    auth.uid(), jsonb_build_object('entry_id', p_entry_id)
  from public.tournament_entry_members member
  join public.tournaments tournament on tournament.id = p_tournament_id
  left join public.event_activities event_activity on event_activity.id = tournament.event_activity_id
  where member.entry_id = p_entry_id
  on conflict (tournament_id, user_id, reason_code) where tournament_id is not null do nothing;
$$;

create or replace function public.call_tournament_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_match public.matches%rowtype;
  v_tournament public.tournaments%rowtype;
  v_notification_ids uuid[];
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  select * into v_match from public.matches where id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'MATCH_NOT_FOUND'; end if;
  select * into v_tournament from public.tournaments where id = v_match.tournament_id;

  if v_match.status in ('called', 'running') then
    select coalesce(array_agg(id order by created_at), '{}'::uuid[]) into v_notification_ids
    from public.notifications
    where metadata->>'match_id' = p_match_id::text;
    return jsonb_build_object('match_id', p_match_id, 'notification_ids', to_jsonb(v_notification_ids));
  end if;
  if v_match.status <> 'ready' or v_match.entry_a_id is null or v_match.entry_b_id is null then
    raise exception using errcode = 'P0001', message = 'MATCH_NOT_READY';
  end if;

  update public.matches set status = 'called', called_at = coalesce(called_at, now()) where id = p_match_id;
  insert into public.notifications (user_id, type, title, message, action_url, metadata)
  select distinct member.user_id,
    'tournament_match_called',
    'È il tuo turno',
    format('Presentati alla postazione per il match di %s.', v_tournament.name),
    '/tornei/' || v_tournament.slug,
    jsonb_build_object('match_id', p_match_id, 'tournament_id', v_tournament.id)
  from public.tournament_entry_members member
  where member.entry_id in (v_match.entry_a_id, v_match.entry_b_id);

  select coalesce(array_agg(id order by created_at), '{}'::uuid[]) into v_notification_ids
  from public.notifications
  where metadata->>'match_id' = p_match_id::text;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'call_match_players', 'match', p_match_id, jsonb_build_object('notification_ids', v_notification_ids));
  return jsonb_build_object('match_id', p_match_id, 'notification_ids', to_jsonb(v_notification_ids));
end;
$$;

create or replace function public.start_tournament_match(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  update public.matches
  set status = 'running', started_at = coalesce(started_at, now())
  where id = p_match_id and status = 'called';
  if not found then raise exception using errcode = 'P0001', message = 'MATCH_NOT_CALLED'; end if;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id)
  values (auth.uid(), 'start_match', 'match', p_match_id);
  return p_match_id;
end;
$$;

create or replace function public.amend_match_score(
  p_match_id uuid,
  p_score_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if not exists (select 1 from public.matches where id = p_match_id and status = 'completed') then
    raise exception using errcode = 'P0001', message = 'MATCH_NOT_COMPLETED';
  end if;
  update public.matches set score_payload = coalesce(p_score_payload, '{}'::jsonb) where id = p_match_id;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'amend_match_score', 'match', p_match_id, jsonb_build_object('score_payload', coalesce(p_score_payload, '{}'::jsonb)));
  return p_match_id;
end;
$$;

create or replace function public.adjust_ranking_points(
  p_user_id uuid,
  p_activity_id uuid,
  p_points integer,
  p_reason text,
  p_description text default null
)
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
  insert into public.ranking_points_ledger (user_id, activity_id, points, reason_code, description, created_by, metadata)
  values (p_user_id, p_activity_id, p_points, 'admin_adjustment', trim(p_description), auth.uid(), jsonb_build_object('reason', trim(p_reason)))
  returning id into v_id;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'adjust_ranking_points', 'ranking_points_ledger', v_id,
    jsonb_build_object('user_id', p_user_id, 'points', p_points, 'reason', trim(p_reason)));
  return v_id;
end;
$$;

create or replace function public.get_my_ranking_summary()
returns table (
  points integer,
  tournaments_played integer,
  wins integer,
  runner_ups integer
)
language sql
security definer
set search_path = public, auth
as $$
  select
    coalesce(sum(ledger.points), 0)::integer,
    count(distinct ledger.tournament_id)::integer,
    count(*) filter (where ledger.reason_code = 'tournament_win')::integer,
    count(*) filter (where ledger.reason_code = 'tournament_runner_up')::integer
  from public.ranking_points_ledger ledger
  where ledger.user_id = auth.uid();
$$;

create or replace view public.public_ranking_by_activity as
select
  ledger.activity_id,
  activity.name as activity_name,
  ledger.user_id,
  profile.display_name,
  sum(ledger.points)::integer as points,
  count(distinct ledger.tournament_id)::integer as tournaments_played
from public.ranking_points_ledger ledger
join public.profiles profile on profile.id = ledger.user_id and profile.is_public_profile = true
join public.tournaments tournament on tournament.id = ledger.tournament_id
  and tournament.is_public = true and tournament.ranking_enabled = true
left join public.activities activity on activity.id = ledger.activity_id
group by ledger.activity_id, activity.name, ledger.user_id, profile.display_name;

grant select on public.public_ranking_by_activity to anon, authenticated;
grant execute on function public.upsert_notification_preferences(boolean, boolean) to authenticated;
grant execute on function public.upsert_push_subscription(text, text, text) to authenticated;
grant execute on function public.deactivate_push_subscription(uuid) to authenticated;
grant execute on function public.assign_match_station(uuid, uuid) to authenticated;
grant execute on function public.call_tournament_match(uuid) to authenticated;
grant execute on function public.start_tournament_match(uuid) to authenticated;
grant execute on function public.amend_match_score(uuid, jsonb) to authenticated;
grant execute on function public.adjust_ranking_points(uuid, uuid, integer, text, text) to authenticated;
grant execute on function public.get_my_ranking_summary() to authenticated;
