-- Event administration workflows: archive and duplicate a prior event setup.

create or replace function public.duplicate_event(
  p_source_event_id uuid,
  p_new_slug text,
  p_new_title text,
  p_new_starts_at timestamptz,
  p_new_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  source_event public.events%rowtype;
  new_event_id uuid;
begin
  if not public.has_any_role(array['admin', 'super_admin']) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_new_slug is null
    or p_new_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(trim(p_new_slug)) > 180
    or p_new_title is null
    or char_length(trim(p_new_title)) not between 1 and 180
    or p_new_starts_at is null
    or p_new_ends_at is null
    or p_new_ends_at <= p_new_starts_at then
    raise exception 'INVALID_EVENT_DUPLICATE' using errcode = 'P0001';
  end if;

  select *
  into source_event
  from public.events
  where id = p_source_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.events (
    slug,
    title,
    short_description,
    description,
    status,
    is_public,
    starts_at,
    ends_at,
    booking_opens_at,
    booking_closes_at,
    booking_enabled,
    venue_name,
    venue_address,
    venue_notes,
    price_cents,
    payment_required,
    max_capacity,
    capacity_visibility,
    waitlist_enabled,
    cover_image_path,
    seo_title,
    seo_description
  )
  values (
    trim(p_new_slug),
    trim(p_new_title),
    source_event.short_description,
    source_event.description,
    'draft',
    false,
    p_new_starts_at,
    p_new_ends_at,
    null,
    null,
    source_event.booking_enabled,
    source_event.venue_name,
    source_event.venue_address,
    source_event.venue_notes,
    source_event.price_cents,
    source_event.payment_required,
    source_event.max_capacity,
    source_event.capacity_visibility,
    source_event.waitlist_enabled,
    source_event.cover_image_path,
    source_event.seo_title,
    source_event.seo_description
  )
  returning id into new_event_id;

  insert into public.event_stations (
    event_id,
    station_id,
    public_name,
    description_override,
    capacity_override,
    is_public,
    active,
    sort_order,
    metadata
  )
  select
    new_event_id,
    event_station.station_id,
    event_station.public_name,
    event_station.description_override,
    event_station.capacity_override,
    event_station.is_public,
    event_station.active,
    event_station.sort_order,
    event_station.metadata
  from public.event_stations event_station
  where event_station.event_id = p_source_event_id;

  insert into public.event_activities (
    event_id,
    activity_id,
    public_name,
    description_override,
    access_mode,
    capacity,
    starts_at,
    ends_at,
    is_public,
    active,
    metadata
  )
  select
    new_event_id,
    event_activity.activity_id,
    event_activity.public_name,
    event_activity.description_override,
    event_activity.access_mode,
    event_activity.capacity,
    case
      when event_activity.starts_at is null then null
      else p_new_starts_at + (event_activity.starts_at - source_event.starts_at)
    end,
    case
      when event_activity.ends_at is null then null
      else p_new_starts_at + (event_activity.ends_at - source_event.starts_at)
    end,
    event_activity.is_public,
    event_activity.active,
    event_activity.metadata
  from public.event_activities event_activity
  where event_activity.event_id = p_source_event_id;

  insert into public.event_station_activities (
    event_station_id,
    event_activity_id,
    capacity_override,
    sort_order,
    metadata
  )
  select
    new_station.id,
    new_activity.id,
    link.capacity_override,
    link.sort_order,
    link.metadata
  from public.event_station_activities link
  join public.event_stations old_station
    on old_station.id = link.event_station_id
   and old_station.event_id = p_source_event_id
  join public.event_activities old_activity
    on old_activity.id = link.event_activity_id
   and old_activity.event_id = p_source_event_id
  join public.event_stations new_station
    on new_station.event_id = new_event_id
   and new_station.station_id = old_station.station_id
  join public.event_activities new_activity
    on new_activity.event_id = new_event_id
   and new_activity.activity_id = old_activity.activity_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    auth.uid(),
    'event_duplicated',
    'event',
    new_event_id,
    jsonb_build_object(
      'source_event_id', p_source_event_id,
      'slug', trim(p_new_slug)
    )
  );

  return new_event_id;
end;
$$;

create or replace function public.archive_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  event_row public.events%rowtype;
begin
  if not public.has_any_role(array['admin', 'super_admin']) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select *
  into event_row
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if event_row.archived_at is not null then
    return true;
  end if;

  update public.events
  set archived_at = timezone('utc', now()),
      is_public = false,
      booking_enabled = false
  where id = p_event_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  )
  values (
    auth.uid(),
    'event_archived',
    'event',
    p_event_id,
    jsonb_build_object('status', event_row.status, 'is_public', event_row.is_public),
    jsonb_build_object('archived_at', timezone('utc', now()), 'is_public', false)
  );

  return true;
end;
$$;

revoke all on function public.duplicate_event(uuid, text, text, timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all on function public.archive_event(uuid) from public, anon, authenticated;
grant execute on function public.duplicate_event(uuid, text, text, timestamptz, timestamptz)
  to authenticated;
grant execute on function public.archive_event(uuid) to authenticated;

comment on function public.duplicate_event(uuid, text, text, timestamptz, timestamptz) is
  'Admin-only event template duplication. Bookings, check-ins and tournaments are intentionally not copied.';
comment on function public.archive_event(uuid) is
  'Admin-only event archive that removes public visibility and closes booking.';
