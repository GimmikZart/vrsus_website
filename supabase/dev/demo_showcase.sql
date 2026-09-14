-- Dati dimostrativi per l'ambiente locale: una giornata completa con due
-- tornei da sedici partecipanti, utile per guardare tabellone e gironi con
-- numeri veri.
--
-- Non fa parte del seed: si esegue a mano quando serve, dopo aver creato gli
-- utenti demo (vedi docs/dev/guideline_implementations.md).
--
--   docker exec -i supabase_db_vrsus-dev psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/dev/demo_showcase.sql
--
-- Lo script e ripetibile: cancella la propria giornata prima di ricrearla.

begin;

-- ---------------------------------------------------------------------------
-- 0. Contesto: le RPC operative girano come l'amministratore
-- ---------------------------------------------------------------------------

do $$
declare v_admin uuid;
begin
  select profile.id into v_admin
  from public.profiles profile
  join public.user_roles link on link.user_id = profile.id
  join public.roles role on role.id = link.role_id
  where role.code in ('admin', 'super_admin')
  order by profile.created_at
  limit 1;

  if v_admin is null then
    raise exception 'Serve un account admin: crealo prima di eseguire questo script.';
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text,
    true);
end $$;

-- ---------------------------------------------------------------------------
-- 1. Pulizia della giornata dimostrativa
-- ---------------------------------------------------------------------------

delete from public.tournaments
where event_id in (select id from public.events where slug = 'vrsus-showcase');
delete from public.event_checkins
where event_id in (select id from public.events where slug = 'vrsus-showcase');
delete from public.bookings
where event_id in (select id from public.events where slug = 'vrsus-showcase');
delete from public.events where slug = 'vrsus-showcase';

-- ---------------------------------------------------------------------------
-- 2. Evento in corso
-- ---------------------------------------------------------------------------

insert into public.events (
  slug, title, short_description, description, status, is_public, event_type,
  starts_at, ends_at, booking_opens_at, booking_closes_at, booking_enabled,
  venue_name, venue_address, price_cents, payment_required, max_capacity,
  capacity_visibility, waitlist_enabled)
values (
  'vrsus-showcase', 'VRSUS Showcase',
  'Giornata dimostrativa con tabellone e gironi completi.',
  'Dati fittizi locali per provare la console.',
  'running', true, 'all_you_can_play',
  date_trunc('day', now()) + interval '18 hours',
  date_trunc('day', now()) + interval '23 hours 30 minutes',
  date_trunc('day', now()) - interval '7 days',
  date_trunc('day', now()) + interval '17 hours',
  true, 'Sede VRSUS', 'Via della Prova 1', 1500, true, 40, 'hidden', true);

-- ---------------------------------------------------------------------------
-- 3. Postazioni e giochi della giornata
-- ---------------------------------------------------------------------------

insert into public.event_platforms (event_id, platform_id, sort_order)
select event.id, platform.id, row_number() over (order by platform.slug) * 10
from public.events event
cross join public.platforms platform
where event.slug = 'vrsus-showcase'
  and platform.slug in ('playstation-5', 'nintendo-switch', 'cabinato-arcade');

insert into public.event_platform_games (event_platform_id, game_id, sort_order)
select link.id, game.id,
  row_number() over (partition by link.id order by game.name) * 10
from public.event_platforms link
join public.events event
  on event.id = link.event_id and event.slug = 'vrsus-showcase'
join public.games game
  on game.platform_id = link.platform_id and game.active = true;

-- ---------------------------------------------------------------------------
-- 4. Prenotazioni: i sedici utenti demo, dodici gia presenti in sede
-- ---------------------------------------------------------------------------

insert into public.bookings (
  event_id, user_id, status, payment_status, confirmed_at, checked_in_at)
select
  event.id,
  demo.id,
  'confirmed',
  case when demo.position <= 12 then 'paid_on_site' else 'unpaid' end,
  now() - interval '2 days',
  case when demo.position <= 12 then now() - interval '1 hour' else null end
