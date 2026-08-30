begin;

select plan(26);

select has_function(
  'public',
  'create_event_booking',
  array['uuid']::text[],
  'create_event_booking RPC exists'
);
select has_function(
  'public',
  'cancel_event_booking',
  array['uuid']::text[],
  'cancel_event_booking RPC exists'
);
select has_function(
  'public',
  'promote_waitlist',
  array['uuid']::text[],
  'promote_waitlist RPC exists'
);
select has_function(
  'public',
  'get_my_booking_qr',
  array['uuid']::text[],
  'owner QR RPC exists'
);
select has_function(
  'public',
  'mark_onsite_payment',
  array['uuid', 'text']::text[],
  'mark_onsite_payment RPC exists'
);
select has_function(
  'public',
  'check_in_booking',
  array['text', 'text']::text[],
  'check_in_booking RPC exists'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000c1', 'authenticated', 'authenticated', 'booking-user-a@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000c2', 'authenticated', 'authenticated', 'booking-user-b@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000c3', 'authenticated', 'authenticated', 'booking-staff@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000c3', id
from public.roles
where code = 'staff';

insert into public.events (
  slug,
  title,
  status,
  is_public,
  starts_at,
  ends_at,
  booking_enabled,
  max_capacity,
  waitlist_enabled
)
values (
  'booking-workflow-fixture',
  'Booking workflow fixture',
  'scheduled',
  true,
  timezone('utc', now()) + interval '1 day',
  timezone('utc', now()) + interval '1 day 8 hours',
  true,
  1,
  true
);

create temporary table booking_test_event (id uuid not null);
insert into booking_test_event
select id from public.events where slug = 'booking-workflow-fixture';
grant select on booking_test_event to authenticated;

create temporary table booking_test_records (
  user_id uuid not null,
  booking_id uuid not null,
  status text not null
);
grant select, insert on booking_test_records to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);

insert into booking_test_records (user_id, booking_id, status)
select '00000000-0000-0000-0000-0000000000c1', booking_id, status
from public.create_event_booking((select id from booking_test_event));
select is(
  (select status from booking_test_records where user_id = '00000000-0000-0000-0000-0000000000c1'),
  'confirmed',
  'first booking is confirmed while capacity is available'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
insert into booking_test_records (user_id, booking_id, status)
select '00000000-0000-0000-0000-0000000000c2', booking_id, status
from public.create_event_booking((select id from booking_test_event));
select is(
  (select status from booking_test_records where user_id = '00000000-0000-0000-0000-0000000000c2'),
  'waitlisted',
  'second booking enters FIFO waitlist when event is full'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select is(
  (
    select count(*)::integer
    from public.notifications
    where type = 'booking_confirmed'
  ),
  1,
  'confirmed booking creates an in-app notification'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
select is(
  (
    select count(*)::integer
    from public.notifications
    where type = 'booking_waitlisted'
  ),
  1,
  'waitlisted booking creates an in-app notification'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select ok(
  (
    select length(qr_token) >= 64
    from public.get_my_booking_qr((select booking_id from booking_test_records where user_id = '00000000-0000-0000-0000-0000000000c1'))
  ),
  'confirmed owner can receive an opaque QR token'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select is(
  (
    select promoted_count
    from public.cancel_event_booking(
      (select booking_id from booking_test_records where user_id = '00000000-0000-0000-0000-0000000000c1')
    )
  ),
  1,
  'cancelling a confirmed booking promotes one waiting booking'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
select is(
  (
    select status
    from public.get_my_bookings()
  ),
  'confirmed',
  'FIFO promotion changes the waiting booking to confirmed'
);
select is(
  (
    select count(*)::integer
    from public.notifications
    where type = 'booking_promoted'
  ),
  1,
  'waitlist promotion creates an in-app notification'
);

create temporary table booking_test_qr (token text not null);
grant select, insert on booking_test_qr to authenticated;
insert into booking_test_qr
select qr_token
from public.get_my_booking_qr(
  (select booking_id from booking_test_records where user_id = '00000000-0000-0000-0000-0000000000c2')
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true);
select is(
  (
    select status
    from public.check_in_booking((select token from booking_test_qr), 'paid_on_site')
  ),
  'confirmed',
  'staff can check in a confirmed booking with payment'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
select is(
  (
    select payment_status
    from public.get_my_bookings()
  ),
  'paid_on_site',
  'check-in can record onsite payment atomically'
);
select ok(
  (
    select checked_in_at is not null
    from public.get_my_bookings()
  ),
  'check-in marks the booking timestamp without changing booking status'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true);
select is(
  (
    select already_checked_in
    from public.check_in_booking((select token from booking_test_qr), null)
  ),
  true,
  'repeated check-in is idempotent'
);
set local role postgres;
select is(
  (
    select count(*)::integer
    from public.event_checkins
    where booking_id = (select booking_id from booking_test_records where user_id = '00000000-0000-0000-0000-0000000000c2')
  ),
  1,
  'repeated check-in does not create a second audit row'
);
set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select throws_ok(
  $$select * from public.check_in_booking((select token from booking_test_qr), null)$$,
  'P0001',
  'FORBIDDEN',
  'ordinary users cannot execute staff check-in'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true);
select is(
  (
    select payment_status
    from public.mark_onsite_payment(
      (select booking_id from booking_test_records where user_id = '00000000-0000-0000-0000-0000000000c2'),
      'complimentary'
    )
  ),
  'complimentary',
  'staff can update an allowed onsite payment status'
);
select throws_ok(
  $$select * from public.mark_onsite_payment((select booking_id from booking_test_records where user_id = '00000000-0000-0000-0000-0000000000c2'), 'invalid')$$,
  'P0001',
  'PAYMENT_STATUS_INVALID',
  'invalid payment statuses are rejected'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', true);
select throws_ok(
  $$select * from public.create_event_booking((select id from booking_test_event))$$,
  'P0001',
  'ALREADY_BOOKED',
  'active duplicate booking is rejected'
);

set local role postgres;
insert into public.events (
  slug,
  title,
  status,
  is_public,
  starts_at,
  ends_at,
  booking_enabled,
  max_capacity,
  waitlist_enabled
)
values (
  'booking-no-show-fixture',
  'Booking no-show fixture',
  'scheduled',
  true,
  timezone('utc', now()) - interval '1 hour',
  timezone('utc', now()) - interval '1 minute',
  true,
  1,
  false
);
create temporary table booking_no_show_event (id uuid not null);
insert into booking_no_show_event
select id from public.events where slug = 'booking-no-show-fixture';
grant select on booking_no_show_event to authenticated;
set local role authenticated;
create temporary table booking_no_show_record (
  booking_id uuid not null,
  status text not null
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
insert into booking_no_show_record (booking_id, status)
select booking_id, status
from public.create_event_booking((select id from booking_no_show_event));
select is(
  (select status from booking_no_show_record),
  'confirmed',
  'booking for running event can be marked no-show'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', true);
select is(
  (
    select status
    from public.mark_booking_no_show(
      (select booking_id from booking_no_show_record)
    )
  ),
  'no_show',
  'staff can mark a confirmed booking as no-show during the event'
);
set local role postgres;
select is(
  (
    select count(*)::integer
    from public.audit_logs
    where action = 'booking_marked_no_show'
  ),
  1,
  'no-show transition creates an audit log'
);

select * from finish();

rollback;
