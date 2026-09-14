-- Motore tornei elastico: funzioni.
--
-- Un solo generatore di calendario, una sola registrazione di risultato e una
-- sola classifica per tutti i formati. Quello che cambia e la configurazione
-- del torneo, non il codice che la esegue.
--
-- In fondo la migration chiude la transizione iniziata dallo schema: via
-- `entry_a_id`, `entry_b_id` e `score_payload`, sostituiti da
-- `match_participants`.

-- ---------------------------------------------------------------------------
-- 1. Guardia di stato degli incontri
-- ---------------------------------------------------------------------------
--
-- Finora un risultato si poteva registrare solo dopo `call` e `start`. Con le
-- manche da quattro e i tentativi a tempo quella sequenza diventa un peso: si
-- chiamano i giocatori, si corre, si scrivono i tempi. La chiamata resta
-- disponibile, non e piu obbligatoria.

create or replace function public.enforce_match_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'pending' and new.status in ('ready', 'completed', 'cancelled'))
    or (old.status = 'ready' and new.status in ('called', 'running', 'completed', 'cancelled'))
    or (old.status = 'called' and new.status in ('running', 'completed', 'cancelled'))
    or (old.status = 'running' and new.status in ('completed', 'cancelled'))
  ) then
    raise exception 'INVALID_MATCH_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Iscritti ammessi
-- ---------------------------------------------------------------------------

