-- Fixture locali e fittizie per il modello piattaforme/giochi della V2.
-- I ruoli RBAC sono inseriti dalla migration iniziale.
-- Nessun contenuto reale VRSUS, nessuna credenziale: gli account di prova si
-- creano con la procedura descritta in docs/dev/guideline_implementations.md.

-- ---------------------------------------------------------------------------
-- Categorie e piattaforme
-- ---------------------------------------------------------------------------

insert into public.platform_categories (slug, name, description, sort_order)
values
  ('console', 'Console', 'Piattaforme console.', 10),
  ('tabletop', 'Tabletop', 'Tavoli per giochi da tavolo e di ruolo.', 20),
  ('vr', 'VR', 'Realta virtuale.', 30),
  ('arcade', 'Arcade', 'Cabinati e postazioni arcade.', 40)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    active = true;

insert into public.platforms (slug, name, code, description, category_id, default_capacity, internal)
select fixtures.slug, fixtures.name, fixtures.code, fixtures.description,
       categories.id, fixtures.default_capacity, fixtures.internal
from (
  values
    ('playstation-5', 'PlayStation 5', 'PS5', 'Postazione console di ultima generazione.', 'console', 2, false),
    ('nintendo-switch', 'Nintendo Switch', 'SW', 'Party game e multiplayer locale fino a quattro giocatori.', 'console', 4, false),
    ('realta-virtuale', 'Realta virtuale', 'VR', 'Visore e area di gioco dedicata.', 'vr', 1, false),
    ('tavolo-da-gioco', 'Tavolo da gioco', 'TAV', 'Tavolo per giochi da tavolo e di ruolo.', 'tabletop', 8, false),
    ('cabinato-arcade', 'Cabinato arcade', 'ARC', 'Cabinato con classici arcade e sfide a punteggio.', 'arcade', 2, false),
    ('postazione-regia', 'Postazione regia', 'REG', 'Postazione interna di servizio, non visibile al pubblico.', 'console', 1, true)
) as fixtures(slug, name, code, description, category_slug, default_capacity, internal)
join public.platform_categories categories on categories.slug = fixtures.category_slug
on conflict (slug) do update
set name = excluded.name,
    code = excluded.code,
    description = excluded.description,
    category_id = excluded.category_id,
    default_capacity = excluded.default_capacity,
    internal = excluded.internal,
    active = true,
    archived_at = null;

-- ---------------------------------------------------------------------------
-- Giochi
-- ---------------------------------------------------------------------------

insert into public.games (platform_id, slug, name, genre, min_players, max_players, description, score_direction)
select platforms.id, fixtures.slug, fixtures.name, fixtures.genre,
       fixtures.min_players, fixtures.max_players, fixtures.description, fixtures.score_direction
