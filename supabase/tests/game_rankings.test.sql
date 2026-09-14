begin;

select plan(13);

-- ---------------------------------------------------------------------------
-- Superficie
-- ---------------------------------------------------------------------------

select has_table('public', 'game_rankings', 'game_rankings table exists');
select has_column(
  'public',
  'game_scores',
  'ranking_id',
  'a score belongs to a challenge, not only to a game'
);
select has_view(
  'public',
  'public_game_rankings',
  'public projection of the challenges exists'
);
select has_view(
  'public',
  'public_ranking_standings',
  'public standings view exists'
);

-- ---------------------------------------------------------------------------
-- Fixture
-- ---------------------------------------------------------------------------

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000f1', 'authenticated', 'authenticated', 'rank-user@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000f2', 'authenticated', 'authenticated', 'rank-staff@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000f3', 'authenticated', 'authenticated', 'rank-admin@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000f2', id from public.roles where code = 'staff';
insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000f3', id from public.roles where code = 'admin';

create temporary table rank_test_refs (game_id uuid, ranking_id uuid);
grant select, insert, update on rank_test_refs to authenticated;

insert into rank_test_refs (game_id)
select id from public.games
where active = true and archived_at is null
order by created_at
limit 1;

insert into public.game_rankings (game_id, name, rules, score_kind, score_direction)
select game_id, 'Sfida di prova', 'Mappa di prova, un giro.', 'time', 'asc'
from rank_test_refs;

update rank_test_refs
set ranking_id = (select id from public.game_rankings where name = 'Sfida di prova');

insert into public.game_scores (ranking_id, game_id, user_id, score, recorded_by)
select
  refs.ranking_id,
  refs.game_id,
  '00000000-0000-0000-0000-0000000000f1',
  attempt.score,
  '00000000-0000-0000-0000-0000000000f2'
from rank_test_refs refs
cross join (values (102.5), (99.8)) as attempt(score);

-- ---------------------------------------------------------------------------
-- Chi puo fare cosa
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);

select is(
  (select count(*)::integer from public.public_game_rankings where name = 'Sfida di prova'),
  1,
  'an ordinary user reads the challenge from the public view'
);

select is(
  (
    select best_score::numeric
    from public.public_ranking_standings
    where ranking_id = (select ranking_id from rank_test_refs)
  ),
  99.8::numeric,
  'the standings keep the best attempt, the lowest time here'
);

select is(
  (
    select attempts
    from public.public_ranking_standings
    where ranking_id = (select ranking_id from rank_test_refs)
  ),
  2,
  'both attempts are counted'
);

select throws_ok(
  $$select count(*) from public.game_scores$$,
  '42501',
  null,
  'raw scores stay closed to the browser'
);

select is(
  (
    select count(*)::integer from public.game_rankings
    where name = 'Sfida di prova'
  ),
  0,
  'an ordinary user sees no challenge on the table itself'
);

select throws_ok(
  $$insert into public.game_rankings (game_id, name)
    select game_id, 'Sfida abusiva' from rank_test_refs$$,
  '42501',
  null,
  'an ordinary user cannot create a challenge'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
-- Solo la sfida di questa prova: il database di sviluppo puo averne altre
-- (DEC-030).
select is(
  (
    select count(*)::integer from public.game_rankings
    where name = 'Sfida di prova'
  ),
  1,
  'staff reads the challenges, to register scores during the evening'
);

-- Su UPDATE la RLS filtra le righe invece di sollevare un errore: la prova e
-- che dopo il tentativo la sfida sia ancora aperta.
update public.game_rankings set status = 'closed' where name = 'Sfida di prova';
select is(
  (select status from public.game_rankings where name = 'Sfida di prova'),
  'open',
  'staff cannot change the rules of a challenge'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', true);
select lives_ok(
  $$update public.game_rankings set status = 'closed'
    where name = 'Sfida di prova'$$,
  'an admin closes the challenge'
);

select * from finish();

rollback;
