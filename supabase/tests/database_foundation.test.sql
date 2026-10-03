begin;

select plan(64);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'events', 'events table exists');
select has_table('public', 'bookings', 'bookings table exists');
select has_table('public', 'platforms', 'platforms table exists');
select has_table('public', 'games', 'games table exists');
select has_table('public', 'event_platform_games', 'event platform game junction exists');
select has_table('public', 'audit_logs', 'audit log table exists');

select results_eq(
  $$select code from public.roles order by code$$,
  $$values ('admin'::text), ('staff'::text), ('user'::text)$$,
  'required RBAC roles are seeded'
);

select col_is_pk('public', 'profiles', 'id', 'profiles id is the primary key');
select col_hasnt_default('public', 'profiles', 'id', 'profiles id is supplied by auth.users');
select has_index('public', 'bookings', 'bookings_one_active_per_event_user_idx', 'active booking uniqueness index exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.events'::regclass),
  'RLS is enabled for events'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.bookings'::regclass),
  'RLS is enabled for bookings'
);
select ok(
  not has_table_privilege('anon', 'public.events', 'select'),
  'anonymous clients cannot select the raw events table'
);
select ok(
  not has_table_privilege('authenticated', 'public.bookings', 'select'),
  'authenticated clients cannot select raw bookings with admin notes'
);

-- DEC-005 sopravvive alla rinomina del dominio: nessun grant diretto sulle
-- tabelle che contengono capienza e note amministrative.
select is(
  (select count(*)::integer
   from information_schema.role_table_grants
   where table_schema = 'public'
     and grantee in ('anon', 'authenticated')
     and table_name in ('events', 'bookings', 'event_checkins', 'platforms',
       'event_platforms', 'event_platform_games', 'platform_categories')),
  0,
  'the renamed event domain keeps no direct grants for browser roles'
);

-- TRUNCATE non e soggetto a RLS: nessun ruolo del browser deve averlo.
select is(
  (select count(*)::integer
   from information_schema.role_table_grants grant_row
   join information_schema.tables table_row
     on table_row.table_schema = grant_row.table_schema
    and table_row.table_name = grant_row.table_name
   where grant_row.table_schema = 'public'
     and grant_row.grantee in ('anon', 'authenticated')
     and table_row.table_type = 'BASE TABLE'
     and grant_row.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')),
  0,
  'browser roles hold no truncate, references or trigger privilege'
);

select ok(
  not has_table_privilege('authenticated', 'public.guardian_consents', 'select'),
  'guardian contact details are unreachable from the browser'
);

set local role anon;
select is(
  (select count(*)::integer from public.service_inquiries),
  0,
  'anonymous clients cannot select service inquiries through RLS'
);
select throws_ok(
  $$insert into public.service_inquiries (name, email, message) values ('Anon', 'anon@example.test', 'Rejected')$$,
  '42501',
  'new row violates row-level security policy for table "service_inquiries"',
  'anonymous clients cannot insert service inquiries directly'
);
set local role postgres;

select has_view('public', 'public_events', 'public event projection exists');
select has_view('public', 'public_platforms', 'public platform projection exists');
select has_view('public', 'public_games', 'public game projection exists');
select has_view('public', 'public_board_posts', 'public board projection exists');
select has_view('public', 'public_service_pages', 'public service projection exists');
select hasnt_column('public', 'public_events', 'max_capacity', 'public event projection omits max capacity');
select hasnt_column('public', 'public_events', 'capacity_visibility', 'public event projection omits capacity visibility');
select hasnt_column('public', 'public_platforms', 'default_capacity', 'public platform projection omits standard capacity');
select hasnt_column('public', 'public_platforms', 'internal', 'public platform projection omits the internal flag');
select has_function('public', 'get_my_bookings', array[]::text[], 'safe owner booking function exists');
select has_function(
  'public',
  'set_user_role',
  array['uuid', 'text', 'boolean']::text[],
  'admin role management function exists'
);
select has_function('public', 'is_minor', array['date']::text[], 'minor age helper exists');

select is(
  (select count(*)::integer from storage.buckets where id = 'vrsus-assets' and public = true and file_size_limit = 5242880),
  1,
  'CMS asset bucket is public with a five megabyte limit'
);
select is(
  (select count(*)::integer from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname in ('admin_assets_insert', 'admin_assets_update', 'admin_assets_delete')),
  3,
  'CMS asset mutations have three admin-only storage policies'
);
select ok(
  not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'public_assets_insert'),
  'storage has no public asset insert policy'
);
select ok(
  not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'public_assets_delete'),
  'storage has no public asset delete policy'
);

