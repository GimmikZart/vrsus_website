begin;

select plan(25);

select has_table('public', 'notification_preferences', 'notification preferences table exists');
select has_view('public', 'public_ranking_by_game', 'game ranking projection exists');
select has_function('public', 'call_tournament_match', array['uuid']::text[], 'call match RPC exists');
select has_function('public', 'assign_match_station', array['uuid', 'uuid']::text[], 'assign station RPC exists');
select has_function('public', 'start_tournament_match', array['uuid']::text[], 'start match RPC exists');
select has_function('public', 'amend_match_results', array['uuid', 'jsonb']::text[], 'amend results RPC exists');
select has_function('public', 'adjust_ranking_points', array['uuid', 'uuid', 'integer', 'text', 'text']::text[], 'ranking adjustment RPC exists');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000d1', 'authenticated', 'authenticated', 'operations-d1@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', 'operations-d2@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000da', 'authenticated', 'authenticated', 'operations-admin@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000da', id from public.roles where code = 'admin';

insert into public.tournaments (
  event_id, platform_id, game_id, point_scheme_id, name, status,
  checkin_required, ranking_enabled, is_public
)
select
  event.id,
  game.platform_id,
  game.id,
  scheme.id,
  'Operations Tournament',
  'checkin',
  false,
  true,
  true
from public.events event
cross join public.games game
cross join public.point_schemes scheme
where event.slug = 'vrsus-demo'
  and game.slug = 'tekken-8'
  and scheme.slug = 'eliminazione-diretta-standard'
limit 1;

select is(
  (select status from public.tournaments where name = 'Operations Tournament'),
  'checkin',
  'tournament check-in status is accepted'
);

insert into public.tournament_entries (tournament_id, display_name, seed)
select tournament.id, fixture.display_name, fixture.seed
from public.tournaments tournament
cross join (values
  ('Operations One', 1),
  ('Operations Two', 2)
) as fixture(display_name, seed)
where tournament.name = 'Operations Tournament';

insert into public.bookings (event_id, user_id, status, confirmed_at)
select tournament.event_id, fixture.user_id, 'confirmed', timezone('utc', now())
from public.tournaments tournament
cross join (values
  ('00000000-0000-0000-0000-0000000000d1'::uuid),
  ('00000000-0000-0000-0000-0000000000d2'::uuid)
) as fixture(user_id)
where tournament.name = 'Operations Tournament';

insert into public.tournament_entry_members (entry_id, user_id, is_captain)
select entry.id,
  case when entry.seed = 1 then '00000000-0000-0000-0000-0000000000d1'::uuid else '00000000-0000-0000-0000-0000000000d2'::uuid end,
  true
from public.tournament_entries entry
join public.tournaments tournament on tournament.id = entry.tournament_id
where tournament.name = 'Operations Tournament';

-- Una partita ha N posti: qui sono due, scritti in match_participants.
with created as (
  insert into public.matches (tournament_id, round_number, bracket_position, status)
  select tournament.id, 1, 1, 'ready'
  from public.tournaments tournament
  where tournament.name = 'Operations Tournament'
  returning id, tournament_id
)
insert into public.match_participants (match_id, entry_id, slot)
select created.id, entry.id, entry.seed::smallint
from created
join public.tournament_entries entry on entry.tournament_id = created.tournament_id;

create temp table operations_fixture (match_id uuid, platform_id uuid);
grant select on operations_fixture to authenticated;
insert into operations_fixture (match_id, platform_id)
select
  (select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament'),
  (select platform.id from public.event_platforms platform join public.events event on event.id = platform.event_id where event.slug = 'vrsus-demo' limit 1);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000da', true);
set local role authenticated;

select lives_ok(
  $$select public.assign_match_station(
    (select match_id from operations_fixture),
    (select platform_id from operations_fixture)
  )$$,
  'tournament admin can assign a station to a match'
);
select ok(
  (select event_platform_id is not null from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament'),
  'match station assignment is persisted'
);

select ok(
  (public.call_tournament_match((select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament'))->>'match_id') is not null,
  'tournament admin can call both players'
);
select is(
  (select match.status from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament'),
  'called',
  'calling players moves match to called'
);
set local role postgres;
select is(
  (select count(*)::integer from public.notifications where metadata->>'match_id' = (select match.id::text from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament')),
  2,
  'calling players creates one in-app notification per player'
);
set local role authenticated;
select lives_ok(
  $$select public.call_tournament_match((select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament'))$$,
  'calling an already-called match is idempotent'
);
set local role postgres;
select is(
  (select count(*)::integer from public.notifications where metadata->>'match_id' = (select match.id::text from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament')),
  2,
  'idempotent call does not duplicate notifications'
);
set local role authenticated;

select lives_ok(
  $$select public.start_tournament_match((select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament'))$$,
  'called match can be started'
);
select is(
  (select match.status from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament'),
  'running',
  'starting a match moves it to running'
);
update public.tournaments
set status = 'running'
where name = 'Operations Tournament';

select lives_ok(
  $$select public.record_match_results(
    (select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament'),
    (select jsonb_agg(jsonb_build_object(
        'entry_id', entry.id,
        'score', case when entry.seed = 1 then 2 else 0 end,
        'outcome', case when entry.seed = 1 then 'win' else 'loss' end))
     from public.tournament_entries entry
     join public.tournaments tournament on tournament.id = entry.tournament_id
     where tournament.name = 'Operations Tournament')
  )$$,
  'completed match records a winner and ranking points'
);
select is(
  (select status from public.tournaments where name = 'Operations Tournament'),
  'completed',
  'final match completes the tournament'
);
select lives_ok(
  $$select public.amend_match_results(
    (select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Operations Tournament'),
    (select jsonb_agg(jsonb_build_object(
        'entry_id', entry.id,
        'score', case when entry.seed = 1 then 3 else 0 end))
     from public.tournament_entries entry
     join public.tournaments tournament on tournament.id = entry.tournament_id
     where tournament.name = 'Operations Tournament')
  )$$,
  'admin can amend a completed match score without changing the winner'
);
select is(
  (select part.score::integer
   from public.match_participants part
   join public.tournament_entries entry on entry.id = part.entry_id
   join public.tournaments tournament on tournament.id = entry.tournament_id
   where tournament.name = 'Operations Tournament' and entry.seed = 1),
  3,
  'amended match score is persisted'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select ok(
  public.upsert_push_subscription('onesignal', 'subscription-d1', 'Test browser') is not null,
  'user can register a push subscription'
);
select is(
  (select push_enabled from public.notification_preferences where user_id = auth.uid()),
  true,
  'registering a push subscription enables push preference'
);
select lives_ok(
  $$select public.deactivate_push_subscription((select id from public.push_subscriptions where provider_subscription_id = 'subscription-d1'))$$,
  'user can deactivate own push subscription'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000da', true);
select ok(
  public.adjust_ranking_points(
    '00000000-0000-0000-0000-0000000000d2'::uuid,
    null,
    10,
    'manual_correction',
    'Correction for operations test'
  ) is not null,
  'admin ranking adjustment is auditably inserted'
);

select * from finish();
