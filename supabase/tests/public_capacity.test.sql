begin;

select plan(13);

select has_function(
  'public',
  'get_public_capacity_threshold',
  array[]::text[],
  'public capacity threshold function exists'
);
select has_column(
  'public',
  'public_events',
  'public_capacity_status',
  'public event projection exposes derived capacity status'
);
select has_column(
  'public',
  'public_events',
  'public_confirmed_count',
  'public event projection exposes exact confirmed count field'
);
select has_column(
  'public',
  'public_events',
  'public_max_capacity',
  'public event projection exposes exact capacity field'
);

select is(
  public.get_public_capacity_threshold(),
  0.8::numeric,
  'capacity threshold defaults to 80 percent'
);

-- Il test crea il proprio evento invece di appoggiarsi alla fixture demo: le
-- prenotazioni fatte usando davvero l'applicazione in DEV cambiavano i conteggi
-- e facevano fallire asserzioni che non riguardavano il codice.
insert into public.events (slug, title, status, is_public, starts_at, ends_at, max_capacity, capacity_visibility)
values (
  'capacity-fixture-event',
  'Capacity fixture',
  'scheduled',
  true,
  timezone('utc', now()) + interval '7 days',
  timezone('utc', now()) + interval '7 days' + interval '4 hours',
  10,
  'hidden'
);

select is(
  (select public_capacity_status from public.public_events where slug = 'capacity-fixture-event'),
  null::text,
  'hidden capacity does not expose a public status'
);
select is(
  (select public_confirmed_count from public.public_events where slug = 'capacity-fixture-event'),
  null::integer,
  'hidden capacity does not expose a public count'
);

update public.events set capacity_visibility = 'status' where slug = 'capacity-fixture-event';
select is(
  (select public_capacity_status from public.public_events where slug = 'capacity-fixture-event'),
  'available'::text,
  'status visibility exposes only a derived availability label'
);
select is(
  (select public_confirmed_count from public.public_events where slug = 'capacity-fixture-event'),
  null::integer,
  'status visibility does not expose an exact count'
);

update public.events set capacity_visibility = 'exact' where slug = 'capacity-fixture-event';
select is(
  (select public_confirmed_count from public.public_events where slug = 'capacity-fixture-event'),
  0,
  'exact visibility exposes the confirmed count'
);
select is(
  (select public_max_capacity from public.public_events where slug = 'capacity-fixture-event'),
  10,
  'exact visibility exposes the configured capacity'
);

-- Il conteggio segue le prenotazioni reali e la soglia deriva lo stato.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
select
  ('00000000-0000-0000-0000-00000000c0' || lpad(number::text, 2, '0'))::uuid,
  'authenticated', 'authenticated',
  format('capacity-%s@example.test', number), 'x', timezone('utc', now())
from generate_series(1, 9) as number;

insert into public.bookings (event_id, user_id, status)
select
  (select id from public.events where slug = 'capacity-fixture-event'),
  ('00000000-0000-0000-0000-00000000c0' || lpad(number::text, 2, '0'))::uuid,
  'confirmed'
from generate_series(1, 8) as number;

select is(
  (select public_capacity_status from public.public_events where slug = 'capacity-fixture-event'),
  'almost_full'::text,
  'eight of ten confirmed bookings reach the almost full threshold'
);

insert into public.bookings (event_id, user_id, status)
values (
  (select id from public.events where slug = 'capacity-fixture-event'),
  '00000000-0000-0000-0000-00000000c009',
  'confirmed'
);

update public.events set max_capacity = 9 where slug = 'capacity-fixture-event';
select is(
  (select public_capacity_status from public.public_events where slug = 'capacity-fixture-event'),
  'full'::text,
  'a fully booked event is reported as full'
);

select * from finish();

rollback;
