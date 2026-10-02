begin;

select plan(11);

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
set local role postgres;
select throws_ok(
  $$update public.bookings set status = 'no_show' where id = (select booking_id from booking_team_fixture)$$,
  'P0001', 'TOURNAMENT_ENTRY_ACTIVE', 'staff cannot remove a confirmed booking while tournament membership is active'
);
set local role authenticated;
select throws_ok(
  $$select public.cancel_event_booking((select booking_id from booking_team_fixture))$$,
  'P0001', 'TOURNAMENT_ENTRY_ACTIVE', 'event booking cannot be cancelled during active tournament membership'
);
select public.leave_tournament_team((select entry_id from booking_team_fixture));
select lives_ok(
  $$select public.cancel_event_booking((select booking_id from booking_team_fixture))$$,
  'event booking can be cancelled after leaving the team'
);

set local role postgres;
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

select * from finish();
rollback;
