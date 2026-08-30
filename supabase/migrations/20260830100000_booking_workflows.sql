-- Phase 4/5 booking workflows.
-- Business-critical booking and check-in operations stay transactional in Postgres.

create or replace function public._promote_waitlist_for_event(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  event_row public.events%rowtype;
  confirmed_count integer;
  available_slots integer;
  promoted_count integer := 0;
  waiting_booking public.bookings%rowtype;
  qr_token text;
begin
  select *
  into event_row
  from public.events
  where id = p_event_id
  for update;

  if not found
    or event_row.status <> 'scheduled'
    or event_row.booking_enabled = false
    or event_row.archived_at is not null
    or (event_row.booking_opens_at is not null and timezone('utc', now()) < event_row.booking_opens_at)
    or (event_row.booking_closes_at is not null and timezone('utc', now()) > event_row.booking_closes_at)
    or event_row.max_capacity is null then
    return 0;
  end if;

  select count(*)::integer
  into confirmed_count
  from public.bookings booking
  where booking.event_id = p_event_id
    and booking.status = 'confirmed';

  available_slots := greatest(event_row.max_capacity - confirmed_count, 0);

  while promoted_count < available_slots loop
    select *
    into waiting_booking
    from public.bookings
    where event_id = p_event_id
      and status = 'waitlisted'
    order by created_at asc
    limit 1
    for update skip locked;

    exit when not found;

    qr_token := encode(extensions.gen_random_bytes(32), 'hex');

    update public.bookings
    set status = 'confirmed',
        confirmed_at = timezone('utc', now()),
        qr_token_hash = encode(extensions.digest(qr_token, 'sha256'), 'hex'),
        qr_issued_at = timezone('utc', now())
    where id = waiting_booking.id;

    insert into public.notifications (user_id, type, title, message, action_url, metadata)
    values (
      waiting_booking.user_id,
      'booking_promoted',
      'Prenotazione confermata',
      'Si è liberato un posto: la tua prenotazione è stata promossa dalla lista d’attesa.',
      '/app/prenotazioni/' || waiting_booking.id::text,
      jsonb_build_object('booking_id', waiting_booking.id, 'event_id', p_event_id)
    );

    insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
    values (
      auth.uid(),
      'booking_waitlist_promoted',
      'booking',
      waiting_booking.id,
      jsonb_build_object('status', 'waitlisted'),
      jsonb_build_object('status', 'confirmed', 'event_id', p_event_id)
    );

    promoted_count := promoted_count + 1;
  end loop;

  return promoted_count;
end;
$$;

create or replace function public.create_event_booking(p_event_id uuid)
returns table (booking_id uuid, status text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  event_row public.events%rowtype;
  existing_booking public.bookings%rowtype;
  confirmed_count integer;
  booking_status text;
  qr_token text;
  new_booking_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select *
  into event_row
  from public.events
  where id = p_event_id
  for update;

  if not found or event_row.archived_at is not null then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if event_row.status <> 'scheduled' or event_row.booking_enabled = false then
    raise exception 'EVENT_NOT_BOOKABLE' using errcode = 'P0001';
  end if;

  if (event_row.booking_opens_at is not null and timezone('utc', now()) < event_row.booking_opens_at)
    or (event_row.booking_closes_at is not null and timezone('utc', now()) > event_row.booking_closes_at) then
    raise exception 'BOOKING_NOT_OPEN' using errcode = 'P0001';
  end if;

  select booking.*
  into existing_booking
  from public.bookings booking
  where booking.event_id = p_event_id
    and booking.user_id = auth.uid()
    and booking.status in ('confirmed', 'waitlisted')
  limit 1;

  if found then
    raise exception 'ALREADY_BOOKED' using errcode = 'P0001';
  end if;

  select count(*)::integer
  into confirmed_count
  from public.bookings booking
  where booking.event_id = p_event_id
    and booking.status = 'confirmed';

  if event_row.max_capacity is not null and confirmed_count >= event_row.max_capacity then
    if event_row.waitlist_enabled = false then
      raise exception 'EVENT_FULL' using errcode = 'P0001';
    end if;
    booking_status := 'waitlisted';
  else
    booking_status := 'confirmed';
  end if;

  if booking_status = 'confirmed' then
    qr_token := encode(extensions.gen_random_bytes(32), 'hex');

    insert into public.bookings (
      event_id,
      user_id,
      status,
      confirmed_at,
      qr_token_hash,
      qr_issued_at
    )
    values (
      p_event_id,
      auth.uid(),
      booking_status,
      timezone('utc', now()),
      encode(extensions.digest(qr_token, 'sha256'), 'hex'),
      timezone('utc', now())
    )
    returning id into new_booking_id;
  else
    insert into public.bookings (event_id, user_id, status)
    values (p_event_id, auth.uid(), booking_status)
    returning id into new_booking_id;
  end if;

  return query select new_booking_id, booking_status;
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

create or replace function public.promote_waitlist(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if not public.has_any_role(array['admin', 'super_admin']) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  return public._promote_waitlist_for_event(p_event_id);
end;
$$;

create or replace function public.get_my_booking_qr(p_booking_id uuid)
returns table (
  booking_id uuid,
  event_id uuid,
  event_title text,
  event_slug text,
  status text,
  payment_status text,
  checked_in_at timestamptz,
  qr_token text,
  qr_issued_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  booking_row public.bookings%rowtype;
  event_row public.events%rowtype;
  qr_token_value text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select booking.*
  into booking_row
  from public.bookings booking
  where booking.id = p_booking_id
    and booking.user_id = auth.uid()
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  if booking_row.status <> 'confirmed' then
    raise exception 'BOOKING_NOT_CONFIRMED' using errcode = 'P0001';
  end if;

  select * into event_row from public.events where id = booking_row.event_id;
  qr_token_value := encode(extensions.gen_random_bytes(32), 'hex');

  update public.bookings
  set qr_token_hash = encode(extensions.digest(qr_token_value, 'sha256'), 'hex'),
      qr_issued_at = timezone('utc', now())
  where id = booking_row.id;

  return query
  select
    booking_row.id,
    booking_row.event_id,
    event_row.title,
    event_row.slug,
    booking_row.status,
    booking_row.payment_status,
    booking_row.checked_in_at,
    qr_token_value,
    now();
end;
$$;

create or replace function public.mark_onsite_payment(p_booking_id uuid, p_status text)
returns table (booking_id uuid, payment_status text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  booking_row public.bookings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if not public.has_any_role(array['staff', 'admin', 'super_admin']) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_status not in ('unpaid', 'paid_on_site', 'complimentary', 'not_required') then
    raise exception 'PAYMENT_STATUS_INVALID' using errcode = 'P0001';
  end if;

  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.bookings
  set payment_status = p_status
  where id = p_booking_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(),
    'booking_payment_updated',
    'booking',
    p_booking_id,
    jsonb_build_object('payment_status', booking_row.payment_status),
    jsonb_build_object('payment_status', p_status)
  );

  return query select p_booking_id, p_status;
end;
$$;

create or replace function public.check_in_booking(p_qr_token text, p_payment_status text default null)
returns table (
  booking_id uuid,
  event_id uuid,
  user_id uuid,
  event_title text,
  status text,
  payment_status text,
  checked_in_at timestamptz,
  already_checked_in boolean
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  booking_row public.bookings%rowtype;
  event_row public.events%rowtype;
  checkin_time timestamptz;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if not public.has_any_role(array['staff', 'admin', 'super_admin']) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_payment_status is not null
    and p_payment_status not in ('unpaid', 'paid_on_site', 'complimentary', 'not_required') then
    raise exception 'PAYMENT_STATUS_INVALID' using errcode = 'P0001';
  end if;

  select booking.*
  into booking_row
  from public.bookings booking
  where booking.qr_token_hash = encode(extensions.digest(trim(coalesce(p_qr_token, '')), 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'QR_INVALID' using errcode = 'P0001';
  end if;

  if booking_row.status <> 'confirmed' then
    raise exception 'BOOKING_NOT_CONFIRMED' using errcode = 'P0001';
  end if;

  select * into event_row from public.events where id = booking_row.event_id;

  if booking_row.checked_in_at is not null then
    return query select
      booking_row.id,
      booking_row.event_id,
      booking_row.user_id,
      event_row.title,
      booking_row.status,
      booking_row.payment_status,
      booking_row.checked_in_at,
      true;
    return;
  end if;

  checkin_time := now();

  if p_payment_status is not null then
    update public.bookings
    set payment_status = p_payment_status
    where id = booking_row.id;
    booking_row.payment_status := p_payment_status;
  end if;

  update public.bookings
  set checked_in_at = checkin_time
  where id = booking_row.id;

  insert into public.event_checkins (
    event_id,
    booking_id,
    user_id,
    checked_in_at,
    checked_in_by,
    payment_status_at_checkin
  )
  values (
    booking_row.event_id,
    booking_row.id,
    booking_row.user_id,
    checkin_time,
    auth.uid(),
    booking_row.payment_status
  );

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(),
    'booking_checked_in',
    'booking',
    booking_row.id,
    jsonb_build_object('checked_in_at', null, 'payment_status', booking_row.payment_status),
    jsonb_build_object('checked_in_at', checkin_time, 'payment_status', booking_row.payment_status)
  );

  return query select
    booking_row.id,
    booking_row.event_id,
    booking_row.user_id,
    event_row.title,
    booking_row.status,
    booking_row.payment_status,
    checkin_time,
    false;
end;
$$;

revoke all on function public.create_event_booking(uuid) from public, anon, authenticated;
revoke all on function public.cancel_event_booking(uuid) from public, anon, authenticated;
revoke all on function public.promote_waitlist(uuid) from public, anon, authenticated;
revoke all on function public.get_my_booking_qr(uuid) from public, anon, authenticated;
revoke all on function public.mark_onsite_payment(uuid, text) from public, anon, authenticated;
revoke all on function public.check_in_booking(text, text) from public, anon, authenticated;

grant execute on function public.create_event_booking(uuid) to authenticated;
grant execute on function public.cancel_event_booking(uuid) to authenticated;
grant execute on function public.promote_waitlist(uuid) to authenticated;
grant execute on function public.get_my_booking_qr(uuid) to authenticated;
grant execute on function public.mark_onsite_payment(uuid, text) to authenticated;
grant execute on function public.check_in_booking(text, text) to authenticated;

comment on function public.create_event_booking(uuid) is
  'Race-safe event booking. Capacity is evaluated while the event row is locked.';
comment on function public.get_my_booking_qr(uuid) is
  'Owner-only QR issuance. The plaintext token is returned only to the owner and only its hash is persisted.';
comment on function public.check_in_booking(text, text) is
  'Staff/admin QR check-in. Repeated calls return the existing check-in without duplicating it.';