create function public._tournament_eligible_entries(p_tournament_id uuid)
returns uuid[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_entries uuid[];
begin
  select * into v_tournament from public.tournaments where id = p_tournament_id;
  if not found then
    return null;
  end if;

  select array_agg(entry.id order by entry.seed nulls last, entry.created_at, entry.id)
  into v_entries
  from public.tournament_entries entry
  where entry.tournament_id = p_tournament_id
    and entry.status in (
      case when v_tournament.checkin_required then 'checked_in' else 'registered' end,
      'checked_in')
    and (
      select count(*) from public.tournament_entry_members member
      where member.entry_id = entry.id
    ) = v_tournament.entry_size;

  return v_entries;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Generazione del calendario
-- ---------------------------------------------------------------------------

-- Una manche: gli iscritti divisi in gruppi da `group_size`.
--
-- Con `rotation` i gruppi si formano scegliendo ogni volta chi si e gia
-- incontrato di meno: e una regola sola, vale per qualunque numero di iscritti
-- e di posti, e nei casi in cui un calendario perfetto esiste lo trova. La
-- costruzione a matrice sarebbe piu elegante ma ripete le coppie appena il
-- numero di gruppi non e primo.
--
-- Con `standings` i gruppi seguono la classifica del momento: primi con primi.
-- In quel caso la manche successiva si genera solo quando la precedente e
-- chiusa, perche prima non si sa chi sta davanti.
create function public._generate_heat_round(p_tournament_id uuid, p_round integer)
returns integer
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_entries uuid[];
  v_remaining uuid[];
  v_members uuid[];
  v_count integer;
  v_group integer;
  v_groups integer;
  v_entry uuid;
  v_match_id uuid;
  v_slot smallint;
  v_created integer := 0;
begin
  select * into v_tournament from public.tournaments where id = p_tournament_id;

  if v_tournament.heat_seeding = 'standings' and p_round > 1 then
    select array_agg(standing.entry_id order by standing.standing_position)
    into v_entries
    from public.tournament_standings(p_tournament_id) standing
    where standing.standing_position is not null;
  end if;

  if v_entries is null then
    v_entries := public._tournament_eligible_entries(p_tournament_id);
  end if;

  v_count := coalesce(array_length(v_entries, 1), 0);
  if v_count = 0 then
    return 0;
  end if;

  v_groups := ceil(v_count::numeric / v_tournament.group_size::numeric)::integer;
  v_remaining := v_entries;

  for v_group in 1 .. v_groups loop
    insert into public.matches (tournament_id, round_number, bracket_position, status)
    values (p_tournament_id, p_round, v_group, 'ready')
    returning id into v_match_id;

    v_members := '{}'::uuid[];
    v_slot := 0;

    while array_length(v_members, 1) is distinct from v_tournament.group_size
          and coalesce(array_length(v_remaining, 1), 0) > 0 loop
      if v_tournament.heat_seeding = 'standings' or array_length(v_members, 1) is null then
        -- Il primo di ogni gruppo, e tutti i componenti quando l'ordine lo
        -- detta la classifica, si prendono nell'ordine in cui sono.
        v_entry := v_remaining[1];
      else
        select candidate.entry into v_entry
        from unnest(v_remaining) with ordinality as candidate(entry, ord)
        left join lateral (
          select count(*) as met
          from public.match_participants mine
          join public.match_participants theirs on theirs.match_id = mine.match_id
          join public.matches match on match.id = mine.match_id
          where match.tournament_id = p_tournament_id
            and mine.entry_id = candidate.entry
            and theirs.entry_id = any(v_members)
        ) encounters on true
        order by encounters.met, candidate.ord
        limit 1;
      end if;

      v_members := v_members || v_entry;
      v_remaining := array_remove(v_remaining, v_entry);

      v_slot := v_slot + 1;
      insert into public.match_participants (match_id, entry_id, slot)
      values (v_match_id, v_entry, v_slot);
    end loop;

    v_created := v_created + 1;
  end loop;

  return v_created;
end;
$$;

revoke all on function public._generate_heat_round(uuid, integer) from public, anon, authenticated;

create function public.generate_tournament_schedule(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_entries uuid[];
  v_count integer;
  v_slots integer := 2;
  v_rounds integer := 1;
  v_round integer;
  v_position integer;
  v_match_id uuid;
  v_next_id uuid;
  v_first uuid;
  v_second uuid;
  v_total integer;
  v_index integer;
  v_pair record;
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'TOURNAMENT_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.matches
    where tournament_id = p_tournament_id and status not in ('pending', 'ready')
  ) then
    raise exception using errcode = 'P0001', message = 'BRACKET_STARTED';
  end if;

  -- Calendario gia generato: la chiamata resta innocua.
  if exists (select 1 from public.matches where tournament_id = p_tournament_id) then
    select count(*) into v_total from public.matches where tournament_id = p_tournament_id;
    return v_total;
  end if;

  -- Una squadra incompleta non puo giocare: o lo staff la completa, o la
  -- elimina prima di far partire il torneo.
  if exists (
    select 1 from public.tournament_entries entry
    where entry.tournament_id = p_tournament_id
      and entry.status <> 'withdrawn'
      and (
        select count(*) from public.tournament_entry_members member
        where member.entry_id = entry.id
      ) <> v_tournament.entry_size
  ) then
    raise exception using errcode = 'P0001', message = 'INCOMPLETE_TEAMS';
  end if;

  v_entries := public._tournament_eligible_entries(p_tournament_id);
  v_count := coalesce(array_length(v_entries, 1), 0);
  if v_count < 2 then
    raise exception using errcode = 'P0001', message = 'NOT_ENOUGH_ENTRIES';
  end if;

  if v_tournament.format = 'single_elimination' then
    while v_slots < v_count loop
      v_slots := v_slots * 2;
      v_rounds := v_rounds + 1;
    end loop;

    for v_round in 1 .. v_rounds loop
      for v_position in 1 .. (v_slots / (2 ^ v_round))::integer loop
        v_first := null;
        v_second := null;
        if v_round = 1 then
          if ((v_position * 2) - 1) <= v_count then v_first := v_entries[(v_position * 2) - 1]; end if;
          if (v_position * 2) <= v_count then v_second := v_entries[v_position * 2]; end if;
        end if;

        insert into public.matches (tournament_id, round_number, bracket_position, status)
        values (p_tournament_id, v_round, v_position,
          case
            when v_first is not null and v_second is not null then 'ready'
            when v_first is not null or v_second is not null then 'completed'
            else 'pending'
          end)
        returning id into v_match_id;

        -- I due posti del tabellone esistono da subito, anche vuoti: e quello
        -- che permette a chi vince di prendere il proprio posto piu avanti.
        insert into public.match_participants (match_id, entry_id, slot)
        values (v_match_id, v_first, 1), (v_match_id, v_second, 2);

        if v_first is not null and v_second is null then
          update public.matches
          set winner_entry_id = v_first, completed_at = now()
          where id = v_match_id;
          update public.match_participants
          set placement = 1, outcome = 'win'
          where match_id = v_match_id and entry_id = v_first;
        end if;
      end loop;
    end loop;

    -- Collegamento fra un round e il successivo.
    for v_round in 1 .. (v_rounds - 1) loop
      for v_match_id, v_position in
        select id, bracket_position from public.matches
        where tournament_id = p_tournament_id and round_number = v_round
      loop
        select id into v_next_id from public.matches
        where tournament_id = p_tournament_id
          and round_number = v_round + 1
          and bracket_position = ceil(v_position / 2.0);

        update public.matches
        set next_match_id = v_next_id,
            next_match_slot = case when mod(v_position, 2) = 1 then 'a' else 'b' end
        where id = v_match_id;
      end loop;
    end loop;

    -- I passaggi automatici dei bye vanno propagati.
    for v_match_id, v_first in
      select match.id, match.winner_entry_id from public.matches match
      where match.tournament_id = p_tournament_id
        and match.status = 'completed'
        and match.winner_entry_id is not null
      order by match.round_number, match.bracket_position
    loop
      perform public._advance_tournament_winner(v_match_id, v_first);
    end loop;

  elsif v_tournament.format in ('round_robin', 'double_round_robin') then
    v_index := 0;
    for v_pair in
      select first.ordinality as a, second.ordinality as b,
             first.entry as entry_a, second.entry as entry_b
      from unnest(v_entries) with ordinality as first(entry, ordinality)
      join unnest(v_entries) with ordinality as second(entry, ordinality)
        on second.ordinality > first.ordinality
      order by first.ordinality, second.ordinality
    loop
      v_index := v_index + 1;
      insert into public.matches (tournament_id, round_number, bracket_position, status)
      values (p_tournament_id, 1, v_index, 'ready')
      returning id into v_match_id;
      insert into public.match_participants (match_id, entry_id, slot)
      values (v_match_id, v_pair.entry_a, 1), (v_match_id, v_pair.entry_b, 2);
    end loop;

    if v_tournament.format = 'double_round_robin' then
      for v_pair in
        select first.ordinality as a, second.ordinality as b,
               first.entry as entry_a, second.entry as entry_b
        from unnest(v_entries) with ordinality as first(entry, ordinality)
        join unnest(v_entries) with ordinality as second(entry, ordinality)
          on second.ordinality > first.ordinality
        order by first.ordinality, second.ordinality
      loop
        v_index := v_index + 1;
        insert into public.matches (tournament_id, round_number, bracket_position, status)
        values (p_tournament_id, 2, v_index, 'ready')
        returning id into v_match_id;
        -- Nel ritorno si invertono i ruoli.
        insert into public.match_participants (match_id, entry_id, slot)
        values (v_match_id, v_pair.entry_b, 1), (v_match_id, v_pair.entry_a, 2);
      end loop;
    end if;

  elsif v_tournament.format = 'heats' then
    -- Con i gruppi decisi dalla classifica si puo generare solo la prima
    -- manche: le altre dipendono da come finisce questa.
    if v_tournament.heat_seeding = 'standings' then
      perform public._generate_heat_round(p_tournament_id, 1);
    else
      for v_round in 1 .. v_tournament.rounds_count loop
        perform public._generate_heat_round(p_tournament_id, v_round);
      end loop;
    end if;

  elsif v_tournament.format = 'time_trial' then
    for v_round in 1 .. v_tournament.rounds_count loop
      for v_index in 1 .. v_count loop
        insert into public.matches (tournament_id, round_number, bracket_position, status)
        values (p_tournament_id, v_round, v_index, 'ready')
        returning id into v_match_id;
        insert into public.match_participants (match_id, entry_id, slot)
        values (v_match_id, v_entries[v_index], 1);
      end loop;
    end loop;
  end if;

  update public.tournaments set status = 'running' where id = p_tournament_id;

  select count(*) into v_total from public.matches where tournament_id = p_tournament_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'generate_tournament_schedule', 'tournament', p_tournament_id,
    jsonb_build_object('format', v_tournament.format, 'matches', v_total));

  return v_total;
