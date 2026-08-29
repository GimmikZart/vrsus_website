-- VRSUS schema V1. This migration is the source of truth for every environment.

create extension if not exists pgcrypto with schema extensions;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  first_name text,
  last_name text,
  phone text,
  avatar_path text,
  is_public_profile boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.roles (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique check (code in ('user', 'staff', 'tournament_admin', 'admin', 'super_admin')),
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  primary key (user_id, role_id)
);

create table public.events (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) between 1 and 180),
  short_description text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'running', 'completed', 'cancelled')),
  is_public boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  booking_opens_at timestamptz,
  booking_closes_at timestamptz,
  booking_enabled boolean not null default true,
  venue_name text,
  venue_address text,
  venue_notes text,
  price_cents integer not null default 0 check (price_cents >= 0),
  payment_required boolean not null default true,
  max_capacity integer check (max_capacity is null or max_capacity > 0),
  capacity_visibility text not null default 'hidden' check (capacity_visibility in ('hidden', 'status', 'exact')),
  waitlist_enabled boolean not null default true,
  cover_image_path text,
  seo_title text,
  seo_description text,
  seo_image_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  constraint events_time_range_check check (ends_at > starts_at),
  constraint events_booking_window_check check (
    booking_closes_at is null
    or booking_opens_at is null
    or booking_closes_at >= booking_opens_at
  )
);

create table public.bookings (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null check (status in ('confirmed', 'waitlisted', 'cancelled', 'no_show')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid_on_site', 'complimentary', 'not_required')),
  qr_token_hash text unique,
  qr_issued_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  checked_in_at timestamptz,
  notes text,
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint bookings_qr_only_for_confirmed check (
    qr_token_hash is null or status = 'confirmed'
  )
);

create unique index bookings_one_active_per_event_user_idx
  on public.bookings (event_id, user_id)
  where status in ('confirmed', 'waitlisted');

create index bookings_event_status_created_at_idx
  on public.bookings (event_id, status, created_at);
create index bookings_user_created_at_idx on public.bookings (user_id, created_at desc);

create table public.event_checkins (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  checked_in_at timestamptz not null default timezone('utc', now()),
  checked_in_by uuid not null references public.profiles(id) on delete restrict,
  payment_status_at_checkin text not null check (payment_status_at_checkin in ('unpaid', 'paid_on_site', 'complimentary', 'not_required')),
  notes text
);

create index event_checkins_event_checked_in_at_idx on public.event_checkins (event_id, checked_in_at desc);

create table public.station_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.stations (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 180),
  description text,
  category_id uuid references public.station_categories(id) on delete set null,
  default_capacity integer check (default_capacity is null or default_capacity > 0),
  image_path text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create index stations_category_id_idx on public.stations (category_id);

create table public.activity_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.activities (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 180),
  short_description text,
  description text,
  category_id uuid references public.activity_categories(id) on delete set null,
  image_path text,
  active boolean not null default true,
  seo_title text,
  seo_description text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz
);

create index activities_category_id_idx on public.activities (category_id);

create table public.station_activities (
  station_id uuid not null references public.stations(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  primary key (station_id, activity_id)
);

create index station_activities_activity_id_idx on public.station_activities (activity_id);

create table public.event_stations (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  station_id uuid not null references public.stations(id) on delete restrict,
  public_name text,
  description_override text,
  capacity_override integer check (capacity_override is null or capacity_override > 0),
  is_public boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, station_id)
);

create index event_stations_event_public_idx on public.event_stations (event_id, is_public, active, sort_order);

create table public.event_activities (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete restrict,
  public_name text,
  description_override text,
  access_mode text not null check (access_mode in ('free_play', 'scheduled', 'registration_required', 'tournament')),
  capacity integer check (capacity is null or capacity > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_public boolean not null default true,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, activity_id),
  constraint event_activities_time_range_check check (
    ends_at is null or starts_at is null or ends_at > starts_at
  )
);

create index event_activities_event_public_idx on public.event_activities (event_id, is_public, active);

create table public.event_station_activities (
  event_station_id uuid not null references public.event_stations(id) on delete cascade,
  event_activity_id uuid not null references public.event_activities(id) on delete cascade,
  capacity_override integer check (capacity_override is null or capacity_override > 0),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (event_station_id, event_activity_id)
);

