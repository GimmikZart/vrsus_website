begin;

select plan(21);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000003a1', 'authenticated', 'authenticated', 'booking-team-a@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000003a2', 'authenticated', 'authenticated', 'booking-team-b@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000003a3', 'authenticated', 'authenticated', 'booking-team-c@example.test', 'not-a-real-password', timezone('utc', now()));

create temp table booking_team_fixture (tournament_id uuid, entry_id uuid, booking_id uuid);
grant select, update on booking_team_fixture to authenticated;
insert into public.tournaments (event_id, platform_id, game_id, name, status, entry_size, team_formation)
select event.id, game.platform_id, game.id, 'Booking Team Test', 'registration_open', 2, 'open'
from public.events event cross join public.games game
where event.slug = 'vrsus-demo' and game.slug = 'tekken-8'
limit 1;
insert into booking_team_fixture (tournament_id)
select id from public.tournaments where name = 'Booking Team Test';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000003a1', true);
set local role authenticated;
select throws_ok(
  $$select public.create_tournament_team((select tournament_id from booking_team_fixture), 'Squadra Test', 'open')$$,
  'P0001', 'EVENT_BOOKING_REQUIRED', 'captain must book the event first'
);
set local role postgres;
insert into public.bookings (event_id, user_id, status)
select tournament.event_id, '00000000-0000-0000-0000-0000000003a1', 'waitlisted'
from public.tournaments tournament where tournament.id = (select tournament_id from booking_team_fixture);
set local role authenticated;
select throws_ok(
  $$select public.create_tournament_team((select tournament_id from booking_team_fixture), 'Squadra Test', 'open')$$,
  'P0001', 'EVENT_BOOKING_REQUIRED', 'a waitlisted captain cannot create the team'
);
set local role postgres;
update public.bookings set status = 'confirmed', confirmed_at = timezone('utc', now())
where user_id = '00000000-0000-0000-0000-0000000003a1';
set local role authenticated;
update booking_team_fixture
set entry_id = public.create_tournament_team(tournament_id, 'Squadra Test', 'open');
select ok((select entry_id from booking_team_fixture) is not null, 'confirmed captain creates the team');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000003a2', true);
select throws_ok(
  $$select public.join_tournament_team((select entry_id from booking_team_fixture), null)$$,
  'P0001', 'EVENT_BOOKING_REQUIRED', 'teammate must book the event first'
);
set local role postgres;
insert into public.bookings (event_id, user_id, status)
select tournament.event_id, '00000000-0000-0000-0000-0000000003a2', 'waitlisted'
from public.tournaments tournament where tournament.id = (select tournament_id from booking_team_fixture);
set local role authenticated;
select throws_ok(
  $$select public.join_tournament_team((select entry_id from booking_team_fixture), null)$$,
  'P0001', 'EVENT_BOOKING_REQUIRED', 'waitlisted teammate cannot join'
);
set local role postgres;
update public.bookings set status = 'confirmed', confirmed_at = timezone('utc', now())
where user_id = '00000000-0000-0000-0000-0000000003a2';
update booking_team_fixture
set booking_id = (select id from public.bookings where user_id = '00000000-0000-0000-0000-0000000003a2');
set local role authenticated;
select is(
  public.join_tournament_team((select entry_id from booking_team_fixture), null),
  (select entry_id from booking_team_fixture),
  'confirmed teammate joins'
);
select is(
  (select tournament_name from public.get_my_booking_tournaments((select booking_id from booking_team_fixture))),
  'Booking Team Test',
  'confirmation preview names the tournament that will be abandoned'
);
select ok(
  (select length(event_title) > 0 from public.get_my_booking_display((select booking_id from booking_team_fixture))),
  'the ticket reads its event title through the owner-safe RPC'
);
set local role postgres;
select throws_ok(
  $$update public.bookings set status = 'no_show' where id = (select booking_id from booking_team_fixture)$$,
  'P0001', 'TOURNAMENT_ENTRY_ACTIVE', 'staff cannot remove a confirmed booking while tournament membership is active'
);
set local role authenticated;
select lives_ok(
  $$select public.cancel_event_booking((select booking_id from booking_team_fixture))$$,
  'one confirmation cancels the event booking and leaves the team'
);
set local role postgres;
select is(
  (select status from public.bookings where id = (select booking_id from booking_team_fixture)),
  'cancelled',
  'event booking is cancelled'
);
select is(
  (select count(*)::integer from public.tournament_entry_members where entry_id = (select entry_id from booking_team_fixture) and user_id = '00000000-0000-0000-0000-0000000003a2'),
  0,
  'teammate is removed from the tournament'
);

