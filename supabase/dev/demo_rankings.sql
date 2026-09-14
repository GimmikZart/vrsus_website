-- Dati dimostrativi per le sfide (ranking) sui giochi.
--
-- Serve a vedere la pagina Ranking dell'app con numeri veri: due postazioni,
-- un gioco con piu sfide e qualche record gia registrato. Non fa parte del
-- seed: si esegue a mano dopo gli utenti demo.
--
--   docker exec -i supabase_db_vrsus-dev psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/dev/demo_rankings.sql
--
-- Lo script e ripetibile: cancella le proprie sfide prima di ricrearle.

begin;

-- ---------------------------------------------------------------------------
-- 0. Pulizia delle sfide dimostrative
-- ---------------------------------------------------------------------------

delete from public.game_rankings
where name in (
  'Nordschleife - giro secco',
  'Tokyo Expressway - 5 giri',
  'Expert+ - punteggio pieno'
);

-- ---------------------------------------------------------------------------
-- 1. Le sfide
-- ---------------------------------------------------------------------------

insert into public.game_rankings (
  game_id, name, rules, score_kind, score_direction, status, ends_at, created_by)
select
  game.id,
  'Nordschleife - giro secco',
  'Gran Turismo 7, Nurburgring Nordschleife. Vettura Gr.3 a scelta, gomme medie, cambio automatico ammesso. Un giro lanciato, si registra il tempo migliore della serata.',
  'time',
  'asc',
  'open',
  null,
  (select profile.id from public.profiles profile
   join public.user_roles link on link.user_id = profile.id
   join public.roles role on role.id = link.role_id
   where role.code in ('admin', 'super_admin')
   order by profile.created_at limit 1)
from public.games game
where game.name = 'Gran Turismo 7';

insert into public.game_rankings (
  game_id, name, rules, score_kind, score_direction, status, ends_at, created_by)
select
  game.id,
  'Tokyo Expressway - 5 giri',
  'Tokyo Expressway East, cinque giri, vettura Gr.4. Vince il tempo totale piu basso. Sfida di stagione.',
  'time',
  'asc',
  'open',
  timezone('utc', now()) + interval '90 days',
  (select profile.id from public.profiles profile
   join public.user_roles link on link.user_id = profile.id
   join public.roles role on role.id = link.role_id
   where role.code in ('admin', 'super_admin')
   order by profile.created_at limit 1)
from public.games game
where game.name = 'Gran Turismo 7';

insert into public.game_rankings (
  game_id, name, rules, score_kind, score_direction, status, ends_at, created_by)
select
  game.id,
  'Expert+ - punteggio pieno',
  'Beat Saber, difficolta Expert+, brano a scelta fra quelli del menu VRSUS. Nessun modificatore attivo. Vince il punteggio piu alto.',
  'points',
  'desc',
  'open',
  null,
  (select profile.id from public.profiles profile
   join public.user_roles link on link.user_id = profile.id
   join public.roles role on role.id = link.role_id
   where role.code in ('admin', 'super_admin')
   order by profile.created_at limit 1)
from public.games game
where game.name = 'Beat Saber';

-- ---------------------------------------------------------------------------
-- 2. Qualche record gia registrato
-- ---------------------------------------------------------------------------

-- I tentativi si appoggiano ai profili demo: chi non c'e viene semplicemente
-- saltato, cosi lo script gira anche su un database piu spoglio.
insert into public.game_scores (ranking_id, game_id, user_id, score, recorded_by, recorded_at)
select
  ranking.id,
  ranking.game_id,
  profile.id,
  attempt.score,
  ranking.created_by,
  timezone('utc', now()) - (attempt.hours_ago || ' hours')::interval
from public.game_rankings ranking
join (values
  ('Nordschleife - giro secco', 'lucabianchi', 401.253, 30),
  ('Nordschleife - giro secco', 'lucabianchi', 398.117, 5),
  ('Nordschleife - giro secco', 'marcorossi', 404.880, 28),
  ('Nordschleife - giro secco', 'giuliaferrari', 396.402, 26),
  ('Nordschleife - giro secco', 'saraconti', 412.940, 24),
  ('Tokyo Expressway - 5 giri', 'marcorossi', 521.336, 20),
  ('Tokyo Expressway - 5 giri', 'giuliaferrari', 518.907, 18),
  ('Expert+ - punteggio pieno', 'saraconti', 842150, 22),
  ('Expert+ - punteggio pieno', 'lucabianchi', 795320, 21),
  ('Expert+ - punteggio pieno', 'matteogreco', 901475, 6)
) as attempt(ranking_name, nickname, score, hours_ago)
  on attempt.ranking_name = ranking.name
join public.profiles profile on lower(profile.nickname) = attempt.nickname;

commit;