create index event_station_activities_activity_idx on public.event_station_activities (event_activity_id, sort_order);

create table public.news_posts (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) between 1 and 180),
  excerpt text,
  content text not null,
  cover_image_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  show_on_home boolean not null default false,
  show_in_app boolean not null default true,
  push_on_publish boolean not null default false,
  seo_title text,
  seo_description text,
  seo_image_path text,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint news_posts_published_at_check check (status <> 'published' or published_at is not null)
);

create index news_posts_publication_idx on public.news_posts (status, published_at desc);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9]+(?:[._-][a-z0-9]+)*$'),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.service_pages (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(trim(title)) between 1 and 180),
  excerpt text,
  content text not null,
  cover_image_path text,
  active boolean not null default true,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  seo_image_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index service_pages_public_idx on public.service_pages (active, sort_order);

create table public.service_inquiries (
  id uuid primary key default extensions.gen_random_uuid(),
  service_page_id uuid references public.service_pages(id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 160),
  email text not null check (char_length(trim(email)) between 3 and 320),
  phone text,
  organization text,
  people_count integer check (people_count is null or people_count > 0),
  preferred_date date,
  message text not null check (char_length(trim(message)) between 1 and 5000),
  status text not null default 'new' check (status in ('new', 'contacted', 'quote_sent', 'confirmed', 'lost')),
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index service_inquiries_status_created_at_idx on public.service_inquiries (status, created_at desc);

create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  constraint notifications_expiry_check check (expires_at is null or expires_at > created_at)
);

create index notifications_user_unread_idx on public.notifications (user_id, read_at, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  provider_subscription_id text not null,
  device_label text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_subscription_id)
);

create index push_subscriptions_user_active_idx on public.push_subscriptions (user_id, active);

create table public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, first_name, last_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'VRSUS user'
    ),
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.user_roles user_role
    join public.roles role on role.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and role.code = required_role
  );
$$;

create function public.has_any_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.user_roles user_role
    join public.roles role on role.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and role.code = any(required_roles)
  );
$$;

create function public.is_public_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events event
    where event.id = target_event_id
      and event.is_public = true
      and event.status in ('scheduled', 'running', 'completed')
      and event.archived_at is null
  );
$$;

create function public.prevent_event_instance_reassignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.event_id is distinct from old.event_id then
    raise exception 'event_id cannot be reassigned after an event instance is created'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger event_stations_event_id_immutable
  before update of event_id on public.event_stations
  for each row execute function public.prevent_event_instance_reassignment();

create trigger event_activities_event_id_immutable
  before update of event_id on public.event_activities
  for each row execute function public.prevent_event_instance_reassignment();

create function public.validate_event_station_activity_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  station_event_id uuid;
  activity_event_id uuid;
begin
  select event_id into station_event_id
  from public.event_stations
  where id = new.event_station_id;

  select event_id into activity_event_id
  from public.event_activities
  where id = new.event_activity_id;

  if station_event_id is null or activity_event_id is null then
    raise exception 'event station and event activity must exist'
      using errcode = 'foreign_key_violation';
  end if;

  if station_event_id <> activity_event_id then
    raise exception 'event station and event activity must belong to the same event'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger event_station_activities_same_event
  before insert or update on public.event_station_activities
  for each row execute function public.validate_event_station_activity_event();

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create trigger station_categories_set_updated_at before update on public.station_categories
  for each row execute function public.set_updated_at();
create trigger stations_set_updated_at before update on public.stations
  for each row execute function public.set_updated_at();
create trigger activity_categories_set_updated_at before update on public.activity_categories
  for each row execute function public.set_updated_at();
create trigger activities_set_updated_at before update on public.activities
  for each row execute function public.set_updated_at();
create trigger event_stations_set_updated_at before update on public.event_stations
  for each row execute function public.set_updated_at();
create trigger event_activities_set_updated_at before update on public.event_activities
  for each row execute function public.set_updated_at();
create trigger event_station_activities_set_updated_at before update on public.event_station_activities
  for each row execute function public.set_updated_at();