from public.events event
cross join (
  select profile.id, row_number() over (order by profile.created_at) as position
  from public.profiles profile
  where profile.nickname in (
    'lucabianchi', 'marcorossi', 'giuliaferrari', 'saraconti', 'matteogreco',
    'alessiariva', 'davidemoretti', 'chiarabarbieri', 'simonefontana',
    'elisacaruso', 'andreavilla', 'federicasala', 'nicologatti',
    'martinapellegrini', 'stefanolongo', 'valentinamarini')
) demo
where event.slug = 'vrsus-showcase';

insert into public.event_checkins (
  event_id, booking_id, user_id, checked_in_by, payment_status_at_checkin)
select booking.event_id, booking.id, booking.user_id,
  (select profile.id from public.profiles profile
   join public.user_roles link on link.user_id = profile.id
   join public.roles role on role.id = link.role_id
   where role.code in ('admin', 'super_admin') limit 1),
  booking.payment_status
from public.bookings booking
join public.events event on event.id = booking.event_id
where event.slug = 'vrsus-showcase' and booking.checked_in_at is not null;

-- ---------------------------------------------------------------------------
-- 5. I due tornei, con sedici iscritti ciascuno
-- ---------------------------------------------------------------------------

insert into public.tournaments (
  event_id, platform_id, game_id, point_scheme_id, name, description,
  rules, format, result_kind, status, max_entries, checkin_required,
  ranking_enabled, is_public, starts_at)
select
  event.id, game.platform_id, game.id, scheme.id,
  'Tekken 8',
  'Tabellone a eliminazione diretta con sedici partecipanti.',
  'Incontri al meglio di tre round: chi perde e fuori.',
  'single_elimination', 'win_loss', 'registration_closed', 16, false, true, true,
  date_trunc('day', now()) + interval '19 hours'
from public.events event
join public.games game on game.slug = 'tekken-8'
join public.point_schemes scheme
  on scheme.slug = 'eliminazione-diretta-standard'
where event.slug = 'vrsus-showcase';

insert into public.tournaments (
  event_id, platform_id, game_id, point_scheme_id, name, description,
  rules, format, result_kind, group_size, rounds_count, heat_seeding,
  scoring_config, status, max_entries, checkin_required, ranking_enabled,
  is_public, starts_at)
select
  event.id, game.platform_id, game.id, scheme.id,
  'Mario Kart 8 Deluxe',
  'Sedici piloti che corrono quattro alla volta, tre manche a testa.',
  'Si corre in gruppi da quattro. A ogni manche i punti vanno secondo l ordine di arrivo: 10, 8, 6, 4. Vince chi somma di piu dopo tre manche.',
  'heats', 'placement', 4, 3, 'rotation',
  '{"placement_points": [10, 8, 6, 4]}'::jsonb,
  'registration_closed', 16, false, true, true,
  date_trunc('day', now()) + interval '20 hours 30 minutes'
from public.events event
join public.games game on game.slug = 'mario-kart-8'
join public.point_schemes scheme on scheme.slug = 'girone-standard'
where event.slug = 'vrsus-showcase';

-- Iscrizioni: gli stessi sedici utenti in entrambi i tornei.
insert into public.tournament_entries (
  tournament_id, display_name, seed, created_at)
select tournament.id, demo.nickname, demo.position,
  now() - interval '3 days' + (demo.position * interval '1 minute')
from public.tournaments tournament
join public.events event
  on event.id = tournament.event_id and event.slug = 'vrsus-showcase'
cross join (
  select profile.nickname,
    row_number() over (order by profile.created_at) as position
  from public.profiles profile
  where profile.nickname in (
    'lucabianchi', 'marcorossi', 'giuliaferrari', 'saraconti', 'matteogreco',
    'alessiariva', 'davidemoretti', 'chiarabarbieri', 'simonefontana',
    'elisacaruso', 'andreavilla', 'federicasala', 'nicologatti',
    'martinapellegrini', 'stefanolongo', 'valentinamarini')
) demo;

