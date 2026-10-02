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

-- Chiude una partita facendo vincere chi occupa il primo posto.
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

insert into public.tournaments (
  event_id, platform_id, game_id, point_scheme_id, name, status,
  checkin_required, ranking_enabled, is_public
)
select
  event.id,
  game.platform_id,
  game.id,
  scheme.id,
  'Eight Player Tournament',
  'registration_closed',
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

insert into public.tournament_entries (tournament_id, display_name, seed)
select tournament.id, format('Player %s', number), number
from public.tournaments tournament
cross join generate_series(1, 8) as fixture(number)
where tournament.name = 'Eight Player Tournament';

insert into public.bookings (event_id, user_id, status, confirmed_at)
select tournament.event_id,
  ('00000000-0000-0000-0000-00000000000' || fixture.number::text)::uuid,
  'confirmed', timezone('utc', now())
from public.tournaments tournament
cross join generate_series(1, 8) as fixture(number)
where tournament.name = 'Eight Player Tournament';

insert into public.tournament_entry_members (entry_id, user_id, is_captain)
select entry.id,
  ('00000000-0000-0000-0000-00000000000' || entry.seed::text)::uuid,
  true
from public.tournament_entries entry
join public.tournaments tournament on tournament.id = entry.tournament_id
where tournament.name = 'Eight Player Tournament';

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e8', true);
set local role authenticated;

select ok(
  public.generate_tournament_schedule((select id from public.tournaments where name = 'Eight Player Tournament')) = 7,
  'eight eligible entries create a seven-match bracket'
);
select is(
  (select count(*)::integer from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Eight Player Tournament' and match.round_number = 1),
  4,
  'eight-player bracket creates four quarterfinals'
);
select is(
  (select count(*)::integer from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Eight Player Tournament' and match.round_number = 1 and match.status = 'ready'),
  4,
  'all quarterfinals are ready'
);

do $$
declare v_match record;
begin
  for v_match in
    select match.id
    from public.matches match
    join public.tournaments tournament on tournament.id = match.tournament_id
    where tournament.name = 'Eight Player Tournament' and match.round_number = 1
    order by match.bracket_position
  loop
    perform public.call_tournament_match(v_match.id);
    perform public.start_tournament_match(v_match.id);
    perform pg_temp.win_first_slot(v_match.id);
  end loop;
end;
$$;

select is(
  (select count(*)::integer from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Eight Player Tournament' and match.round_number = 2 and match.status = 'ready'),
  2,
  'semifinals become ready after quarterfinal results'
);

do $$
declare v_match record;
begin
  for v_match in
    select match.id
    from public.matches match
    join public.tournaments tournament on tournament.id = match.tournament_id
    where tournament.name = 'Eight Player Tournament' and match.round_number = 2
    order by match.bracket_position
  loop
    perform public.call_tournament_match(v_match.id);
    perform public.start_tournament_match(v_match.id);
    perform pg_temp.win_first_slot(v_match.id);
  end loop;
end;
$$;

select is(
  (select count(*)::integer from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Eight Player Tournament' and match.round_number = 3 and match.status = 'ready'),
  1,
  'final becomes ready after semifinal results'
);

select public.call_tournament_match(
  (select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Eight Player Tournament' and match.round_number = 3)
);
select public.start_tournament_match(
  (select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Eight Player Tournament' and match.round_number = 3)
);
select pg_temp.win_first_slot(
  (select match.id from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Eight Player Tournament' and match.round_number = 3));

set local role postgres;
select is(
  (select status from public.tournaments where name = 'Eight Player Tournament'),
  'completed',
  'eight-player final completes the tournament'
);
select is(
  (select count(*)::integer from public.matches match join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Eight Player Tournament' and match.status = 'completed'),
  7,
  'every eight-player bracket match is completed'
);
select is(
  (select count(*)::integer from public.ranking_points_ledger ledger join public.tournaments tournament on tournament.id = ledger.tournament_id where tournament.name = 'Eight Player Tournament'),
  16,
  'eight-player result awards a placement and participation row per entry'
);
select is(
  (select sum(points)::integer from public.ranking_points_ledger ledger join public.tournaments tournament on tournament.id = ledger.tournament_id where tournament.name = 'Eight Player Tournament'),
  390,
  'eight-player scoring follows the configured scheme, ranges included'
);
select is(
  (select count(*)::integer from public.audit_logs log join public.matches match on match.id = log.entity_id join public.tournaments tournament on tournament.id = match.tournament_id where tournament.name = 'Eight Player Tournament' and log.action = 'record_match_results'),
  7,
  'every eight-player result is audited'
);

select * from finish();