from (
  values
    ('playstation-5', 'tekken-8', 'Tekken 8', 'Picchiaduro', 1, 2, 'Picchiaduro uno contro uno, incontri rapidi al meglio dei tre.', 'desc'),
    ('playstation-5', 'gran-turismo-7', 'Gran Turismo 7', 'Guida', 1, 2, 'Simulatore di guida, sfide a tempo sul giro veloce.', 'asc'),
    ('playstation-5', 'ea-fc', 'EA Sports FC', 'Sport', 1, 2, 'Calcio uno contro uno, partite da sei minuti.', 'desc'),
    ('nintendo-switch', 'mario-kart-8', 'Mario Kart 8 Deluxe', 'Corse', 1, 4, 'Corse fino a quattro giocatori sullo stesso schermo.', 'desc'),
    ('nintendo-switch', 'super-smash-bros', 'Super Smash Bros. Ultimate', 'Picchiaduro', 1, 4, 'Party fighting fino a quattro giocatori.', 'desc'),
    ('realta-virtuale', 'beat-saber', 'Beat Saber', 'Ritmo', 1, 1, 'Gioco ritmico in realta virtuale, punteggio sul brano.', 'desc'),
    ('realta-virtuale', 'superhot-vr', 'Superhot VR', 'Azione', 1, 1, 'Azione in cui il tempo scorre solo quando ti muovi.', 'desc'),
    ('tavolo-da-gioco', 'dungeons-and-dragons', 'Dungeons & Dragons', 'Gioco di ruolo', 3, 6, 'Sessione one shot condotta da un master.', 'desc'),
    ('tavolo-da-gioco', 'catan', 'Catan', 'Gestionale', 3, 4, 'Classico gestionale di scambi e costruzione.', 'desc'),
    ('cabinato-arcade', 'pac-man', 'Pac-Man', 'Arcade', 1, 1, 'Classico arcade a punteggio.', 'desc'),
    ('cabinato-arcade', 'street-fighter-ii', 'Street Fighter II', 'Picchiaduro', 1, 2, 'Picchiaduro storico su cabinato.', 'desc')
) as fixtures(platform_slug, slug, name, genre, min_players, max_players, description, score_direction)
join public.platforms on platforms.slug = fixtures.platform_slug
on conflict (platform_id, slug) do update
set name = excluded.name,
    genre = excluded.genre,
    min_players = excluded.min_players,
    max_players = excluded.max_players,
    description = excluded.description,
    score_direction = excluded.score_direction,
    active = true,
    archived_at = null;

-- ---------------------------------------------------------------------------
-- Schemi di punteggio
-- ---------------------------------------------------------------------------

insert into public.point_schemes (slug, name, description)
values
  ('eliminazione-diretta-standard', 'Eliminazione diretta standard',
   'Schema predefinito per i tornei a eliminazione diretta.'),
  ('girone-standard', 'Girone standard',
   'Schema predefinito per tutti contro tutti e andata e ritorno.')
on conflict (slug) do update
set name = excluded.name, description = excluded.description, active = true;

insert into public.point_scheme_rules (scheme_id, rule_type, placement_from, placement_to, points, sort_order)
select schemes.id, fixtures.rule_type, fixtures.placement_from, fixtures.placement_to,
       fixtures.points, fixtures.sort_order
from (
  values
    ('eliminazione-diretta-standard', 'placement', 1, 1, 100, 10),
    ('eliminazione-diretta-standard', 'placement', 2, 2, 60, 20),
    ('eliminazione-diretta-standard', 'placement', 3, 4, 35, 30),
    ('eliminazione-diretta-standard', 'placement', 5, 8, 20, 40),
    ('eliminazione-diretta-standard', 'participation', null, null, 10, 50),
    ('girone-standard', 'match_win', null, null, 15, 10),
    ('girone-standard', 'match_draw', null, null, 5, 20),
    ('girone-standard', 'placement', 1, 1, 40, 30),
    ('girone-standard', 'placement', 2, 2, 25, 40),
    ('girone-standard', 'participation', null, null, 10, 50)
) as fixtures(scheme_slug, rule_type, placement_from, placement_to, points, sort_order)
join public.point_schemes schemes on schemes.slug = fixtures.scheme_slug
where not exists (
  select 1 from public.point_scheme_rules existing
  where existing.scheme_id = schemes.id
    and existing.rule_type = fixtures.rule_type
    and existing.placement_from is not distinct from fixtures.placement_from
);

-- ---------------------------------------------------------------------------
-- Bacheca
-- ---------------------------------------------------------------------------

insert into public.board_posts (slug, title, body, post_type, status, published_at)
values
  ('benvenuti-in-vrsus', 'Benvenuti in VRSUS',
   'Contenuto fittizio locale usato per verificare la bacheca.',
   'announcement', 'published', timezone('utc', now()) - interval '2 days'),
  ('quale-torneo-volete', 'Quale torneo volete al prossimo evento?',
   'Sondaggio fittizio locale usato per verificare il voto.',
   'poll', 'published', timezone('utc', now()) - interval '1 day')
on conflict (slug) do update
set title = excluded.title,
    body = excluded.body,
    post_type = excluded.post_type,
    status = excluded.status,
    published_at = excluded.published_at;

