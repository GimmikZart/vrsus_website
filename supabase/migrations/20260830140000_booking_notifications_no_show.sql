-- Booking notifications are created by the transactional trigger from the V2
-- operations migration. This migration completes the booking lifecycle with
-- the staff/admin no-show transition.

create or replace function public.mark_booking_no_show(p_booking_id uuid)
returns table (booking_id uuid, status text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  booking_row public.bookings%rowtype;
  event_row public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if not public.has_any_role(array['staff', 'admin', 'super_admin']) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select booking.*
  into booking_row
  from public.bookings booking
  where booking.id = p_booking_id
  for update;

  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0001';
  end if;

  select event.*
  into event_row
  from public.events event
  where event.id = booking_row.event_id;

  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    event_row.status in ('running', 'completed')
    or (
      event_row.status = 'scheduled'
      and event_row.ends_at <= timezone('utc', now())
    )
  ) then
    raise exception 'EVENT_NOT_CLOSED' using errcode = 'P0001';
  end if;

  if booking_row.status <> 'confirmed' or booking_row.checked_in_at is not null then
    raise exception 'BOOKING_NOT_MARKABLE' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'no_show',
      qr_token_hash = null,
      qr_issued_at = null
  where id = p_booking_id;

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
    'booking_marked_no_show',
    'booking',
    p_booking_id,
    jsonb_build_object('status', booking_row.status, 'event_id', booking_row.event_id),
    jsonb_build_object('status', 'no_show', 'event_id', booking_row.event_id)
  );

  return query select p_booking_id, 'no_show'::text;
end;
$$;

revoke all on function public.mark_booking_no_show(uuid) from public, anon, authenticated;
grant execute on function public.mark_booking_no_show(uuid) to authenticated;

comment on function public.mark_booking_no_show(uuid) is
  'Staff/admin-only transition from confirmed to no_show during or after the event, with audit and QR revocation.';