insert into public.tournament_entry_members (entry_id, user_id, is_captain)
select entry.id, profile.id, true
from public.tournament_entries entry
join public.tournaments tournament on tournament.id = entry.tournament_id
join public.events event
  on event.id = tournament.event_id and event.slug = 'vrsus-showcase'
join public.profiles profile on profile.nickname = entry.display_name;

-- ---------------------------------------------------------------------------
-- 6. Tabellone a eliminazione diretta, giocato fino alla finale
-- ---------------------------------------------------------------------------

do $$
declare
  v_tournament uuid;
  v_round integer;
  v_rounds integer;
  v_match record;
  v_index integer := 0;
  v_results jsonb;
begin
  select tournament.id into v_tournament
  from public.tournaments tournament
  join public.events event on event.id = tournament.event_id
  where event.slug = 'vrsus-showcase' and tournament.name = 'Tekken 8';

  perform public.generate_tournament_schedule(v_tournament);

  select max(round_number) into v_rounds
  from public.matches where tournament_id = v_tournament;

  for v_round in 1 .. v_rounds loop
    for v_match in
      select match.id
      from public.matches match
      where match.tournament_id = v_tournament
        and match.round_number = v_round
        and match.status in ('pending', 'ready')
        and (select count(*) from public.match_participants part
             where part.match_id = match.id and part.entry_id is not null) = 2
      order by match.bracket_position
    loop
      v_index := v_index + 1;

      -- Esito deterministico ma non monotono: ogni terzo incontro lo vince
      -- chi sta in basso nel tabellone.
      select jsonb_agg(jsonb_build_object(
        'entry_id', part.entry_id,
        'outcome', case
          when (v_index % 3 = 0 and part.slot = 2) or (v_index % 3 <> 0 and part.slot = 1)
            then 'win' else 'loss' end))
      into v_results
      from public.match_participants part
      where part.match_id = v_match.id and part.entry_id is not null;

      perform public.record_match_results(v_match.id, v_results);
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Manche, giocate per due terzi: il torneo resta in corso
-- ---------------------------------------------------------------------------

do $$
declare
  v_tournament uuid;
  v_match record;
  v_index integer := 0;
  v_results jsonb;
begin
  select tournament.id into v_tournament
  from public.tournaments tournament
  join public.events event on event.id = tournament.event_id
  where event.slug = 'vrsus-showcase'
    and tournament.name = 'Mario Kart 8 Deluxe';

  perform public.generate_tournament_schedule(v_tournament);

  -- Due manche su tre: la terza resta da correre, cosi la dashboard ha un
  -- torneo davvero in corso.
  for v_match in
    select id from public.matches
    where tournament_id = v_tournament and round_number <= 2
    order by round_number, bracket_position
  loop
    v_index := v_index + 1;

    -- L ordine di arrivo ruota di gruppo in gruppo: senza, vincerebbe sempre
    -- chi occupa il primo posto e la classifica sarebbe piatta.
    select jsonb_agg(jsonb_build_object(
      'entry_id', ranked.entry_id,
      'placement', ((ranked.slot - 1 + v_index) % ranked.total) + 1))
    into v_results
    from (
      select part.entry_id, part.slot,
        count(*) over () as total
      from public.match_participants part
      where part.match_id = v_match.id and part.entry_id is not null
    ) ranked;

    perform public.record_match_results(v_match.id, v_results);
  end loop;
end $$;

commit;

-- Riepilogo di quello che e stato creato.
select tournament.slug, tournament.status, tournament.format,
  count(distinct entry.id) as iscritti,
  count(distinct match.id) filter (where match.status = 'completed') as giocate,
  count(distinct match.id) as partite
from public.tournaments tournament
join public.events event
  on event.id = tournament.event_id and event.slug = 'vrsus-showcase'
left join public.tournament_entries entry
  on entry.tournament_id = tournament.id
left join public.matches match on match.tournament_id = tournament.id
group by tournament.slug, tournament.status, tournament.format;
