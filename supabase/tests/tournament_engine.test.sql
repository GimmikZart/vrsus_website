begin;

-- Motore tornei elastico: manche, tempi, squadre e slug automatico.
--
-- I formati storici (eliminazione diretta e girone) restano coperti da
-- tournament_v2 e tournament_eight: qui si verifica quello che prima non era
-- nemmeno esprimibile.

select plan(26);

select has_table('public', 'match_participants', 'match participants table exists');
select has_function('public', 'generate_tournament_schedule', array['uuid']::text[], 'schedule RPC exists');
select has_function('public', 'record_match_results', array['uuid', 'jsonb']::text[], 'results RPC exists');
select has_function('public', 'create_tournament_team', array['uuid', 'text', 'text']::text[], 'team creation RPC exists');
select has_function('public', 'join_tournament_team', array['uuid', 'text']::text[], 'team join RPC exists');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
select ('00000000-0000-0000-0000-0000000002' || lpad(index::text, 2, '0'))::uuid,
  'authenticated', 'authenticated', 'engine-' || index || '@example.test',
  'not-a-real-password', timezone('utc', now())
from generate_series(1, 16) as index;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values ('00000000-0000-0000-0000-0000000002ff', 'authenticated', 'authenticated',
  'engine-admin@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000002ff', id from public.roles where code = 'tournament_admin';

-- Fixture: un torneo con la configurazione data e N iscritti gia pronti.
create function pg_temp.make_tournament(
  p_name text, p_game_slug text, p_format text, p_result_kind text,
  p_entry_size integer, p_group_size integer, p_rounds integer,
  p_entries integer, p_seeding text default 'rotation')
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_entry uuid;
  v_index integer;
  v_member integer;
begin
  insert into public.tournaments (
    platform_id, game_id, name, status, checkin_required, ranking_enabled,
    is_public, format, entry_size, team_formation, group_size, rounds_count,
    result_kind, heat_seeding)
  select game.platform_id, game.id, p_name, 'registration_closed', false, false,
    true, p_format, p_entry_size,
    case when p_entry_size = 1 then 'solo' else 'open' end,
    p_group_size, p_rounds, p_result_kind, p_seeding
  from public.games game where game.slug = p_game_slug
  returning id into v_id;

  for v_index in 1 .. p_entries loop
    insert into public.tournament_entries (tournament_id, display_name, status)
    values (v_id, 'Entry ' || v_index, 'registered')
    returning id into v_entry;

    for v_member in 1 .. p_entry_size loop
      insert into public.tournament_entry_members (entry_id, user_id, is_captain)
      values (v_entry,
        ('00000000-0000-0000-0000-0000000002'
          || lpad((((v_index - 1) * p_entry_size + v_member - 1) % 16 + 1)::text, 2, '0'))::uuid,
        v_member = 1);
    end loop;
  end loop;

  return v_id;
end;
$$;

-- Chiude tutte le partite aperte di un round.
create function pg_temp.play_round(p_tournament_id uuid, p_round integer)
returns integer
language plpgsql
as $$
declare
  v_match record;
  v_results jsonb;
  v_kind text;
  v_played integer := 0;
  v_offset integer := 0;
begin
  select result_kind into v_kind from public.tournaments where id = p_tournament_id;

  for v_match in
    select id from public.matches
    where tournament_id = p_tournament_id and round_number = p_round
      and status <> 'completed'
    order by bracket_position
  loop
    v_offset := v_offset + 1;
    select jsonb_agg(item) into v_results
    from (
      select case v_kind
        when 'win_loss' then jsonb_build_object('entry_id', part.entry_id,
          'outcome', case when part.slot = 1 then 'win' else 'loss' end)
        when 'placement' then jsonb_build_object('entry_id', part.entry_id,
          'placement', part.slot)
        else jsonb_build_object('entry_id', part.entry_id,
          'score', 100 - part.slot * 3 - v_offset)
      end as item
      from public.match_participants part
      where part.match_id = v_match.id and part.entry_id is not null
    ) rows;

    perform public.record_match_results(v_match.id, v_results);
    v_played := v_played + 1;
  end loop;

  return v_played;
end;
$$;

create temp table engine_fixture (label text primary key, id uuid);
grant select on engine_fixture to authenticated;

insert into engine_fixture
select 'heats', pg_temp.make_tournament(
  'Engine heats', 'mario-kart-8', 'heats', 'placement', 1, 4, 3, 16);
insert into engine_fixture
select 'trial', pg_temp.make_tournament(
  'Engine trial', 'gran-turismo-7', 'time_trial', 'time', 2, 1, 2, 8);
insert into engine_fixture
select 'teams', pg_temp.make_tournament(
  'Engine teams', 'ea-fc', 'single_elimination', 'win_loss', 2, 2, null, 4);

-- Lo slug arriva da piattaforma, gioco e data: non lo scrive nessuno.
select matches(
  (select slug from public.tournaments where name = 'Engine heats'),
  '^nintendo-switch-mario-kart-8-[0-9]{2}-[0-9]{2}-[0-9]{4}(-[0-9]+)?$',
  'slug is built from platform, game and date'
);

-- La configurazione incoerente viene corretta invece di essere accettata.
select is(
  (select standing_metric from public.tournaments where name = 'Engine trial'),
  'best_time',
  'a time tournament is ranked by best time'
);
select is(
  (select score_direction from public.tournaments where name = 'Engine trial'),
  'asc',
  'time results always rank the lowest first'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000002ff', true);
set local role authenticated;

-- --- Manche ----------------------------------------------------------------

select is(
  public.generate_tournament_schedule((select id from engine_fixture where label = 'heats')),
  12,
  'sixteen players in groups of four over three rounds make twelve heats'
);

set local role postgres;
select is(
  (select count(*)::integer from public.match_participants part
   join public.matches match on match.id = part.match_id
   where match.tournament_id = (select id from engine_fixture where label = 'heats')
     and match.round_number = 1),
  16,
  'every player races in every round'
);

-- Il senso della rotazione: nessuno incontra due volte la stessa persona.
select is(
  (select count(*)::integer from (
    select least(mine.entry_id::text, theirs.entry_id::text) as a,
      greatest(mine.entry_id::text, theirs.entry_id::text) as b
    from public.match_participants mine
    join public.match_participants theirs
      on theirs.match_id = mine.match_id and mine.entry_id < theirs.entry_id
    join public.matches match on match.id = mine.match_id
    where match.tournament_id = (select id from engine_fixture where label = 'heats')
    group by 1, 2 having count(*) > 1
  ) repeated),
  0,
  'the rotation never repeats a pairing'
);

set local role authenticated;
select is(
  pg_temp.play_round((select id from engine_fixture where label = 'heats'), 1),
  4,
  'the first round is four heats'
);

set local role postgres;
select is(
  (select points::integer from public.tournament_standings(
     (select id from engine_fixture where label = 'heats')) where standing_position = 1),
  10,
  'the winner of a heat takes the first placement points'
);
select is(
  (select count(*)::integer from public.tournament_standings(
     (select id from engine_fixture where label = 'heats')) where standing_position is not null),
  16,
  'the standings hold every player'
);

set local role authenticated;
select ok(
  pg_temp.play_round((select id from engine_fixture where label = 'heats'), 2)
  + pg_temp.play_round((select id from engine_fixture where label = 'heats'), 3) = 8,
  'the remaining heats can be played'
);

set local role postgres;
select is(
  (select status from public.tournaments where id = (select id from engine_fixture where label = 'heats')),
  'completed',
  'the tournament closes when the last heat is recorded'
);
select is(
  (select points::integer from public.tournament_standings(
     (select id from engine_fixture where label = 'heats')) where standing_position = 1),
  30,
  'points add up across the heats'
);

-- --- Tempi -----------------------------------------------------------------

set local role authenticated;
select is(
  public.generate_tournament_schedule((select id from engine_fixture where label = 'trial')),
  16,
  'eight pairs with two attempts make sixteen runs'
);
select ok(
  pg_temp.play_round((select id from engine_fixture where label = 'trial'), 1)
  + pg_temp.play_round((select id from engine_fixture where label = 'trial'), 2) = 16,
  'every attempt can be recorded'
);

set local role postgres;
select ok(
  (select best_score from public.tournament_standings(
     (select id from engine_fixture where label = 'trial')) where standing_position = 1)
  <= (select best_score from public.tournament_standings(
     (select id from engine_fixture where label = 'trial')) where standing_position = 2),
  'the lowest time leads the standings'
);

-- --- Squadre ---------------------------------------------------------------

-- Una squadra spaiata blocca la partenza: o la si completa, o la si toglie.
set local role postgres;
insert into public.tournament_entries (tournament_id, display_name, status)
select id, 'Squadra spaiata', 'forming' from engine_fixture where label = 'teams';

set local role authenticated;
select throws_ok(
  $$select public.generate_tournament_schedule((select id from engine_fixture where label = 'teams'))$$,
  'P0001',
  'INCOMPLETE_TEAMS',
  'a tournament does not start with an incomplete team'
);

set local role postgres;
delete from public.tournament_entries
where tournament_id = (select id from engine_fixture where label = 'teams')
  and display_name = 'Squadra spaiata';

set local role authenticated;
select is(
  public.generate_tournament_schedule((select id from engine_fixture where label = 'teams')),
  3,
  'four complete teams make a three-match bracket'
);

-- Il codice di invito apre la squadra solo a chi lo ha: un torneo nuovo, con
-- le iscrizioni ancora aperte.
set local role postgres;
with created as (
  insert into public.tournaments (
    platform_id, game_id, name, status, checkin_required, ranking_enabled,
    is_public, format, entry_size, team_formation, result_kind)
  select game.platform_id, game.id, 'Engine invite', 'registration_open', false,
    false, true, 'single_elimination', 2, 'invite', 'win_loss'
  from public.games game where game.slug = 'ea-fc'
  returning id
)
insert into engine_fixture select 'invite', id from created;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
set local role authenticated;
select ok(
  public.create_tournament_team(
    (select id from engine_fixture where label = 'invite'), 'Gli Invitati', 'invite') is not null,
  'a captain can open a team by invitation'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
select throws_ok(
  $$select public.join_tournament_team((select id from public.tournament_entries where display_name = 'Gli Invitati'), null)$$,
  '42501',
  'CODE_REQUIRED',
  'knowing the team id is not enough to join a private team'
);

select is(
  public.join_tournament_team(
    null,
    (select join_code from public.tournament_entries where display_name = 'Gli Invitati')),
  (select id from public.tournament_entries where display_name = 'Gli Invitati'),
  'the invite code lets a friend in'
);

set local role postgres;
select is(
  (select status from public.tournament_entries where display_name = 'Gli Invitati'),
  'registered',
  'a full team stops being in formation'
);

select * from finish();
rollback;