insert into public.board_poll_options (post_id, label, sort_order)
select posts.id, fixtures.label, fixtures.sort_order
from (
  values
    ('quale-torneo-volete', 'Tekken 8', 10),
    ('quale-torneo-volete', 'Mario Kart 8 Deluxe', 20),
    ('quale-torneo-volete', 'EA Sports FC', 30)
) as fixtures(post_slug, label, sort_order)
join public.board_posts posts on posts.slug = fixtures.post_slug
where not exists (
  select 1 from public.board_poll_options existing
  where existing.post_id = posts.id and existing.label = fixtures.label
);

-- ---------------------------------------------------------------------------
-- Servizi
-- ---------------------------------------------------------------------------

insert into public.service_pages (slug, title, excerpt, content, active, sort_order)
values
  ('feste-di-compleanno', 'Feste di compleanno',
   'Una sala, le postazioni che scegli e nessun pensiero organizzativo.',
   'Contenuto segnaposto: sostituire con il testo approvato.', true, 10),
  ('team-building', 'Team building',
   'Attivita di squadra per gruppi di lavoro, con tornei e sfide collaborative.',
   'Contenuto segnaposto: sostituire con il testo approvato.', true, 20),
  ('giornate-a-tema', 'Giornate a tema',
   'Giornate dedicate a un gioco, una piattaforma o un genere.',
   'Contenuto segnaposto: sostituire con il testo approvato.', true, 30),
  ('giornate-private', 'Giornate private',
   'Lo spazio riservato al tuo gruppo, con la configurazione che preferisci.',
   'Contenuto segnaposto: sostituire con il testo approvato.', true, 40)
on conflict (slug) do update
set title = excluded.title,
    excerpt = excluded.excerpt,
    content = excluded.content,
    active = excluded.active,
    sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Evento dimostrativo
-- ---------------------------------------------------------------------------

insert into public.events (
  slug, title, short_description, description, status, is_public, event_type,
  starts_at, ends_at, booking_enabled, price_cents, payment_required,
  max_capacity, capacity_visibility, waitlist_enabled, venue_name)
values (
  'vrsus-demo', 'VRSUS Demo',
  'Evento fittizio locale per verificare il modello dati.',
  'Giornata dimostrativa con tutte le piattaforme attive.',
  'scheduled', true, 'all_you_can_play',
  timezone('utc', now()) + interval '14 days',
  timezone('utc', now()) + interval '14 days' + interval '8 hours',
  true, 1500, true, 40, 'status', true, 'Sede VRSUS')
on conflict (slug) do update
set title = excluded.title,
    short_description = excluded.short_description,
    description = excluded.description,
    status = excluded.status,
    is_public = excluded.is_public,
    event_type = excluded.event_type,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    booking_enabled = excluded.booking_enabled,
    price_cents = excluded.price_cents,
    payment_required = excluded.payment_required,
    max_capacity = excluded.max_capacity,
    capacity_visibility = excluded.capacity_visibility,
    waitlist_enabled = excluded.waitlist_enabled,
    venue_name = excluded.venue_name,
    archived_at = null;

insert into public.event_platforms (event_id, platform_id, capacity_override, sort_order)
select events.id, platforms.id, fixtures.capacity_override, fixtures.sort_order
from (
  values
    ('vrsus-demo', 'playstation-5', 4, 10),
    ('vrsus-demo', 'nintendo-switch', 4, 20),
    ('vrsus-demo', 'realta-virtuale', 1, 30),
    ('vrsus-demo', 'tavolo-da-gioco', 8, 40),
    ('vrsus-demo', 'cabinato-arcade', 2, 50)
) as fixtures(event_slug, platform_slug, capacity_override, sort_order)
join public.events on events.slug = fixtures.event_slug
join public.platforms on platforms.slug = fixtures.platform_slug
on conflict (event_id, platform_id) do update
set capacity_override = excluded.capacity_override,
    sort_order = excluded.sort_order,
    active = true,
    is_public = true;

