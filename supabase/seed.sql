-- Local-only, fictional fixtures used to exercise the V1 event model.
-- Required RBAC roles are inserted by the versioned initial migration.
-- Authentication fixtures belong to Phase 2, where they can be created through
-- Supabase Auth without committing any credential material.

insert into public.station_categories (slug, name, description, sort_order)
values
  ('console', 'Console', 'Postazioni console di test.', 10),
  ('tabletop', 'Tabletop', 'Tavoli per giochi da tavolo e di ruolo.', 20),
  ('vr', 'VR', 'Postazioni di realta virtuale.', 30)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  active = true;

insert into public.activity_categories (slug, name)
values
  ('videogame', 'Videogiochi'),
  ('tabletop', 'Giochi da tavolo e ruolo'),
  ('vr', 'Realta virtuale')
on conflict (slug) do update
set
  name = excluded.name,
  active = true;

insert into public.stations (slug, name, category_id, default_capacity)
select fixtures.slug, fixtures.name, categories.id, fixtures.default_capacity
from (
  values
    ('demo-ps5-1', 'PS5 Demo #1', 'console', 2),
    ('demo-dnd-table', 'Tavolo D&D Demo', 'tabletop', 6),
    ('demo-board-game-area', 'Area Board Game Demo', 'tabletop', 8),
    ('demo-vr-1', 'VR Demo #1', 'vr', 1)
) as fixtures(slug, name, category_slug, default_capacity)
join public.station_categories categories on categories.slug = fixtures.category_slug
on conflict (slug) do update
set
  name = excluded.name,
  category_id = excluded.category_id,
  default_capacity = excluded.default_capacity,
  active = true,
  archived_at = null;

insert into public.activities (slug, name, category_id, short_description)
select fixtures.slug, fixtures.name, categories.id, fixtures.short_description
from (
  values
    ('demo-tekken-8', 'Tekken 8 Demo', 'videogame', 'Fixture locale per il test delle attivita.'),
    ('demo-dnd-one-shot', 'One Shot D&D Demo', 'tabletop', 'Fixture locale per il test delle attivita.'),
    ('demo-board-games', 'Board Games Free Play Demo', 'tabletop', 'Fixture locale per il test delle attivita.'),
    ('demo-beat-saber', 'Beat Saber Demo', 'vr', 'Fixture locale per il test delle attivita.')
) as fixtures(slug, name, category_slug, short_description)
join public.activity_categories categories on categories.slug = fixtures.category_slug
on conflict (slug) do update
set
  name = excluded.name,
  category_id = excluded.category_id,
  short_description = excluded.short_description,
  active = true,
  archived_at = null;

insert into public.station_activities (station_id, activity_id)
select stations.id, activities.id
from (
  values
    ('demo-ps5-1', 'demo-tekken-8'),
    ('demo-dnd-table', 'demo-dnd-one-shot'),
    ('demo-board-game-area', 'demo-board-games'),
    ('demo-vr-1', 'demo-beat-saber')
) as fixtures(station_slug, activity_slug)
join public.stations stations on stations.slug = fixtures.station_slug
join public.activities activities on activities.slug = fixtures.activity_slug
on conflict do nothing;

insert into public.news_posts (
  slug,
  title,
  excerpt,
  content,
  status,
  published_at,
  show_on_home,
  show_in_app
)
values (
  'benvenuti-in-vrsus',
  'Benvenuti in VRSUS',
  'Contenuto fittizio locale per verificare il percorso news pubblico.',
  'Contenuto fittizio locale per verificare la pubblicazione di una news.',
  'published',
  timezone('utc', now()),
  true,
  true
)
on conflict (slug) do update
set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  status = excluded.status,
  published_at = excluded.published_at,
  show_on_home = excluded.show_on_home,
  show_in_app = excluded.show_in_app;

