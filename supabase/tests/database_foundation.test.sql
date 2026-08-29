begin;

select plan(43);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'events', 'events table exists');
select has_table('public', 'bookings', 'bookings table exists');
select has_table('public', 'event_station_activities', 'event station activity junction exists');
select has_table('public', 'audit_logs', 'audit log table exists');

select results_eq(
  $$select code from public.roles order by code$$,
  $$values ('admin'::text), ('staff'::text), ('super_admin'::text), ('tournament_admin'::text), ('user'::text)$$,
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
select has_view('public', 'public_activities', 'public activity projection exists');
select has_view('public', 'public_news_posts', 'public news projection exists');
select has_view('public', 'public_service_pages', 'public service projection exists');
select hasnt_column('public', 'public_events', 'max_capacity', 'public event projection omits max capacity');
select hasnt_column('public', 'public_events', 'capacity_visibility', 'public event projection omits capacity visibility');
select hasnt_column('public', 'public_news_posts', 'push_on_publish', 'public news projection omits push flag');
select hasnt_column('public', 'public_news_posts', 'author_id', 'public news projection omits author id');
select has_function('public', 'get_my_bookings', array[]::text[], 'safe owner booking function exists');
select has_function(
  'public',
  'set_user_role',
  array['uuid', 'text', 'boolean']::text[],
  'super-admin role management function exists'
);

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
  20,
  'local demo event is seeded with the expected capacity'
);
select is(
  (select count(*)::integer from public.event_stations where event_id = (select id from public.events where slug = 'vrsus-demo')),
  4,
  'local demo event has four station mappings'
);
select is(
  (select count(*)::integer from public.event_station_activities where event_station_id in (
    select id from public.event_stations where event_id = (select id from public.events where slug = 'vrsus-demo')
  )),
  4,
  'local demo event has four station activity mappings'
);
select is(
  (select count(*)::integer from public.public_activities),
  4,
  'public activity projection exposes four active local activities'
);
select is(
  (select count(*)::integer from public.public_news_posts),
  1,
  'public news projection exposes published local content'
);
select is(
  (select count(*)::integer from public.public_service_pages),
  1,
  'public service projection exposes active local content'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'rls-user-a@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'rls-user-b@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000ad', 'authenticated', 'authenticated', 'rls-super-admin@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000ad', id
from public.roles
where code = 'super_admin';

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
  'super-admin can assign a role'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select throws_ok(
  $$select public.set_user_role('00000000-0000-0000-0000-0000000000a1'::uuid, 'admin', true)$$,
  '42501',
  'super_admin role required',
  'normal users cannot assign roles'
);

set local role postgres;
select is(
  (select count(*)::integer from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000a1'),
  1,
  'super-admin role assignment is persisted'
);

with fixture as (
  insert into public.events (slug, title, starts_at, ends_at)
  values
    ('rls-fixture-event-a', 'Fixture event A', timezone('utc', now()), timezone('utc', now()) + interval '1 hour'),
    ('rls-fixture-event-b', 'Fixture event B', timezone('utc', now()), timezone('utc', now()) + interval '1 hour')
  returning id, slug
), station as (
  insert into public.stations (slug, name)
  values ('rls-fixture-station', 'Fixture station')
  returning id
), activity as (
  insert into public.activities (slug, name)
  values ('rls-fixture-activity', 'Fixture activity')
  returning id
), event_station as (
  insert into public.event_stations (event_id, station_id)
  select fixture.id, station.id
  from fixture cross join station
  where fixture.slug = 'rls-fixture-event-a'
  returning id
), event_activity as (
  insert into public.event_activities (event_id, activity_id, access_mode)
  select fixture.id, activity.id, 'free_play'
  from fixture cross join activity
  where fixture.slug = 'rls-fixture-event-b'
  returning id
)
select throws_ok(
  format(
    'insert into public.event_station_activities (event_station_id, event_activity_id) values (%L::uuid, %L::uuid)',
    (select id from event_station),
    (select id from event_activity)
  ),
  '23514',
  'event station and event activity must belong to the same event',
  'junction rejects resources from different events'
);

select * from finish();

rollback;