create temp table started_booking_fixture (booking_id uuid);
grant select on started_booking_fixture to authenticated;
insert into started_booking_fixture
select id from public.bookings where user_id = '00000000-0000-0000-0000-0000000003a1';
insert into public.tournaments (event_id, platform_id, game_id, name, status)
select event.id, game.platform_id, game.id, 'Started Booking Test', 'running'
from public.events event cross join public.games game
where event.slug = 'vrsus-demo' and game.slug = 'tekken-8' limit 1;
with created as (
  insert into public.tournament_entries (tournament_id, display_name, status)
  select id, 'Started Player', 'registered' from public.tournaments where name = 'Started Booking Test'
  returning id
)
insert into public.tournament_entry_members (entry_id, user_id, is_captain)
select id, '00000000-0000-0000-0000-0000000003a1', true from created;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000003a1', true);
set local role authenticated;
select throws_ok(
  $$select public.cancel_event_booking((select booking_id from started_booking_fixture))$$,
  'P0001', 'TOURNAMENT_ALREADY_STARTED', 'a started tournament prevents the whole cancellation'
);
set local role postgres;
select is(
  (select status from public.bookings where id = (select booking_id from started_booking_fixture)),
  'confirmed',
  'failed cancellation preserves the event booking'
);
select is(
  (select count(*)::integer from public.tournament_entry_members where entry_id = (select entry_id from booking_team_fixture) and user_id = '00000000-0000-0000-0000-0000000003a1'),
  1,
  'failed cancellation preserves the earlier team membership'
);

select throws_ok(
  $$insert into public.tournament_entry_members (entry_id, user_id, is_captain)
    values ((select entry_id from booking_team_fixture), '00000000-0000-0000-0000-0000000003a3', false)$$,
  'P0001', 'EVENT_BOOKING_REQUIRED', 'staff insert cannot bypass the event booking requirement'
);

insert into public.tournaments (platform_id, game_id, name, status)
select game.platform_id, game.id, 'Standalone Booking Test', 'registration_open'
from public.games game where game.slug = 'tekken-8' limit 1;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000003a3', true);
set local role authenticated;
select ok(
  public.register_tournament_entry((select id from public.public_tournaments where name = 'Standalone Booking Test')) is not null,
  'standalone tournament does not require an event booking'
);

set local role postgres;
create temp table booking_solo_fixture (tournament_id uuid, booking_id uuid);
grant select on booking_solo_fixture to authenticated;
insert into public.tournaments (event_id, platform_id, game_id, name, status)
select event.id, game.platform_id, game.id, 'Booking Solo Test', 'registration_open'
from public.events event cross join public.games game
where event.slug = 'vrsus-demo' and game.slug = 'tekken-8' limit 1;
insert into public.bookings (event_id, user_id, status, confirmed_at)
select event.id, '00000000-0000-0000-0000-0000000003a3', 'confirmed', timezone('utc', now())
from public.events event where event.slug = 'vrsus-demo';
insert into booking_solo_fixture (tournament_id, booking_id)
select tournament.id, booking.id
from public.tournaments tournament
join public.bookings booking on booking.event_id = tournament.event_id
where tournament.name = 'Booking Solo Test'
  and booking.user_id = '00000000-0000-0000-0000-0000000003a3';

set local role authenticated;
select ok(
  public.register_tournament_entry((select tournament_id from booking_solo_fixture)) is not null,
  'confirmed user can join the hosted solo tournament'
);
select lives_ok(
  $$select public.cancel_event_booking((select booking_id from booking_solo_fixture))$$,
  'one cancellation withdraws from a solo tournament too'
);
set local role postgres;
select is(
  (select entry.status from public.tournament_entries entry where entry.tournament_id = (select tournament_id from booking_solo_fixture)),
  'withdrawn',
  'solo entry is withdrawn'
);
select is(
  (select status from public.bookings where id = (select booking_id from booking_solo_fixture)),
  'cancelled',
  'solo player event booking is cancelled'
);

select * from finish();
rollback;
