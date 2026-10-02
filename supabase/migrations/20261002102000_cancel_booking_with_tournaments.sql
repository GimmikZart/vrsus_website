-- A customer confirms one cancellation for both the event and its tournaments.
-- The RPC runs in one transaction: an ineligible tournament leaves everything
-- unchanged, including the booking and any earlier tournament in the loop.
create or replace function public.cancel_event_booking(p_booking_id uuid)
returns table (booking_id uuid, promoted_count integer)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  booking_row public.bookings%rowtype;
  tournament_row record;
  was_confirmed boolean;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select * into booking_row
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

  for tournament_row in
    select tournament.id as tournament_id,
      tournament.status as tournament_status,
      tournament.entry_size,
      entry.id as entry_id,
      entry.status as entry_status
    from public.tournaments tournament
    join public.tournament_entries entry on entry.tournament_id = tournament.id
    join public.tournament_entry_members member on member.entry_id = entry.id
    where tournament.event_id = booking_row.event_id
      and member.user_id = booking_row.user_id
      and entry.status not in ('withdrawn', 'eliminated')
      and tournament.status not in ('completed', 'cancelled')
    order by tournament.id, entry.id
  loop
    -- Staff cancelling someone else's booking must still manage their
    -- tournament entries explicitly. The customer path below is automatic.
    if booking_row.user_id <> auth.uid() then
      raise exception using errcode = 'P0001', message = 'TOURNAMENT_ENTRY_ACTIVE';
    end if;

    if tournament_row.tournament_status not in
      ('registration_open', 'registration_closed', 'checkin')
      or tournament_row.entry_status not in
      ('forming', 'registered', 'checked_in')
      or exists (
        select 1 from public.matches match
        join public.match_participants part on part.match_id = match.id
        where match.tournament_id = tournament_row.tournament_id
          and part.entry_id = tournament_row.entry_id
          and match.status not in ('pending', 'ready')
      )
    then
      raise exception using errcode = 'P0001', message = 'TOURNAMENT_ALREADY_STARTED';
    end if;

    if tournament_row.entry_size > 1 then
      if tournament_row.tournament_status = 'checkin' then
        raise exception using errcode = 'P0001', message = 'TOURNAMENT_ALREADY_STARTED';
      end if;
      perform public.leave_tournament_team(tournament_row.entry_id);
    else
      perform public.withdraw_tournament_entry(tournament_row.tournament_id);
    end if;
  end loop;

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

-- Owner-safe detail for the compact ticket, including private events.
create function public.get_my_booking_display(p_booking_id uuid)
returns table (
  event_title text,
  price_cents integer,
  payment_required boolean,
  arci_required boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select event.title, event.price_cents, event.payment_required, event.arci_required
  from public.bookings booking
  join public.events event on event.id = booking.event_id
  where booking.id = p_booking_id and booking.user_id = auth.uid();
$$;

-- The confirmation sheet uses this same ownership boundary as cancellation.
create function public.get_my_booking_tournaments(p_booking_id uuid)
returns table (tournament_id uuid, tournament_name text, tournament_status text)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_event_id uuid;
begin
  select booking.event_id into v_event_id
  from public.bookings booking
  where booking.id = p_booking_id and booking.user_id = auth.uid();

  if not found then
    raise exception using errcode = 'P0002', message = 'BOOKING_NOT_FOUND';
  end if;

  return query
  select distinct tournament.id, tournament.name, tournament.status
  from public.tournaments tournament
  join public.tournament_entries entry on entry.tournament_id = tournament.id
  join public.tournament_entry_members member on member.entry_id = entry.id
  where tournament.event_id = v_event_id
    and member.user_id = auth.uid()
    and entry.status not in ('withdrawn', 'eliminated')
    and tournament.status not in ('completed', 'cancelled')
  order by tournament.name;
end;
$$;

revoke all on function public.get_my_booking_display(uuid) from public, anon, authenticated;
revoke all on function public.get_my_booking_tournaments(uuid) from public, anon, authenticated;
grant execute on function public.get_my_booking_display(uuid) to authenticated;
grant execute on function public.get_my_booking_tournaments(uuid) to authenticated;
