begin;

select plan(18);

select has_function('public', 'enforce_event_status_transition', array[]::text[], 'event transition guard exists');
select has_function('public', 'enforce_tournament_status_transition', array[]::text[], 'tournament transition guard exists');
select has_function('public', 'enforce_match_status_transition', array[]::text[], 'match transition guard exists');

insert into public.events (
  slug,
  title,
  status,
  starts_at,
  ends_at
)
values (
  'state-machine-guard-event',
  'State machine guard event',
  'draft',
  timezone('utc', now()) + interval '2 days',
  timezone('utc', now()) + interval '2 days 2 hours'
);

select throws_ok(
  $$update public.events set status = 'running' where slug = 'state-machine-guard-event'$$,
  'P0001',
  'INVALID_EVENT_STATUS_TRANSITION',
  'events cannot skip from draft to running'
);
update public.events set status = 'scheduled' where slug = 'state-machine-guard-event';
select is((select status from public.events where slug = 'state-machine-guard-event'), 'scheduled', 'draft events can be scheduled');
update public.events set status = 'draft' where slug = 'state-machine-guard-event';
select is((select status from public.events where slug = 'state-machine-guard-event'), 'draft', 'future scheduled events can return to draft');
update public.events set status = 'scheduled' where slug = 'state-machine-guard-event';
update public.events set status = 'running' where slug = 'state-machine-guard-event';
select is((select status from public.events where slug = 'state-machine-guard-event'), 'running', 'scheduled events can start');
select throws_ok(
  $$update public.events set status = 'draft' where slug = 'state-machine-guard-event'$$,
  'P0001',
  'INVALID_EVENT_STATUS_TRANSITION',
  'running events cannot return to draft'
);

insert into public.tournaments (
  event_id,
  slug,
  name,
  status,
  is_public
)
select id, 'state-machine-guard-tournament', 'State machine guard tournament', 'draft', false
from public.events
where slug = 'state-machine-guard-event';

select throws_ok(
  $$update public.tournaments set status = 'running' where slug = 'state-machine-guard-tournament'$$,
  'P0001',
  'INVALID_TOURNAMENT_STATUS_TRANSITION',
  'tournaments cannot skip registration states'
);
update public.tournaments set status = 'registration_open' where slug = 'state-machine-guard-tournament';
update public.tournaments set status = 'registration_closed' where slug = 'state-machine-guard-tournament';
update public.tournaments set status = 'checkin' where slug = 'state-machine-guard-tournament';
select is((select status from public.tournaments where slug = 'state-machine-guard-tournament'), 'checkin', 'tournaments can enter check-in');
update public.tournaments set status = 'running' where slug = 'state-machine-guard-tournament';
select is((select status from public.tournaments where slug = 'state-machine-guard-tournament'), 'running', 'check-in tournaments can start');
select throws_ok(
  $$update public.tournaments set status = 'draft' where slug = 'state-machine-guard-tournament'$$,
  'P0001',
  'INVALID_TOURNAMENT_STATUS_TRANSITION',
  'running tournaments cannot return to draft'
);
update public.tournaments set status = 'completed' where slug = 'state-machine-guard-tournament';
select is((select status from public.tournaments where slug = 'state-machine-guard-tournament'), 'completed', 'running tournaments can complete');

insert into public.matches (
  tournament_id,
  round_number,
  bracket_position,
  status
)
select id, 1, 1, 'pending'
from public.tournaments
where slug = 'state-machine-guard-tournament';

select throws_ok(
  $$update public.matches set status = 'called' where round_number = 1 and bracket_position = 1 and tournament_id = (select id from public.tournaments where slug = 'state-machine-guard-tournament')$$,
  'P0001',
  'INVALID_MATCH_STATUS_TRANSITION',
  'pending matches cannot be called directly'
);
update public.matches set status = 'ready' where round_number = 1 and bracket_position = 1 and tournament_id = (select id from public.tournaments where slug = 'state-machine-guard-tournament');
select is((select status from public.matches where round_number = 1 and bracket_position = 1 and tournament_id = (select id from public.tournaments where slug = 'state-machine-guard-tournament')), 'ready', 'pending matches can become ready');
select throws_ok(
  $$update public.matches set status = 'completed' where round_number = 1 and bracket_position = 1 and tournament_id = (select id from public.tournaments where slug = 'state-machine-guard-tournament')$$,
  'P0001',
  'INVALID_MATCH_STATUS_TRANSITION',
  'ready matches cannot skip the call and start states'
);
update public.matches set status = 'called' where round_number = 1 and bracket_position = 1 and tournament_id = (select id from public.tournaments where slug = 'state-machine-guard-tournament');
update public.matches set status = 'running' where round_number = 1 and bracket_position = 1 and tournament_id = (select id from public.tournaments where slug = 'state-machine-guard-tournament');
select throws_ok(
  $$update public.matches set status = 'pending' where round_number = 1 and bracket_position = 1 and tournament_id = (select id from public.tournaments where slug = 'state-machine-guard-tournament')$$,
  'P0001',
  'INVALID_MATCH_STATUS_TRANSITION',
  'running matches cannot return to pending'
);
update public.matches set status = 'completed' where round_number = 1 and bracket_position = 1 and tournament_id = (select id from public.tournaments where slug = 'state-machine-guard-tournament');
select is((select status from public.matches where round_number = 1 and bracket_position = 1 and tournament_id = (select id from public.tournaments where slug = 'state-machine-guard-tournament')), 'completed', 'running matches can complete');

select * from finish();
rollback;