end;
$$;

grant execute on function public.generate_tournament_schedule(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Avanzamento nel tabellone
-- ---------------------------------------------------------------------------

create or replace function public._advance_tournament_winner(p_match_id uuid, p_winner_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_match public.matches%rowtype;
  v_next public.matches%rowtype;
  v_slot smallint;
  v_filled integer;
  v_survivor uuid;
begin
  select * into v_match from public.matches where id = p_match_id for update;

  if v_match.next_match_id is null then
    update public.tournament_entries set status = 'winner' where id = p_winner_entry_id;
    update public.tournaments set status = 'completed'
    where id = v_match.tournament_id and status <> 'completed';
    return;
  end if;

  v_slot := case when v_match.next_match_slot = 'a' then 1 else 2 end;

  update public.match_participants
  set entry_id = p_winner_entry_id
  where match_id = v_match.next_match_id and slot = v_slot;

  select * into v_next from public.matches where id = v_match.next_match_id for update;

  select count(*) into v_filled
  from public.match_participants
  where match_id = v_next.id and entry_id is not null;

  if v_filled = 2 then
    update public.matches set status = 'ready' where id = v_next.id;
    return;
  end if;

  if v_filled = 1 then
    -- Un posto solo occupato non e ancora un passaggio automatico: l'altro
    -- ramo potrebbe produrre un avversario piu tardi.
    if v_next.status = 'completed' and v_next.winner_entry_id is not null then
      return;
    end if;

    if exists (
      select 1
      from public.matches feeder
      where feeder.next_match_id = v_next.id
        and feeder.id <> v_match.id
        and not (
          (feeder.status = 'completed' and feeder.winner_entry_id is null)
          or not exists (
            select 1 from public.match_participants part
            where part.match_id = feeder.id and part.entry_id is not null
          )
        )
    ) then
      return;
    end if;

    select entry_id into v_survivor
    from public.match_participants
    where match_id = v_next.id and entry_id is not null
    limit 1;

    update public.matches
    set winner_entry_id = v_survivor, status = 'completed', completed_at = now()
    where id = v_next.id;

    update public.match_participants
    set placement = 1, outcome = 'win'
    where match_id = v_next.id and entry_id = v_survivor;

    perform public._advance_tournament_winner(v_next.id, v_survivor);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Classifica
-- ---------------------------------------------------------------------------
--
-- Una sola classifica per tutti i formati. `standing_metric` decide il criterio
-- principale; gli altri restano come spareggio, nell'ordine in cui un arbitro
-- li guarderebbe. Finche non c'e un risultato non si assegnano posizioni: un
-- podio prima di giocare sarebbe una bugia.

drop function if exists public.tournament_standings(uuid);

create function public.tournament_standings(p_tournament_id uuid)
returns table (
  entry_id uuid,
  display_name text,
  played integer,
  wins integer,
  draws integer,
  losses integer,
  points numeric,
  best_score numeric,
  total_score numeric,
  eliminated_round integer,
  standing_position integer
)
language sql
stable
security definer
set search_path = public
as $$
  with tournament as (
    select * from public.tournaments where id = p_tournament_id
  ),
  bounds as (
    select
      coalesce(max(match.round_number), 0) as max_round,
      count(*) filter (where match.status = 'completed') > 0 as has_results
    from public.matches match
    where match.tournament_id = p_tournament_id
  ),
  base as (
    select
      entry.id as entry_id,
      entry.display_name,
      entry.status as entry_status,
      entry.created_at,
      count(part.id) filter (where match.status = 'completed')::integer as played,
      count(part.id) filter (where part.outcome = 'win')::integer as wins,
      count(part.id) filter (where part.outcome = 'draw')::integer as draws,
      count(part.id) filter (where part.outcome = 'loss')::integer as losses,
      coalesce(sum(part.points_awarded) filter (where match.status = 'completed'), 0)::numeric as points,
      case
        when (select score_direction from tournament) = 'asc'
          then min(part.score) filter (where match.status = 'completed')
        else max(part.score) filter (where match.status = 'completed')
      end as best_score,
      coalesce(sum(part.score) filter (where match.status = 'completed'), 0)::numeric as total_score,
      max(match.round_number) filter (
        where part.outcome = 'loss' and match.status = 'completed')::integer as eliminated_round
    from public.tournament_entries entry
    left join public.match_participants part on part.entry_id = entry.id
    left join public.matches match on match.id = part.match_id
    where entry.tournament_id = p_tournament_id
      and entry.status <> 'withdrawn'
    group by entry.id, entry.display_name, entry.status, entry.created_at
  ),
  ranked as (
    select
      base.*,
      case
        when bounds.has_results then
          row_number() over (
            order by
              case when tournament.standing_metric = 'bracket' then
                case
                  when base.entry_status = 'winner' then 0
                  when base.eliminated_round is null then 1
                  else bounds.max_round - base.eliminated_round + 2
                end
              end asc nulls last,
              case when tournament.standing_metric = 'wins' then base.wins end desc nulls last,
              case when tournament.standing_metric in ('points_sum', 'placement_points')
                then base.points end desc nulls last,
              case when tournament.standing_metric = 'best_time' then base.best_score end asc nulls last,
              case when tournament.standing_metric = 'total_time' then base.total_score end asc nulls last,
              base.wins desc,
              base.losses asc,
              base.played desc,
              base.created_at asc
          )::integer
      end as standing_position
    from base, bounds, tournament
  )
  select
    ranked.entry_id,
    ranked.display_name,
    ranked.played,
    ranked.wins,
    ranked.draws,
    ranked.losses,
    ranked.points,
    ranked.best_score,
    ranked.total_score,
    ranked.eliminated_round,
    ranked.standing_position
  from ranked
  order by ranked.standing_position nulls last, ranked.created_at;
$$;

grant execute on function public.tournament_standings(uuid) to anon, authenticated;

-- Piazzamenti finali: la posizione in classifica vale per qualunque formato,
-- quindi la vecchia funzione dedicata all'eliminazione diretta non serve piu.
drop function if exists public._award_knockout_placements(uuid);

create function public._award_final_placements(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_row record;
begin
  for v_row in
    select standing.entry_id, standing.standing_position
    from public.tournament_standings(p_tournament_id) standing
    where standing.standing_position is not null
  loop
    perform public._award_scheme_points(p_tournament_id, v_row.entry_id, 'placement', v_row.standing_position);
  end loop;
end;
$$;

revoke all on function public._award_final_placements(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Registrazione dei risultati
-- ---------------------------------------------------------------------------

-- Deriva piazzamenti, esiti e punti di una partita gia scritta nei posti.
create function public._settle_match(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_match public.matches%rowtype;
  v_tournament public.tournaments%rowtype;
  v_assigned integer;
  v_missing integer;
  v_leaders integer;
  v_winner uuid;
  v_points jsonb;
begin
  select * into v_match from public.matches where id = p_match_id;
  select * into v_tournament from public.tournaments where id = v_match.tournament_id;

  select count(*) into v_assigned
  from public.match_participants
  where match_id = p_match_id and entry_id is not null;

  if v_assigned = 0 then
    raise exception using errcode = 'P0001', message = 'MATCH_WITHOUT_ENTRIES';
  end if;

  if v_tournament.result_kind in ('points', 'time') then
    select count(*) into v_missing
    from public.match_participants
    where match_id = p_match_id and entry_id is not null and score is null;
    if v_missing > 0 then
      raise exception using errcode = 'P0001', message = 'SCORE_REQUIRED';
    end if;

    -- Il piazzamento si ricava dal punteggio: a parita di valore si condivide
    -- la posizione, come in qualunque classifica sportiva.
    update public.match_participants participant
    set placement = ranked.position
    from (
      select part.id,
        rank() over (
          order by
            case when v_tournament.score_direction = 'asc' then part.score end asc,
            case when v_tournament.score_direction = 'desc' then part.score end desc
        )::integer as position
      from public.match_participants part
      where part.match_id = p_match_id and part.entry_id is not null
    ) ranked
    where participant.id = ranked.id;

  elsif v_tournament.result_kind = 'placement' then
    select count(*) into v_missing
    from public.match_participants
    where match_id = p_match_id and entry_id is not null and placement is null;
    if v_missing > 0 then
      raise exception using errcode = 'P0001', message = 'PLACEMENT_REQUIRED';
    end if;

  else
    -- Vittoria secca: un vincitore e uno solo, oppure tutti pari dove e ammesso.
    select count(*) into v_leaders
    from public.match_participants
    where match_id = p_match_id and entry_id is not null and outcome = 'win';

    if v_leaders = 0 and v_tournament.allow_draw and not exists (
      select 1 from public.match_participants
      where match_id = p_match_id and entry_id is not null
        and coalesce(outcome, '') <> 'draw'
    ) then
      update public.match_participants set placement = 1
      where match_id = p_match_id and entry_id is not null;
    elsif v_leaders <> 1 then
      raise exception using errcode = 'P0001', message = 'WINNER_REQUIRED';
    else
      update public.match_participants
      set placement = case when outcome = 'win' then 1 else 2 end
      where match_id = p_match_id and entry_id is not null;
    end if;
  end if;

  -- Esiti derivati dal piazzamento: chi e primo da solo vince, chi divide il
  -- primo posto pareggia, gli altri perdono.
  select count(*) into v_leaders
  from public.match_participants
  where match_id = p_match_id and entry_id is not null and placement = 1;

  if v_leaders > 1 and not v_tournament.allow_draw and v_assigned = 2 then
    raise exception using errcode = 'P0001', message = 'TIE_NOT_ALLOWED';
  end if;

  update public.match_participants
  set outcome = case
    when placement = 1 and v_leaders = 1 then 'win'
    when placement = 1 then 'draw'
    else 'loss'
  end
  where match_id = p_match_id and entry_id is not null;

  -- Punti di classifica del torneo.
  v_points := v_tournament.scoring_config -> 'placement_points';
  update public.match_participants
  set points_awarded = case
    when v_tournament.standing_metric = 'placement_points'
      then coalesce((v_points ->> (placement - 1))::numeric, 0)
    when v_tournament.standing_metric = 'points_sum' then coalesce(score, 0)
    else 0
  end
  where match_id = p_match_id and entry_id is not null;

  if v_leaders = 1 then
    select entry_id into v_winner
    from public.match_participants
    where match_id = p_match_id and entry_id is not null and placement = 1;
  else
    v_winner := null;
  end if;

  update public.matches
  set winner_entry_id = v_winner,
      status = 'completed',
      completed_at = coalesce(completed_at, now())
  where id = p_match_id;

  return v_winner;
end;
$$;

revoke all on function public._settle_match(uuid) from public, anon, authenticated;

create function public.record_match_results(p_match_id uuid, p_results jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_match public.matches%rowtype;
  v_tournament public.tournaments%rowtype;
  v_result jsonb;
  v_entry_id uuid;
  v_winner uuid;
  v_row record;
  v_next_round integer;
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select match.* into v_match from public.matches match where match.id = p_match_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'MATCH_NOT_FOUND';
  end if;
  if v_match.status not in ('ready', 'called', 'running') then
    raise exception using errcode = 'P0001', message = 'MATCH_NOT_PLAYABLE';
  end if;
  if jsonb_typeof(p_results) <> 'array' then
    raise exception using errcode = 'P0001', message = 'INVALID_RESULTS';
  end if;

  select * into v_tournament from public.tournaments where id = v_match.tournament_id;

  for v_result in select value from jsonb_array_elements(p_results) loop
    v_entry_id := nullif(v_result ->> 'entry_id', '')::uuid;
    if v_entry_id is null then
      raise exception using errcode = 'P0001', message = 'INVALID_RESULTS';
    end if;
    if not exists (
      select 1 from public.match_participants
      where match_id = p_match_id and entry_id = v_entry_id
    ) then
      raise exception using errcode = 'P0001', message = 'ENTRY_NOT_IN_MATCH';
    end if;

    update public.match_participants
    set score = nullif(v_result ->> 'score', '')::numeric,
        placement = nullif(v_result ->> 'placement', '')::integer,
        outcome = nullif(v_result ->> 'outcome', '')
    where match_id = p_match_id and entry_id = v_entry_id;
  end loop;

  v_winner := public._settle_match(p_match_id);

  -- Punti VRSUS per incontro: hanno senso dove esiste un avversario diretto.
  if v_tournament.ranking_enabled
     and v_tournament.format in ('round_robin', 'double_round_robin') then
    for v_row in
      select part.entry_id, part.outcome
      from public.match_participants part
      where part.match_id = p_match_id and part.entry_id is not null
    loop
      perform public._award_scheme_points(
        v_match.tournament_id, v_row.entry_id,
        case v_row.outcome
          when 'win' then 'match_win'
          when 'draw' then 'match_draw'
          else 'match_loss'
        end,
        null, replace(p_match_id::text, '-', ''));
    end loop;
  end if;

  if v_tournament.format = 'single_elimination' then
    update public.tournament_entries entry
    set status = 'eliminated'
    from public.match_participants part
    where part.match_id = p_match_id
      and part.entry_id = entry.id
      and part.outcome = 'loss'
      and entry.status <> 'winner';

    perform public._advance_tournament_winner(p_match_id, v_winner);
  end if;

  -- Manche a sorteggio per classifica: la successiva si costruisce solo ora
  -- che la precedente e chiusa.
  if v_tournament.format = 'heats'
     and v_tournament.heat_seeding = 'standings'
     and not exists (
       select 1 from public.matches
       where tournament_id = v_match.tournament_id
         and round_number = v_match.round_number
         and status <> 'completed')
  then
    v_next_round := v_match.round_number + 1;
    if v_next_round <= v_tournament.rounds_count
       and not exists (
         select 1 from public.matches
         where tournament_id = v_match.tournament_id and round_number = v_next_round)
    then
      perform public._generate_heat_round(v_match.tournament_id, v_next_round);
    end if;
  end if;

  -- Torneo finito: la classifica finale decide i piazzamenti, per ogni formato.
  if not exists (
    select 1 from public.matches
    where tournament_id = v_match.tournament_id and status <> 'completed'
  ) then
    update public.tournaments set status = 'completed'
    where id = v_match.tournament_id and status <> 'completed';

    if v_tournament.ranking_enabled then
      perform public._award_final_placements(v_match.tournament_id);
      perform public._award_participation_points(v_match.tournament_id);
    end if;

    update public.tournament_entries set status = 'winner'
    where id = (
      select standing.entry_id from public.tournament_standings(v_match.tournament_id) standing
      where standing.standing_position = 1
    )
    and status not in ('withdrawn', 'winner');
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'record_match_results', 'match', p_match_id,
    jsonb_build_object('results', p_results, 'winner_entry_id', v_winner));

  return p_match_id;
end;
$$;

grant execute on function public.record_match_results(uuid, jsonb) to authenticated;

-- Correzione di una partita gia chiusa: si riscrivono punteggi e piazzamenti,
-- non si disfa il tabellone. Cambiare il vincitore di un incontro gia
-- avanzato resta fuori portata, come prima.
create function public.amend_match_results(p_match_id uuid, p_results jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_match public.matches%rowtype;
  v_tournament public.tournaments%rowtype;
  v_result jsonb;
  v_entry_id uuid;
  v_winner uuid;
  v_points jsonb;
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select match.* into v_match from public.matches match where match.id = p_match_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'MATCH_NOT_FOUND';
  end if;
  if v_match.status <> 'completed' then
    raise exception using errcode = 'P0001', message = 'MATCH_NOT_COMPLETED';
  end if;
  if jsonb_typeof(p_results) <> 'array' then
    raise exception using errcode = 'P0001', message = 'INVALID_RESULTS';
  end if;

  select * into v_tournament from public.tournaments where id = v_match.tournament_id;
  v_points := v_tournament.scoring_config -> 'placement_points';

  for v_result in select value from jsonb_array_elements(p_results) loop
    v_entry_id := nullif(v_result ->> 'entry_id', '')::uuid;
    if v_entry_id is null or not exists (
      select 1 from public.match_participants
      where match_id = p_match_id and entry_id = v_entry_id
    ) then
      raise exception using errcode = 'P0001', message = 'ENTRY_NOT_IN_MATCH';
    end if;

    update public.match_participants
    set score = nullif(v_result ->> 'score', '')::numeric
    where match_id = p_match_id and entry_id = v_entry_id;
  end loop;

  update public.match_participants
  set points_awarded = case
    when v_tournament.standing_metric = 'placement_points'
      then coalesce((v_points ->> (placement - 1))::numeric, 0)
    when v_tournament.standing_metric = 'points_sum' then coalesce(score, 0)
    else 0
  end
  where match_id = p_match_id and entry_id is not null;

  select entry_id into v_winner
  from public.match_participants
  where match_id = p_match_id and placement = 1 and entry_id is not null
  limit 1;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'amend_match_results', 'match', p_match_id,
    jsonb_build_object('results', p_results));

  return p_match_id;
end;
$$;

grant execute on function public.amend_match_results(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Squadre
-- ---------------------------------------------------------------------------

create function public._generate_join_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  -- Niente 0/O ne 1/I: il codice si detta a voce in mezzo al rumore.
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_index integer;
begin
  loop
    v_code := '';
    for v_index in 1 .. 6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.tournament_entries where join_code = v_code);
  end loop;
  return v_code;
end;
$$;

revoke all on function public._generate_join_code() from public, anon, authenticated;

create function public.create_tournament_team(
  p_tournament_id uuid, p_name text default null, p_visibility text default 'open')
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_tournament public.tournaments%rowtype;
  v_profile public.profiles%rowtype;
  v_entry_id uuid;
  v_count integer;
  v_visibility text := coalesce(nullif(p_visibility, ''), 'open');
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'TOURNAMENT_NOT_FOUND';
  end if;
  if v_tournament.entry_size = 1 then
    raise exception using errcode = 'P0001', message = 'SOLO_TOURNAMENT';
  end if;
  if v_tournament.team_formation = 'admin' then
    raise exception using errcode = 'P0001', message = 'TEAMS_MANAGED_BY_STAFF';
  end if;
  if v_tournament.status <> 'registration_open'
    or (v_tournament.registration_opens_at is not null and now() < v_tournament.registration_opens_at)
    or (v_tournament.registration_closes_at is not null and now() > v_tournament.registration_closes_at)
  then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;
  if v_tournament.team_formation = 'open' then
    v_visibility := 'open';
  end if;

  if exists (
    select 1 from public.tournament_entry_members member
    join public.tournament_entries entry on entry.id = member.entry_id
    where entry.tournament_id = p_tournament_id
      and member.user_id = v_user_id
      and entry.status not in ('withdrawn', 'eliminated')
  ) then
    raise exception using errcode = '23505', message = 'ALREADY_REGISTERED';
  end if;

  select count(*) into v_count from public.tournament_entries
  where tournament_id = p_tournament_id and status <> 'withdrawn';
  if v_tournament.max_entries is not null and v_count >= v_tournament.max_entries then
    raise exception using errcode = 'P0001', message = 'TOURNAMENT_FULL';
  end if;

  if v_tournament.requires_event_booking and v_tournament.event_id is not null and not exists (
    select 1 from public.bookings booking
    where booking.event_id = v_tournament.event_id
      and booking.user_id = v_user_id and booking.status = 'confirmed'
  ) then
    perform public.create_event_booking(v_tournament.event_id);
  end if;

  select * into v_profile from public.profiles where id = v_user_id;

  insert into public.tournament_entries (tournament_id, display_name, status, visibility, join_code)
  values (
    p_tournament_id,
    coalesce(nullif(trim(coalesce(p_name, '')), ''),
      'Squadra di ' || coalesce(v_profile.nickname, v_profile.display_name, 'VRSUS')),
    'forming',
    v_visibility,
    case when v_visibility = 'invite' then public._generate_join_code() else null end)
  returning id into v_entry_id;

  insert into public.tournament_entry_members (entry_id, user_id, is_captain)
  values (v_entry_id, v_user_id, true);

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'create_team', 'tournament_entry', v_entry_id,
    jsonb_build_object('tournament_id', p_tournament_id, 'visibility', v_visibility));

  return v_entry_id;
end;
$$;

grant execute on function public.create_tournament_team(uuid, text, text) to authenticated;

create function public.join_tournament_team(
  p_entry_id uuid default null, p_code text default null)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry public.tournament_entries%rowtype;
  v_tournament public.tournaments%rowtype;
  v_members integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  if p_code is not null and p_code <> '' then
    select * into v_entry from public.tournament_entries
    where join_code = upper(trim(p_code)) for update;
  else
    select * into v_entry from public.tournament_entries where id = p_entry_id for update;
  end if;

  if not found then
    raise exception using errcode = 'P0002', message = 'TEAM_NOT_FOUND';
  end if;

  select * into v_tournament from public.tournaments where id = v_entry.tournament_id;

  if v_tournament.status <> 'registration_open' then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;
  -- Una squadra a invito si raggiunge solo col codice: conoscerne l'id non basta.
  if v_entry.visibility = 'invite' and (p_code is null or p_code = '') then
    raise exception using errcode = '42501', message = 'CODE_REQUIRED';
  end if;
  if v_entry.status = 'withdrawn' then
    raise exception using errcode = 'P0001', message = 'TEAM_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.tournament_entry_members member
    join public.tournament_entries entry on entry.id = member.entry_id
    where entry.tournament_id = v_entry.tournament_id
      and member.user_id = v_user_id
      and entry.status not in ('withdrawn', 'eliminated')
  ) then
    raise exception using errcode = '23505', message = 'ALREADY_REGISTERED';
  end if;

  select count(*) into v_members from public.tournament_entry_members where entry_id = v_entry.id;
  if v_members >= v_tournament.entry_size then
    raise exception using errcode = 'P0001', message = 'TEAM_FULL';
  end if;

  if v_tournament.requires_event_booking and v_tournament.event_id is not null and not exists (
    select 1 from public.bookings booking
    where booking.event_id = v_tournament.event_id
      and booking.user_id = v_user_id and booking.status = 'confirmed'
  ) then
    perform public.create_event_booking(v_tournament.event_id);
  end if;

  insert into public.tournament_entry_members (entry_id, user_id, is_captain)
  values (v_entry.id, v_user_id, false);

  -- Squadra al completo: da qui in poi e un'iscrizione a tutti gli effetti.
  if v_members + 1 >= v_tournament.entry_size then
    update public.tournament_entries set status = 'registered'
    where id = v_entry.id and status = 'forming';
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'join_team', 'tournament_entry', v_entry.id,
    jsonb_build_object('tournament_id', v_entry.tournament_id));

  return v_entry.id;
end;
$$;

grant execute on function public.join_tournament_team(uuid, text) to authenticated;

create function public.leave_tournament_team(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_entry public.tournament_entries%rowtype;
  v_tournament public.tournaments%rowtype;
  v_was_captain boolean;
  v_remaining integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  select * into v_entry from public.tournament_entries where id = p_entry_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'TEAM_NOT_FOUND';
  end if;

  select * into v_tournament from public.tournaments where id = v_entry.tournament_id;
  if v_tournament.status not in ('registration_open', 'registration_closed') then
    raise exception using errcode = 'P0001', message = 'TOURNAMENT_STARTED';
  end if;

  select is_captain into v_was_captain
  from public.tournament_entry_members
  where entry_id = p_entry_id and user_id = v_user_id;

  if v_was_captain is null then
    raise exception using errcode = 'P0002', message = 'NOT_A_MEMBER';
  end if;

  delete from public.tournament_entry_members
  where entry_id = p_entry_id and user_id = v_user_id;

  select count(*) into v_remaining from public.tournament_entry_members where entry_id = p_entry_id;

  if v_remaining = 0 then
    delete from public.tournament_entries where id = p_entry_id;
    return;
  end if;

  if v_was_captain then
    update public.tournament_entry_members
    set is_captain = true
    where entry_id = p_entry_id
      and user_id = (
        select user_id from public.tournament_entry_members
        where entry_id = p_entry_id order by user_id limit 1);
  end if;

  update public.tournament_entries set status = 'forming'
  where id = p_entry_id and status = 'registered' and v_remaining < v_tournament.entry_size;
end;
$$;

grant execute on function public.leave_tournament_team(uuid) to authenticated;

-- L'iscrizione singola resta com'era, ma ora sa di non essere la strada giusta
-- per un torneo a squadre.
create or replace function public.register_tournament_entry(p_tournament_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_tournament public.tournaments%rowtype;
  v_profile public.profiles%rowtype;
  v_entry_id uuid;
  v_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'TOURNAMENT_NOT_FOUND';
  end if;
  if v_tournament.entry_size > 1 then
    raise exception using errcode = 'P0001', message = 'TEAM_TOURNAMENT';
  end if;
  if v_tournament.status <> 'registration_open'
    or (v_tournament.registration_opens_at is not null and now() < v_tournament.registration_opens_at)
    or (v_tournament.registration_closes_at is not null and now() > v_tournament.registration_closes_at)
  then
    raise exception using errcode = 'P0001', message = 'REGISTRATION_CLOSED';
  end if;
  if exists (
    select 1 from public.tournament_entry_members member
    join public.tournament_entries entry on entry.id = member.entry_id
    where entry.tournament_id = p_tournament_id
      and member.user_id = v_user_id
      and entry.status not in ('withdrawn', 'eliminated')
  ) then
    raise exception using errcode = '23505', message = 'ALREADY_REGISTERED';
  end if;

  select count(*) into v_count from public.tournament_entries
  where tournament_id = p_tournament_id and status <> 'withdrawn';
  if v_tournament.max_entries is not null and v_count >= v_tournament.max_entries then
    raise exception using errcode = 'P0001', message = 'TOURNAMENT_FULL';
  end if;

  if v_tournament.requires_event_booking and v_tournament.event_id is not null and not exists (
    select 1 from public.bookings booking
    where booking.event_id = v_tournament.event_id
      and booking.user_id = v_user_id and booking.status = 'confirmed'
  ) then
    perform public.create_event_booking(v_tournament.event_id);
  end if;

  select * into v_profile from public.profiles where id = v_user_id;

  insert into public.tournament_entries (tournament_id, display_name)
  values (p_tournament_id, coalesce(v_profile.nickname, v_profile.display_name, 'Partecipante'))
  returning id into v_entry_id;

  insert into public.tournament_entry_members (entry_id, user_id, is_captain)
  values (v_entry_id, v_user_id, true);

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (v_user_id, 'register', 'tournament_entry', v_entry_id,
    jsonb_build_object('tournament_id', p_tournament_id));

  return v_entry_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Operazioni di serata allineate ai posti in partita
-- ---------------------------------------------------------------------------

create or replace function public.call_tournament_match(p_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_match public.matches%rowtype;
  v_tournament public.tournaments%rowtype;
  v_notification_ids uuid[];
  v_expected integer;
  v_assigned integer;
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'MATCH_NOT_FOUND';
  end if;
  select * into v_tournament from public.tournaments where id = v_match.tournament_id;

  if v_match.status in ('called', 'running') then
    select coalesce(array_agg(id order by created_at), '{}'::uuid[]) into v_notification_ids
    from public.notifications where metadata ->> 'match_id' = p_match_id::text;
    return jsonb_build_object('match_id', p_match_id, 'notification_ids', to_jsonb(v_notification_ids));
  end if;

  -- Una partita si chiama quando i suoi posti sono occupati. In un duello sono
  -- due, in una manche possono essere meno del previsto se gli iscritti non
  -- riempiono l'ultimo gruppo: conta che ci sia qualcuno da chiamare.
  select count(*), count(entry_id) into v_expected, v_assigned
  from public.match_participants where match_id = p_match_id;

  if v_match.status <> 'ready' or v_assigned = 0
     or (v_tournament.format = 'single_elimination' and v_assigned < 2) then
    raise exception using errcode = 'P0001', message = 'MATCH_NOT_READY';
  end if;

  update public.matches
  set status = 'called', called_at = coalesce(called_at, now())
  where id = p_match_id;

  insert into public.notifications (user_id, type, title, message, action_url, metadata)
  select distinct member.user_id,
    'tournament_match_called',
    'È il tuo turno',
    format('Presentati alla postazione per il match di %s.', v_tournament.name),
    '/app/tornei/' || v_tournament.id,
    jsonb_build_object('match_id', p_match_id, 'tournament_id', v_tournament.id)
  from public.match_participants part
  join public.tournament_entry_members member on member.entry_id = part.entry_id
  where part.match_id = p_match_id and part.entry_id is not null;

  select coalesce(array_agg(id order by created_at), '{}'::uuid[]) into v_notification_ids
  from public.notifications where metadata ->> 'match_id' = p_match_id::text;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'call_match_players', 'match', p_match_id,
    jsonb_build_object('notification_ids', v_notification_ids));

  return jsonb_build_object('match_id', p_match_id, 'notification_ids', to_jsonb(v_notification_ids));
end;
$$;

create or replace function public.withdraw_tournament_entry(p_tournament_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_entry_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  select entry.id into v_entry_id
  from public.tournament_entries entry
  join public.tournament_entry_members member on member.entry_id = entry.id
  where entry.tournament_id = p_tournament_id
    and member.user_id = auth.uid()
    and entry.status in ('forming', 'registered', 'checked_in');

  if v_entry_id is null then
    raise exception using errcode = 'P0002', message = 'ENTRY_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.matches match
    join public.match_participants part on part.match_id = match.id
    where match.tournament_id = p_tournament_id
      and match.status not in ('pending', 'ready')
      and part.entry_id = v_entry_id
  ) then
    raise exception using errcode = 'P0001', message = 'BRACKET_STARTED';
  end if;

  update public.tournament_entries set status = 'withdrawn' where id = v_entry_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'withdraw', 'tournament_entry', v_entry_id,
    jsonb_build_object('tournament_id', p_tournament_id));

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Fine della transizione
-- ---------------------------------------------------------------------------

drop function if exists public.create_single_elimination_bracket(uuid);
drop function if exists public.create_round_robin_schedule(uuid);
drop function if exists public.record_match_result(uuid, jsonb, uuid);
drop function if exists public.amend_match_score(uuid, jsonb);

-- Il vincitore non e piu uno dei due lati: e il posto arrivato primo. Il
-- vincolo non si puo esprimere come check (servirebbe una sottoquery), lo
-- garantisce il motore: `_settle_match` scrive il vincitore leggendo i posti.
alter table public.matches
  drop constraint matches_winner_belongs_check,
  drop column entry_a_id,
  drop column entry_b_id,
  drop column score_payload;
