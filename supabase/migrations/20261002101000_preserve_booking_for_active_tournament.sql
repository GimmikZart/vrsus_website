-- All booking status changes, including staff no-shows, preserve the rule.
create function public.keep_booking_for_active_tournament()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if old.status = 'confirmed'
    and (new.status <> 'confirmed' or new.event_id <> old.event_id or new.user_id <> old.user_id)
    and exists (
      select 1
      from public.tournaments tournament
      join public.tournament_entries entry on entry.tournament_id = tournament.id
      join public.tournament_entry_members member on member.entry_id = entry.id
      where tournament.event_id = old.event_id
        and member.user_id = old.user_id
        and entry.status not in ('withdrawn', 'eliminated')
        and tournament.status not in ('completed', 'cancelled')
    )
  then
    raise exception using errcode = 'P0001', message = 'TOURNAMENT_ENTRY_ACTIVE';
  end if;
  return new;
end;
$$;

create trigger booking_kept_for_active_tournament
before update of status, event_id, user_id on public.bookings
for each row execute function public.keep_booking_for_active_tournament();

revoke all on function public.keep_booking_for_active_tournament()
from public, anon, authenticated;
revoke all on function public.require_event_booking_for_tournament_member()
from public, anon, authenticated;