create trigger news_posts_set_updated_at before update on public.news_posts
  for each row execute function public.set_updated_at();
create trigger service_pages_set_updated_at before update on public.service_pages
  for each row execute function public.set_updated_at();
create trigger service_inquiries_set_updated_at before update on public.service_inquiries
  for each row execute function public.set_updated_at();
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

insert into public.roles (code, name, description)
values
  ('user', 'User', 'Partecipante registrato.'),
  ('staff', 'Staff', 'Operatore per funzioni live autorizzate.'),
  ('tournament_admin', 'Tournament admin', 'Gestore limitato ai tornei.'),
  ('admin', 'Admin', 'Gestore dei contenuti e degli eventi.'),
  ('super_admin', 'Super admin', 'Gestore di ruoli e impostazioni sensibili.')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = timezone('utc', now());

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.events enable row level security;
alter table public.bookings enable row level security;
alter table public.event_checkins enable row level security;
alter table public.station_categories enable row level security;
alter table public.stations enable row level security;
alter table public.activity_categories enable row level security;
alter table public.activities enable row level security;
alter table public.station_activities enable row level security;
alter table public.event_stations enable row level security;
alter table public.event_activities enable row level security;
alter table public.event_station_activities enable row level security;
alter table public.news_posts enable row level security;
alter table public.site_settings enable row level security;
alter table public.service_pages enable row level security;
alter table public.service_inquiries enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy roles_select_authenticated on public.roles
  for select to authenticated using (true);
create policy user_roles_select_own on public.user_roles
  for select to authenticated using (user_id = auth.uid());

create policy events_public_read on public.events
  for select to anon, authenticated using (public.is_public_event(id));
create policy events_admin_manage on public.events
  for all to authenticated
  using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));

create policy catalog_station_categories_public_read on public.station_categories
  for select to anon, authenticated using (active = true);
create policy catalog_stations_public_read on public.stations
  for select to anon, authenticated using (active = true and archived_at is null);
create policy catalog_activity_categories_public_read on public.activity_categories
  for select to anon, authenticated using (active = true);
create policy catalog_activities_public_read on public.activities
  for select to anon, authenticated using (active = true and archived_at is null);
create policy catalog_station_activities_public_read on public.station_activities
  for select to anon, authenticated using (true);

create policy event_stations_public_read on public.event_stations
  for select to anon, authenticated using (
    is_public = true and active = true and public.is_public_event(event_id)
  );
create policy event_activities_public_read on public.event_activities
  for select to anon, authenticated using (
    is_public = true and active = true and public.is_public_event(event_id)
  );
create policy event_station_activities_public_read on public.event_station_activities
  for select to anon, authenticated using (
    exists (
      select 1 from public.event_stations station
      where station.id = event_station_id
        and station.is_public = true
        and station.active = true
        and public.is_public_event(station.event_id)
    )
    and exists (
      select 1 from public.event_activities activity
      where activity.id = event_activity_id
        and activity.is_public = true
        and activity.active = true
    )
  );

create policy news_posts_public_read on public.news_posts
  for select to anon, authenticated using (status = 'published' and published_at <= timezone('utc', now()));
create policy service_pages_public_read on public.service_pages
  for select to anon, authenticated using (active = true);

create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_owner_manage on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy bookings_owner_read on public.bookings
  for select to authenticated using (user_id = auth.uid());
create policy event_checkins_owner_read on public.event_checkins
  for select to authenticated using (user_id = auth.uid());

create policy admin_catalog_manage_station_categories on public.station_categories
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_catalog_manage_stations on public.stations
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_catalog_manage_activity_categories on public.activity_categories
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_catalog_manage_activities on public.activities
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_catalog_manage_station_activities on public.station_activities
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_manage_event_stations on public.event_stations
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_manage_event_activities on public.event_activities
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_manage_event_station_activities on public.event_station_activities
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_manage_news_posts on public.news_posts
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_manage_site_settings on public.site_settings
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_manage_service_pages on public.service_pages
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy admin_manage_service_inquiries on public.service_inquiries
  for all to authenticated using (public.has_any_role(array['admin', 'super_admin']))
  with check (public.has_any_role(array['admin', 'super_admin']));
