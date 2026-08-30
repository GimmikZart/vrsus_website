begin;

select plan(11);

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

update public.events
set capacity_visibility = 'hidden'
where slug = 'vrsus-demo';
select is(
  (select public_capacity_status from public.public_events where slug = 'vrsus-demo'),
  null::text,
  'hidden capacity does not expose a public status'
);
select is(
  (select public_confirmed_count from public.public_events where slug = 'vrsus-demo'),
  null::integer,
  'hidden capacity does not expose a public count'
);

update public.events
set capacity_visibility = 'status'
where slug = 'vrsus-demo';
select is(
  (select public_capacity_status from public.public_events where slug = 'vrsus-demo'),
  'available'::text,
  'status visibility exposes only a derived availability label'
);
select is(
  (select public_confirmed_count from public.public_events where slug = 'vrsus-demo'),
  null::integer,
  'status visibility does not expose an exact count'
);

update public.events
set capacity_visibility = 'exact'
where slug = 'vrsus-demo';
select is(
  (select public_confirmed_count from public.public_events where slug = 'vrsus-demo'),
  0,
  'exact visibility exposes the confirmed count'
);
select is(
  (select public_max_capacity from public.public_events where slug = 'vrsus-demo'),
  20,
  'exact visibility exposes the configured capacity'
);

select * from finish();

rollback;
