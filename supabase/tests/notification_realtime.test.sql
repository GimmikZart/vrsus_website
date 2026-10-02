begin;

select plan(7);

select ok(
  exists (select 1 from pg_publication_tables
          where pubname = 'supabase_realtime'
            and schemaname = 'public' and tablename = 'notifications'),
  'notification changes are published to Realtime'
);
select ok(has_column_privilege('authenticated', 'public.notifications', 'read_at', 'UPDATE'),
  'users may mark notifications read');
select ok(not has_column_privilege('authenticated', 'public.notifications', 'title', 'UPDATE'),
  'users cannot change notification content');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000e1', 'authenticated', 'authenticated', 'notification-e1@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000e2', 'authenticated', 'authenticated', 'notification-e2@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.notifications (user_id, type, title, message)
values
  ('00000000-0000-0000-0000-0000000000e1', 'test', 'Only E1', 'Private'),
  ('00000000-0000-0000-0000-0000000000e2', 'test', 'Only E2', 'Private');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
set local role authenticated;
select is((select count(*)::integer from public.notifications where type = 'test'), 1,
  'inbox RLS shows only the signed-in user');
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-0000-0000-0000000000e2'), 0,
  'a different user notification is invisible');

select ok(public.upsert_push_subscription('onesignal', 'e1-device', 'test') is not null,
  'first user owns their push subscription');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', true);
select throws_ok($$select public.upsert_push_subscription('onesignal', 'e1-device', 'test')$$,
  '42501', 'PUSH_SUBSCRIPTION_IN_USE',
  'another user cannot claim an active push device');

select * from finish();
rollback;