create policy super_admin_read_audit_logs on public.audit_logs
  for select to authenticated using (public.has_role('super_admin'));
create policy super_admin_manage_user_roles on public.user_roles
  for all to authenticated using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

-- Public views deliberately omit capacity and internal/editorial fields.
create view public.public_events
with (security_invoker = false)
as
select
  id,
  slug,
  title,
  short_description,
  description,
  status,
  starts_at,
  ends_at,
  booking_opens_at,
  booking_closes_at,
  booking_enabled,
  venue_name,
  venue_address,
  venue_notes,
  price_cents,
  payment_required,
  waitlist_enabled,
  cover_image_path,
  seo_title,
  seo_description,
  seo_image_path
from public.events
where is_public = true
  and status in ('scheduled', 'running', 'completed')
  and archived_at is null;

create view public.public_event_stations
with (security_invoker = false)
as
select
  event_station.id,
  event_station.event_id,
  coalesce(event_station.public_name, station.name) as name,
  coalesce(event_station.description_override, station.description) as description,
  station.image_path,
  station_category.slug as category_slug,
  station_category.name as category_name,
  event_station.sort_order
from public.event_stations event_station
join public.events event on event.id = event_station.event_id
join public.stations station on station.id = event_station.station_id
left join public.station_categories station_category on station_category.id = station.category_id
where event.is_public = true
  and event.status in ('scheduled', 'running', 'completed')
  and event.archived_at is null
  and event_station.is_public = true
  and event_station.active = true
  and station.active = true
  and station.archived_at is null;

create view public.public_event_activities
with (security_invoker = false)
as
select
  event_activity.id,
  event_activity.event_id,
  coalesce(event_activity.public_name, activity.name) as name,
  coalesce(event_activity.description_override, activity.description) as description,
  event_activity.access_mode,
  event_activity.starts_at,
  event_activity.ends_at,
  activity.image_path,
  activity_category.slug as category_slug,
  activity_category.name as category_name
from public.event_activities event_activity
join public.events event on event.id = event_activity.event_id
join public.activities activity on activity.id = event_activity.activity_id
left join public.activity_categories activity_category on activity_category.id = activity.category_id
where event.is_public = true
  and event.status in ('scheduled', 'running', 'completed')
  and event.archived_at is null
  and event_activity.is_public = true
  and event_activity.active = true
  and activity.active = true
  and activity.archived_at is null;

create view public.public_event_station_activities
with (security_invoker = false)
as
select
  event_station_activity.event_station_id,
  event_station_activity.event_activity_id,
  event_station_activity.sort_order
from public.event_station_activities event_station_activity
join public.public_event_stations event_station
  on event_station.id = event_station_activity.event_station_id
join public.public_event_activities event_activity
  on event_activity.id = event_station_activity.event_activity_id
 and event_activity.event_id = event_station.event_id;

create function public.get_my_bookings()
returns table (
  id uuid,
  event_id uuid,
  status text,
  payment_status text,
  qr_issued_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  checked_in_at timestamptz,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    booking.id,
    booking.event_id,
    booking.status,
    booking.payment_status,
    booking.qr_issued_at,
    booking.confirmed_at,
    booking.cancelled_at,
    booking.checked_in_at,
    booking.notes,
    booking.created_at,
    booking.updated_at
  from public.bookings booking
  where booking.user_id = auth.uid()
  order by booking.created_at desc;
$$;

revoke all on table public.events from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
revoke all on table public.event_checkins from anon, authenticated;
revoke all on table public.event_stations from anon, authenticated;
revoke all on table public.event_activities from anon, authenticated;
revoke all on table public.event_station_activities from anon, authenticated;
grant select on public.public_events to anon, authenticated;
grant select on public.public_event_stations to anon, authenticated;
grant select on public.public_event_activities to anon, authenticated;
grant select on public.public_event_station_activities to anon, authenticated;
grant execute on function public.get_my_bookings() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_any_role(text[]) to authenticated;

comment on view public.public_events is
  'Public event projection. Capacity fields are intentionally omitted.';
comment on function public.get_my_bookings() is
  'Owner-safe booking projection. admin_notes and QR token hashes are intentionally omitted.';
