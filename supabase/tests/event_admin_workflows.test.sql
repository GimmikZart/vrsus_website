begin;

select plan(13);

select has_function(
  'public',
  'duplicate_event',
  array['uuid', 'text', 'text', 'timestamptz', 'timestamptz']::text[],
  'duplicate event RPC exists'
);
select has_function(
  'public',
  'archive_event',
  array['uuid']::text[],
  'archive event RPC exists'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000e1', 'authenticated', 'authenticated', 'event-admin@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000e2', 'authenticated', 'authenticated', 'event-user@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000e1', id
from public.roles
where code = 'admin';

set local role postgres;
create temporary table event_duplicate_source (id uuid not null);
insert into event_duplicate_source
select id from public.events where slug = 'vrsus-demo';
grant select on event_duplicate_source to authenticated;
create temporary table event_duplicate_result (id uuid not null);
grant select, insert on event_duplicate_result to authenticated;
set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
insert into event_duplicate_result
select public.duplicate_event(
  (select id from event_duplicate_source),
  'duplicated-event-fixture',
  'Duplicated Event Fixture',
  timezone('utc', now()) + interval '30 days',
  timezone('utc', now()) + interval '30 days 8 hours'
);
select ok(
  (select id is not null from event_duplicate_result),
  'admin can duplicate an event configuration'
);

set local role postgres;
select is(
  (select status from public.events where slug = 'duplicated-event-fixture'),
  'draft',
  'duplicated event starts as a draft'
);
select is(
  (select is_public from public.events where slug = 'duplicated-event-fixture'),
  false,
  'duplicated event is private by default'
);
select is(
  (select max_capacity from public.events where slug = 'duplicated-event-fixture'),
  (select max_capacity from public.events where slug = 'vrsus-demo'),
  'duplicated event preserves capacity configuration'
);
select is(
  (
    select count(*)::integer
    from public.event_stations station
    join public.events event on event.id = station.event_id
    where event.slug = 'duplicated-event-fixture'
  ),
  4,
  'duplicated event copies station mappings'
);
select is(
  (
    select count(*)::integer
    from public.event_activities activity
    join public.events event on event.id = activity.event_id
    where event.slug = 'duplicated-event-fixture'
  ),
  4,
  'duplicated event copies activity mappings'
);
select is(
  (
    select count(*)::integer
    from public.event_station_activities link
    join public.event_stations station on station.id = link.event_station_id
    join public.events event on event.id = station.event_id
    where event.slug = 'duplicated-event-fixture'
  ),
  4,
  'duplicated event copies station-activity links'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', true);
select throws_ok(
  $$select public.duplicate_event((select id from event_duplicate_source), 'forbidden-copy', 'Forbidden Copy', now(), now() + interval '1 hour')$$,
  'P0001',
  'FORBIDDEN',
  'ordinary users cannot duplicate events'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
select is(
  public.archive_event((select id from event_duplicate_result)),
  true,
  'admin can archive an event'
);
set local role postgres;
select ok(
  (
    select archived_at is not null and is_public = false and booking_enabled = false
    from public.events
    where id = (select id from event_duplicate_result)
  ),
  'archiving removes public visibility and closes booking'
);
select is(
  (
    select count(*)::integer
    from public.audit_logs
    where action in ('event_duplicated', 'event_archived')
      and entity_id = (select id from event_duplicate_result)
  ),
  2,
  'duplicate and archive actions are audited'
);

select * from finish();

rollback;
