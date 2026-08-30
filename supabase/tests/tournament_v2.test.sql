begin;

select plan(23);

select has_table('public', 'tournaments', 'tournaments table exists');
select has_table('public', 'tournament_entries', 'tournament entries table exists');
select has_table('public', 'tournament_entry_members', 'tournament entry members table exists');
select has_table('public', 'tournament_checkins', 'tournament checkins table exists');
select has_table('public', 'matches', 'matches table exists');
select has_table('public', 'ranking_points_ledger', 'ranking ledger table exists');
select has_view('public', 'public_tournaments', 'public tournaments projection exists');
select has_view('public', 'public_tournament_matches', 'public tournament matches projection exists');
select has_view('public', 'public_ranking', 'public ranking projection exists');
select has_function('public', 'register_tournament_entry', array['uuid']::text[], 'registration RPC exists');
select has_function('public', 'create_single_elimination_bracket', array['uuid']::text[], 'bracket RPC exists');
select has_function('public', 'record_match_result', array['uuid', 'jsonb', 'uuid']::text[], 'result RPC exists');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'tournament-c1@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'tournament-c2@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 'tournament-c3@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 'tournament-c4@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000aa', 'authenticated', 'authenticated', 'tournament-admin@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000aa', id from public.roles where code = 'tournament_admin';

create temp table tournament_fixture (id uuid primary key, event_activity_id uuid);
grant select on tournament_fixture to authenticated;
insert into public.tournaments (event_id, slug, name, status, max_entries, checkin_required, ranking_enabled, is_public)
select id, 'demo-tournament', 'Demo Tournament', 'registration_open', 8, true, true, true
from public.events where slug = 'vrsus-demo'
returning id;
insert into tournament_fixture (id)
select id from public.tournaments where slug = 'demo-tournament';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
set local role authenticated;
select ok(
  public.register_tournament_entry((select id from tournament_fixture)) is not null,
  'user can register an entry'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
select public.register_tournament_entry((select id from tournament_fixture));
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true);
select public.register_tournament_entry((select id from tournament_fixture));
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c4', true);
select public.register_tournament_entry((select id from tournament_fixture));

select throws_ok(
  $$select public.register_tournament_entry((select id from tournament_fixture))$$,
  '23505',
  'ALREADY_REGISTERED',
  'duplicate tournament registration is rejected'
);

select lives_ok(
  $$select public.check_in_tournament_entry(entry.id) from public.tournament_entries entry join public.tournament_entry_members member on member.entry_id = entry.id where member.user_id = '00000000-0000-0000-0000-0000000000c4'$$,
  'registered user can check in their entry'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true);
select public.check_in_tournament_entry((select entry.id from public.tournament_entries entry join public.tournament_entry_members member on member.entry_id = entry.id where member.user_id = auth.uid()));
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
select public.check_in_tournament_entry((select entry.id from public.tournament_entries entry join public.tournament_entry_members member on member.entry_id = entry.id where member.user_id = auth.uid()));
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select public.check_in_tournament_entry((select entry.id from public.tournament_entries entry join public.tournament_entry_members member on member.entry_id = entry.id where member.user_id = auth.uid()));

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', true);
update public.tournaments
set status = 'registration_closed'
where id = (select id from tournament_fixture);
select lives_ok(
  $$select public.create_single_elimination_bracket((select id from tournament_fixture))$$,
  'tournament admin can create a bracket'
);
set local role postgres;
select is(
  (select count(*)::integer from public.matches where tournament_id = (select id from tournament_fixture)),
  3,
  'four checked-in entries create a three-match bracket'
);
select is(
  (select count(*)::integer from public.matches where tournament_id = (select id from tournament_fixture) and status = 'ready'),
  2,
  'first round matches are ready'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000aa', true);
set local role authenticated;
select public.call_tournament_match(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 1 and bracket_position = 1)
);
select public.call_tournament_match(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 1 and bracket_position = 2)
);
select public.start_tournament_match(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 1 and bracket_position = 1)
);
select public.start_tournament_match(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 1 and bracket_position = 2)
);
select public.record_match_result(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 1 and bracket_position = 1),
  '{"a": 2, "b": 1}'::jsonb,
  (select entry_a_id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 1 and bracket_position = 1)
);
select public.record_match_result(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 1 and bracket_position = 2),
  '{"a": 2, "b": 0}'::jsonb,
  (select entry_a_id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 1 and bracket_position = 2)
);
set local role postgres;
select is(
  (select count(*)::integer from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 2 and status = 'ready'),
  1,
  'round two becomes ready after both results'
);

set local role authenticated;
select public.call_tournament_match(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 2)
);
select public.start_tournament_match(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 2)
);
select public.record_match_result(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 2),
  '{"a": 3, "b": 2}'::jsonb,
  (select entry_a_id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 2)
);
set local role postgres;
select is((select status from public.tournaments where id = (select id from tournament_fixture)), 'completed', 'final result completes tournament');
select is((select count(*)::integer from public.ranking_points_ledger where tournament_id = (select id from tournament_fixture)), 2, 'winner and runner-up receive ranking points');
select is((select sum(points)::integer from public.ranking_points_ledger where tournament_id = (select id from tournament_fixture)), 160, 'ranking points follow initial scoring rules');
select is((select count(*)::integer from public.audit_logs where entity_type = 'match' and entity_id in (select id from public.matches where tournament_id = (select id from tournament_fixture))), 9, 'match operations and results are audited');

select * from finish();
rollback;