insert into public.service_pages (
  slug,
  title,
  excerpt,
  content,
  active,
  sort_order
)
values (
  'eventi-privati',
  'Eventi privati',
  'Pagina fittizia locale per verificare il catalogo servizi pubblico.',
  'Contenuto fittizio locale per verificare la pagina di un servizio VRSUS.',
  true,
  10
)
on conflict (slug) do update
set
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  active = excluded.active,
  sort_order = excluded.sort_order;

insert into public.events (
  slug,
  title,
  short_description,
  status,
  is_public,
  starts_at,
  ends_at,
  booking_enabled,
  price_cents,
  payment_required,
  max_capacity,
  capacity_visibility,
  waitlist_enabled
)
values (
  'vrsus-demo',
  'VRSUS Demo',
  'Evento fittizio locale per verificare il modello dati.',
  'scheduled',
  true,
  '2099-01-10 14:00:00+00',
  '2099-01-10 22:00:00+00',
  true,
  0,
  false,
  20,
  'hidden',
  true
)
on conflict (slug) do update
set
  title = excluded.title,
  short_description = excluded.short_description,
  status = excluded.status,
  is_public = excluded.is_public,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  booking_enabled = excluded.booking_enabled,
  price_cents = excluded.price_cents,
  payment_required = excluded.payment_required,
  max_capacity = excluded.max_capacity,
  capacity_visibility = excluded.capacity_visibility,
  waitlist_enabled = excluded.waitlist_enabled,
  archived_at = null;

insert into public.event_stations (event_id, station_id, public_name, capacity_override, sort_order)
select events.id, stations.id, fixtures.public_name, fixtures.capacity_override, fixtures.sort_order
from (
  values
    ('demo-ps5-1', 'PS5 Demo #1', 2, 10),
    ('demo-dnd-table', 'Tavolo D&D Demo', 6, 20),
    ('demo-board-game-area', 'Area Board Game Demo', 8, 30),
    ('demo-vr-1', 'VR Demo #1', 1, 40)
) as fixtures(station_slug, public_name, capacity_override, sort_order)
join public.events events on events.slug = 'vrsus-demo'
join public.stations stations on stations.slug = fixtures.station_slug
on conflict (event_id, station_id) do update
set
  public_name = excluded.public_name,
  capacity_override = excluded.capacity_override,
  sort_order = excluded.sort_order,
  is_public = true,
  active = true;

insert into public.event_activities (event_id, activity_id, public_name, access_mode)
select events.id, activities.id, fixtures.public_name, fixtures.access_mode
from (
  values
    ('demo-tekken-8', 'Tekken 8 Demo', 'free_play'),
    ('demo-dnd-one-shot', 'One Shot D&D Demo', 'scheduled'),
    ('demo-board-games', 'Board Games Free Play Demo', 'free_play'),
    ('demo-beat-saber', 'Beat Saber Demo', 'free_play')
) as fixtures(activity_slug, public_name, access_mode)
join public.events events on events.slug = 'vrsus-demo'
join public.activities activities on activities.slug = fixtures.activity_slug
on conflict (event_id, activity_id) do update
set
  public_name = excluded.public_name,
  access_mode = excluded.access_mode,
  is_public = true,
  active = true;

insert into public.event_station_activities (event_station_id, event_activity_id, sort_order)
select event_stations.id, event_activities.id, fixtures.sort_order
from (
  values
    ('demo-ps5-1', 'demo-tekken-8', 10),
    ('demo-dnd-table', 'demo-dnd-one-shot', 20),
    ('demo-board-game-area', 'demo-board-games', 30),
    ('demo-vr-1', 'demo-beat-saber', 40)
) as fixtures(station_slug, activity_slug, sort_order)
join public.events events on events.slug = 'vrsus-demo'
join public.stations stations on stations.slug = fixtures.station_slug
join public.activities activities on activities.slug = fixtures.activity_slug
join public.event_stations on event_stations.event_id = events.id and event_stations.station_id = stations.id
join public.event_activities on event_activities.event_id = events.id and event_activities.activity_id = activities.id
on conflict (event_station_id, event_activity_id) do update
set sort_order = excluded.sort_order;
