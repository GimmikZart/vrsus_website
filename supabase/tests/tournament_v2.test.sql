begin;

select plan(24);

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
select has_function('public', 'generate_tournament_schedule', array['uuid']::text[], 'schedule RPC exists');
select has_function('public', 'record_match_results', array['uuid', 'jsonb']::text[], 'result RPC exists');
select has_table('public', 'match_participants', 'match participants table exists');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'tournament-c1@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'tournament-c2@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 'tournament-c3@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000c4', 'authenticated', 'authenticated', 'tournament-c4@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000aa', 'authenticated', 'authenticated', 'tournament-admin@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000aa', id from public.roles where code = 'tournament_admin';

-- Chiude una partita facendo vincere chi occupa il primo posto: serve tante
-- volte e scriverlo per esteso renderebbe illeggibile il test.
create function pg_temp.win_first_slot(p_match_id uuid)
returns uuid
language sql
as $$
  select public.record_match_results(
    p_match_id,
    (select jsonb_agg(jsonb_build_object(
        'entry_id', part.entry_id,
        'outcome', case when part.slot = 1 then 'win' else 'loss' end))
     from public.match_participants part
     where part.match_id = p_match_id and part.entry_id is not null));
$$;

create temp table tournament_fixture (id uuid primary key, game_id uuid);
grant select on tournament_fixture to authenticated;
insert into public.tournaments (
  event_id, platform_id, game_id, point_scheme_id, name, status,
  max_entries, checkin_required, ranking_enabled, is_public)
select event.id, game.platform_id, game.id, scheme.id,
  'Demo Tournament', 'registration_open', 8, true, true, true
from public.events event
cross join public.games game
cross join public.point_schemes scheme
where event.slug = 'vrsus-demo'
  and game.slug = 'tekken-8'
  and scheme.slug = 'eliminazione-diretta-standard'
returning id;
insert into tournament_fixture (id)
select id from public.tournaments where name = 'Demo Tournament';

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
  $$select public.generate_tournament_schedule((select id from tournament_fixture))$$,
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
select pg_temp.win_first_slot(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 1 and bracket_position = 1)
);
select pg_temp.win_first_slot(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 1 and bracket_position = 2)
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
select pg_temp.win_first_slot(
  (select id from public.matches where tournament_id = (select id from tournament_fixture) and round_number = 2)
);
set local role postgres;
select is((select status from public.tournaments where id = (select id from tournament_fixture)), 'completed', 'final result completes tournament');
-- Quattro iscritti: 100 al primo, 60 al secondo, 10 di partecipazione a testa.
select is((select count(*)::integer from public.ranking_points_ledger where tournament_id = (select id from tournament_fixture)), 8, 'placement and participation rows are written');
select is((select sum(points)::integer from public.ranking_points_ledger where tournament_id = (select id from tournament_fixture)), 270, 'ranking points follow the configured scheme');
select is((select count(*)::integer from public.audit_logs where entity_type = 'match' and entity_id in (select id from public.matches where tournament_id = (select id from tournament_fixture))), 9, 'match operations and results are audited');

select * from finish();
rollback;