select is(
  (select max_capacity from public.events where slug = 'vrsus-demo'),
  40,
  'local demo event is seeded with the expected capacity'
);
select is(
  (select count(*)::integer from public.event_platforms where event_id = (select id from public.events where slug = 'vrsus-demo')),
  5,
  'local demo event has five platform mappings'
);
select is(
  (select count(*)::integer from public.event_platform_games where event_platform_id in (
    select id from public.event_platforms where event_id = (select id from public.events where slug = 'vrsus-demo')
  )),
  11,
  'local demo event has eleven platform game mappings'
);

-- La piattaforma interna esiste ma non deve mai raggiungere la vetrina.
select ok(
  (select count(*)::integer from public.platforms) >= 6,
  'the local platform fixtures are seeded'
);
select is(
  (select count(*)::integer from public.platforms where internal = true and slug = 'postazione-regia'),
  1,
  'the internal platform fixture exists'
);
select ok(
  not exists (select 1 from public.public_platforms where slug = 'postazione-regia'),
  'the internal platform is absent from the public projection'
);
select is(
  (select count(*)::integer from public.public_games game
   join public.platforms platform on platform.id = game.platform_id
   where platform.internal = true),
  0,
  'the public game projection never exposes games of internal platforms'
);
select ok(
  exists (select 1 from public.public_board_posts where slug = 'benvenuti-in-vrsus')
  and exists (select 1 from public.public_board_posts where slug = 'quale-torneo-volete'),
  'public board projection exposes the published local fixtures'
);
select ok(
  (select count(*)::integer from public.public_service_pages) >= 4,
  'public service projection exposes the active local fixtures'
);

select ok(
  public.is_minor((current_date - interval '10 years')::date),
  'a ten year old is a minor'
);
select ok(
  not public.is_minor((current_date - interval '30 years')::date),
  'a thirty year old is not a minor'
);
select ok(
  not public.is_minor(null),
  'an unknown birth date is not treated as a minor'
);

-- Il motore dei punti risolve sia la posizione singola sia l'intervallo.
select is(
  public._scheme_points(
    (select id from public.point_schemes where slug = 'eliminazione-diretta-standard'),
    'placement', 1),
  100,
  'the knockout scheme awards one hundred points to the winner'
);
select is(
  public._scheme_points(
    (select id from public.point_schemes where slug = 'eliminazione-diretta-standard'),
    'placement', 3),
  35,
  'a placement range covers third and fourth place'
);
select is(
  public._scheme_points(
    (select id from public.point_schemes where slug = 'eliminazione-diretta-standard'),
    'participation', null),
  10,
  'participation points are resolved without a placement'
);
select is(
  public._scheme_points(
    (select id from public.point_schemes where slug = 'girone-standard'),
    'match_win', null),
  15,
  'the group scheme awards points per match won'
);
select is(
  public._scheme_points(
    (select id from public.point_schemes where slug = 'eliminazione-diretta-standard'),
    'placement', 99),
  null,
  'a placement outside every rule resolves to no points'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'rls-user-a@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'rls-user-b@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000ad', 'authenticated', 'authenticated', 'rls-admin@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000ad', id
from public.roles
where code = 'admin';

select is(
  (select count(*)::integer from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000ad'),
  3,
  'an admin assignment includes user and staff roles'
);

insert into public.notifications (user_id, type, title, message)
values
  ('00000000-0000-0000-0000-0000000000a1', 'test', 'User A', 'Private notification A'),
  ('00000000-0000-0000-0000-0000000000b1', 'test', 'User B', 'Private notification B');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.profiles),
  1,
  'user A can read only user A profile'
);
select is(
  (select count(*)::integer from public.notifications),
  1,
  'user A can read only user A notifications'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select is(
  (select count(*)::integer from public.profiles),
  1,
  'user B can read only user B profile'
);
select is(
  (select count(*)::integer from public.notifications),
  1,
  'user B can read only user B notifications'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', true);
select lives_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-0000000000a1'::uuid, 'staff', true)$$,
  'admin can assign a role'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-0000000000a1'::uuid, 'admin', true)$$,
  '42501',
  'admin role required',
  'normal users cannot assign roles'
);

set local role postgres;
select is(
  (select count(*)::integer from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000a1'),
  2,
  'admin role assignment is persisted'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
set local role authenticated;
select lives_ok(
  $$insert into public.user_feedback (user_id, kind, body)
    values ('00000000-0000-0000-0000-0000000000a1', 'problem', 'Problema di prova')$$,
  'users can submit the problem feedback type'
);
select is(
  (select kind from public.user_feedback where user_id = '00000000-0000-0000-0000-0000000000a1' limit 1),
  'problem',
  'problem feedback is stored with its own kind'
);
set local role postgres;

-- Il nickname e unico a livello di database, non solo di interfaccia.
select throws_ok(
  $$update public.profiles
    set nickname = (select nickname from public.profiles where id = '00000000-0000-0000-0000-0000000000b1')
    where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '23505',
  null,
  'a duplicate nickname is rejected by the unique index'
);

select * from finish();

rollback;
