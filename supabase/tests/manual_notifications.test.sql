begin;
select plan(11);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000d1', 'authenticated', 'authenticated', 'manual-admin@example.test', 'test', now()),
  ('00000000-0000-0000-0000-0000000000d2', 'authenticated', 'authenticated', 'manual-present@example.test', 'test', now()),
  ('00000000-0000-0000-0000-0000000000d3', 'authenticated', 'authenticated', 'manual-absent@example.test', 'test', now());

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000d1', id
from public.roles where code = 'admin';

insert into public.events (id, slug, title, status, starts_at, ends_at)
values ('00000000-0000-0000-0000-0000000000d4', 'manual-live-test', 'Manual Live Test', 'running', now(), now() + interval '5 hours');
insert into public.bookings (id, event_id, user_id, status)
values ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d2', 'confirmed');
insert into public.event_checkins (event_id, booking_id, user_id, checked_in_by, payment_status_at_checkin)
values ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d5',
  '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d1', 'not_required');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d3', true);
select throws_ok(
  $$select public.send_manual_notification('all', null, 'No', '00000000-0000-0000-0000-0000000000d6')$$,
  '42501', 'FORBIDDEN', 'ordinary users cannot send notifications');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select throws_ok(
  $$select public.send_manual_notification('all', null, repeat('x', 301), '00000000-0000-0000-0000-0000000000d6')$$,
  '22023', 'INVALID_MANUAL_NOTIFICATION', 'message length is enforced by database');
select throws_ok(
  $$select public.send_manual_notification('live_event', '00000000-0000-0000-0000-0000000000d9', 'Hi', '00000000-0000-0000-0000-0000000000d6')$$,
  '22023', 'EVENT_NOT_RUNNING', 'closed or missing event is rejected');

select is(public.send_manual_notification('live_event', '00000000-0000-0000-0000-0000000000d4', 'Present only', '00000000-0000-0000-0000-0000000000d6'), 1,
  'live audience is exactly one checked-in user');
select is(public.send_manual_notification('live_event', '00000000-0000-0000-0000-0000000000d4', 'Present only', '00000000-0000-0000-0000-0000000000d6'), 1,
  'retry returns prior recipient count');

set local role postgres;
select is((select count(*)::integer from public.notifications where type = 'manual' and metadata->>'dispatch_id' = '00000000-0000-0000-0000-0000000000d6'), 1,
  'retry does not create a second notification');
select is((select user_id from public.notifications where metadata->>'dispatch_id' = '00000000-0000-0000-0000-0000000000d6'),
  '00000000-0000-0000-0000-0000000000d2'::uuid, 'only checked-in user receives live notification');

set local role authenticated;
select ok(public.send_manual_notification('all', null, 'Everyone', '00000000-0000-0000-0000-0000000000d7') >= 3,
  'all audience includes the fixture profiles');
set local role postgres;
select is((select count(*)::integer from public.notifications where metadata->>'dispatch_id' = '00000000-0000-0000-0000-0000000000d7'),
  (select count(*)::integer from public.profiles), 'all send persists one notification per profile');
select is((select count(*)::integer from public.audit_logs where action = 'manual_notification_sent' and entity_id in
  ('00000000-0000-0000-0000-0000000000d6', '00000000-0000-0000-0000-0000000000d7')),
  2, 'each send is audited once');
select is((select count(*)::integer from public.notifications where type = 'manual' and user_id = '00000000-0000-0000-0000-0000000000d3'
  and metadata->>'scope' = 'live_event'), 0, 'unpresent user is excluded from live send');

select * from finish();
rollback;