insert into public.event_platform_games (event_platform_id, game_id, sort_order)
select event_platforms.id, games.id, fixtures.sort_order
from (
  values
    ('vrsus-demo', 'playstation-5', 'tekken-8', 10),
    ('vrsus-demo', 'playstation-5', 'gran-turismo-7', 20),
    ('vrsus-demo', 'playstation-5', 'ea-fc', 30),
    ('vrsus-demo', 'nintendo-switch', 'mario-kart-8', 10),
    ('vrsus-demo', 'nintendo-switch', 'super-smash-bros', 20),
    ('vrsus-demo', 'realta-virtuale', 'beat-saber', 10),
    ('vrsus-demo', 'realta-virtuale', 'superhot-vr', 20),
    ('vrsus-demo', 'tavolo-da-gioco', 'dungeons-and-dragons', 10),
    ('vrsus-demo', 'tavolo-da-gioco', 'catan', 20),
    ('vrsus-demo', 'cabinato-arcade', 'pac-man', 10),
    ('vrsus-demo', 'cabinato-arcade', 'street-fighter-ii', 20)
) as fixtures(event_slug, platform_slug, game_slug, sort_order)
join public.events on events.slug = fixtures.event_slug
join public.platforms on platforms.slug = fixtures.platform_slug
join public.event_platforms
  on event_platforms.event_id = events.id and event_platforms.platform_id = platforms.id
join public.games on games.slug = fixtures.game_slug and games.platform_id = platforms.id
on conflict (event_platform_id, game_id) do update
set sort_order = excluded.sort_order, active = true;

-- ---------------------------------------------------------------------------
-- Tornei dimostrativi
-- ---------------------------------------------------------------------------

-- I tornei di esempio si riconoscono dal nome dentro la giornata: lo slug ora
-- lo genera il database da piattaforma, gioco e data, quindi non e piu una
-- chiave stabile su cui appoggiare l'upsert. Si rifanno da zero.
delete from public.tournaments
where event_id = (select id from public.events where slug = 'vrsus-demo')
  and name in ('Tekken 8 Arena', 'Mario Kart Gran Premio');

insert into public.tournaments (
  event_id, platform_id, game_id, point_scheme_id, name, description, rules,
  format, result_kind, group_size, rounds_count, scoring_config,
  status, max_entries, starts_at, checkin_required, ranking_enabled, is_public)
select events.id, platforms.id, games.id, schemes.id,
  fixtures.name, fixtures.description, fixtures.rules,
  fixtures.format, fixtures.result_kind, fixtures.group_size,
  fixtures.rounds_count, fixtures.scoring_config,
  fixtures.status, fixtures.max_entries,
  events.starts_at + fixtures.offset_hours, true, true, true
from (
  values
    ('Tekken 8 Arena',
     'Bracket a eliminazione diretta sul picchiaduro piu tecnico della serata.',
     'Incontri al meglio dei tre round. Personaggi liberi.',
     'single_elimination', 'win_loss', 2, null::integer, '{}'::jsonb,
     'registration_open', 8, interval '2 hours',
     'playstation-5', 'tekken-8', 'eliminazione-diretta-standard'),
    ('Mario Kart Gran Premio',
     'Sedici piloti, quattro per gara: si corre a manche.',
     'Tre manche da quattro. Punti per posizione: 10, 8, 6, 4.',
     'heats', 'placement', 4, 3, '{"placement_points": [10, 8, 6, 4]}'::jsonb,
     'registration_open', 16, interval '4 hours',
     'nintendo-switch', 'mario-kart-8', 'girone-standard')
) as fixtures(name, description, rules, format, result_kind, group_size,
              rounds_count, scoring_config, status, max_entries,
              offset_hours, platform_slug, game_slug, scheme_slug)
join public.events on events.slug = 'vrsus-demo'
join public.platforms on platforms.slug = fixtures.platform_slug
join public.games on games.slug = fixtures.game_slug and games.platform_id = platforms.id
join public.point_schemes schemes on schemes.slug = fixtures.scheme_slug;
