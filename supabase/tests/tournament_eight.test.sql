begin;

select plan(10);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
select
  ('00000000-0000-0000-0000-00000000000' || number::text)::uuid,
  'authenticated',
  'authenticated',
  format('eight-player-%s@example.test', number),
  'not-a-real-password',
  timezone('utc', now())
from generate_series(1, 8) as fixture(number);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values ('00000000-0000-0000-0000-0000000000e8', 'authenticated', 'authenticated', 'eight-admin@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000e8', id from public.roles where code = 'tournament_admin';

insert into public.tournaments (
  event_id, event_activity_id, slug, name, status, checkin_required, ranking_enabled, is_public
)
select
  event.id,
  event_activity.id,
  'eight-player-tournament',
  'Eight Player Tournament',
  'registration_closed',
  false,
  true,
  true
from public.events event
join public.event_activities event_activity on event_activity.event_id = event.id
where event.slug = 'vrsus-demo'
limit 1;

insert into public.tournament_entries (tournament_id, display_name, seed)
select tournament.id, format('Player %s', number), number
from public.tournaments tournament
cross join generate_series(1, 8) as fixture(number)
where tournament.slug = 'eight-player-tournament';

insert into public.tournament_entry_members (entry_id, user_id, is_captain)
select entry.id,
  ('00000000-0000-0000-0000-00000000000' || entry.seed::text)::uuid,
  true
from public.tournament_entries entry
join public.tournaments tournament on tournament.id = entry.tournament_id
where tournament.slug = 'eight-player-tournament';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e8', true);
set local role authenticated;

select ok(
  public.create_single_elimination_bracket((select id from public.tournaments where slug = 'eight-player-tournament')) = 7,
  'eight eligible entries create a seven-match bracket'
);
select is(
  (select count(*)::integer from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.slug = 'eight-player-tournament' and match.round_number = 1),
  4,
  'eight-player bracket creates four quarterfinals'
);
select is(
  (select count(*)::integer from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.slug = 'eight-player-tournament' and match.round_number = 1 and match.status = 'ready'),
  4,
  'all quarterfinals are ready'
);

do $$
declare v_match record;
begin
  for v_match in
    select match.id, match.entry_a_id
    from public.matches match
    join public.tournaments tournament on tournament.id = match.tournament_id
    where tournament.slug = 'eight-player-tournament' and match.round_number = 1
    order by match.bracket_position
  loop
    perform public.call_tournament_match(v_match.id);
    perform public.start_tournament_match(v_match.id);
    perform public.record_match_result(v_match.id, '{"round": 1}'::jsonb, v_match.entry_a_id);
  end loop;
end;
$$;

select is(
  (select count(*)::integer from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.slug = 'eight-player-tournament' and match.round_number = 2 and match.status = 'ready'),
  2,
  'semifinals become ready after quarterfinal results'
);

do $$
declare v_match record;
begin
  for v_match in
    select match.id, match.entry_a_id
    from public.matches match
    join public.tournaments tournament on tournament.id = match.tournament_id
    where tournament.slug = 'eight-player-tournament' and match.round_number = 2
    order by match.bracket_position
  loop
    perform public.call_tournament_match(v_match.id);
    perform public.start_tournament_match(v_match.id);
    perform public.record_match_result(v_match.id, '{"round": 2}'::jsonb, v_match.entry_a_id);
  end loop;
end;
$$;

select is(
  (select count(*)::integer from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.slug = 'eight-player-tournament' and match.round_number = 3 and match.status = 'ready'),
  1,
  'final becomes ready after semifinal results'
);

select public.call_tournament_match(
  (select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.slug = 'eight-player-tournament' and match.round_number = 3)
);
select public.start_tournament_match(
  (select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.slug = 'eight-player-tournament' and match.round_number = 3)
);
select public.record_match_result(
  (select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.slug = 'eight-player-tournament' and match.round_number = 3),
  '{"round": 3}'::jsonb,
  (select match.entry_a_id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.slug = 'eight-player-tournament' and match.round_number = 3)
);

set local role postgres;
select is(
  (select status from public.tournaments where slug = 'eight-player-tournament'),
  'completed',
  'eight-player final completes the tournament'
);
select is(
  (select count(*)::integer from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.slug = 'eight-player-tournament' and match.status = 'completed'),
  7,
  'every eight-player bracket match is completed'
);
select is(
  (select count(*)::integer from public.ranking_points_ledger ledger join public.tournaments tournament on tournament.id = ledger.tournament_id where tournament.slug = 'eight-player-tournament'),
  2,
  'eight-player result awards winner and runner-up once'
);
select is(
  (select sum(points)::integer from public.ranking_points_ledger ledger join public.tournaments tournament on tournament.id = ledger.tournament_id where tournament.slug = 'eight-player-tournament'),
  160,
  'eight-player scoring follows the ledger rules'
);
select is(
  (select count(*)::integer from public.audit_logs log join public.matches match on match.id = log.entity_id join public.tournaments tournament on tournament.id = match.tournament_id where tournament.slug = 'eight-player-tournament' and log.action = 'record_match_result'),
  7,
  'every eight-player result is audited'
);

select * from finish();
