begin;

select plan(21);

select has_function('public', 'update_my_nickname', array['text']::text[], 'nickname RPC exists');
select has_function('public', 'record_guardian_consent',
  array['text', 'text', 'text', 'text', 'text']::text[], 'guardian consent RPC exists');
select has_function('public', 'vote_board_poll', array['uuid', 'uuid']::text[], 'poll vote RPC exists');
select has_function('public', 'generate_tournament_schedule', array['uuid']::text[], 'schedule RPC exists');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000f1', 'authenticated', 'authenticated', 'adult@example.test', 'x', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000f2', 'authenticated', 'authenticated', 'minor@example.test', 'x', timezone('utc', now()));

update public.profiles set birth_date = (current_date - interval '30 years')::date
where id = '00000000-0000-0000-0000-0000000000f1';
update public.profiles set birth_date = (current_date - interval '12 years')::date
where id = '00000000-0000-0000-0000-0000000000f2';

-- Il trigger di registrazione assegna sempre un nickname.
select isnt(
  (select nickname from public.profiles where id = '00000000-0000-0000-0000-0000000000f1'),
  null,
  'the signup trigger assigns a nickname'
);

-- ---------------------------------------------------------------------------
-- Consenso genitoriale
-- ---------------------------------------------------------------------------

-- Un maggiorenne prenota senza consenso.
select lives_ok(
  $$insert into public.bookings (event_id, user_id, status)
    select id, '00000000-0000-0000-0000-0000000000f1', 'confirmed'
    from public.events where slug = 'vrsus-demo'$$,
  'an adult can be booked without a guardian consent'
);

-- Un minore senza consenso non prenota, nemmeno scrivendo direttamente in
-- tabella: la guardia vive nel database e non nell'interfaccia.
select throws_ok(
  $$insert into public.bookings (event_id, user_id, status)
    select id, '00000000-0000-0000-0000-0000000000f2', 'confirmed'
    from public.events where slug = 'vrsus-demo'$$,
  'P0001',
  'GUARDIAN_CONSENT_REQUIRED',
  'a minor without consent cannot be booked even by a direct insert'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
set local role authenticated;

select is(
  (select is_minor from public.my_consent_status()),
  true,
  'the consent status reports the minor age'
);
select is(
  (select has_consent from public.my_consent_status()),
  false,
  'the consent status reports the missing consent'
);

select lives_ok(
  $$select public.record_guardian_consent('Anna', 'Rossi', 'anna.rossi@example.test', null, 'parent')$$,
  'a minor can register a guardian consent'
);
select is(
  (select has_consent from public.my_consent_status()),
  true,
  'the consent becomes visible right after being recorded'
);

set local role postgres;
select lives_ok(
  $$insert into public.bookings (event_id, user_id, status)
    select id, '00000000-0000-0000-0000-0000000000f2', 'confirmed'
    from public.events where slug = 'vrsus-demo'$$,
  'a minor with consent can be booked'
);

-- ---------------------------------------------------------------------------
-- Nickname
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
set local role authenticated;

select is(
  public.update_my_nickname('CampioneVR'),
  'CampioneVR',
  'a user can change their nickname'
);
-- Lo storico non e leggibile dal browser: la verifica passa da postgres.
select throws_ok(
  $$select count(*) from public.profile_nickname_history$$,
  '42501',
  'permission denied for table profile_nickname_history',
  'the nickname history is unreachable from the browser'
);
set local role postgres;
select is(
  (select count(*)::integer from public.profile_nickname_history
   where user_id = '00000000-0000-0000-0000-0000000000f1'),
  1,
  'the previous nickname is kept for moderation'
);
set local role authenticated;
select throws_ok(
  $$select public.update_my_nickname('ab')$$,
  '22023',
  'INVALID_NICKNAME',
  'a nickname shorter than three characters is rejected'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
select throws_ok(
  $$select public.update_my_nickname('CampioneVR')$$,
  '23505',
  'NICKNAME_TAKEN',
  'a nickname already in use is rejected'
);

-- ---------------------------------------------------------------------------
-- Bacheca
-- ---------------------------------------------------------------------------

select lives_ok(
  $$select public.vote_board_poll(
      (select id from public.public_board_posts where slug = 'quale-torneo-volete'),
      (select option.id from public.public_board_poll_options option
       join public.public_board_posts post on post.id = option.post_id
       where post.slug = 'quale-torneo-volete' order by option.sort_order limit 1))$$,
  'an authenticated user can vote a published poll'
);

-- Un secondo voto sostituisce il primo invece di aggiungersi.
select lives_ok(
  $$select public.vote_board_poll(
      (select id from public.public_board_posts where slug = 'quale-torneo-volete'),
      (select option.id from public.public_board_poll_options option
       join public.public_board_posts post on post.id = option.post_id
       where post.slug = 'quale-torneo-volete' order by option.sort_order desc limit 1))$$,
  'changing the vote is allowed'
);

set local role postgres;
select is(
  (select count(*)::integer from public.board_poll_votes
   where user_id = '00000000-0000-0000-0000-0000000000f2'),
  1,
  'one vote per user per poll is enforced by the database'
);

-- Il feedback resta interno e non compare in nessuna proiezione pubblica.
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name like 'public\\_%'
      and column_name = 'internal_notes'
  ),
  'no public projection exposes internal notes'
);

select * from finish();

rollback;
