-- Fase A, terza parte: motore dei punti guidato dallo schema (DEC-027) e RPC
-- di profilo, consenso genitoriale e bacheca.
--
-- I punti erano cablati dentro record_match_result: 100 al vincitore e 60 al
-- secondo, due sole posizioni e solo per l'eliminazione diretta. Qui la logica
-- viene sostituita, non affiancata: lasciarle entrambe assegnerebbe i punti due
-- volte.

-- ---------------------------------------------------------------------------
-- 1. Risoluzione dei punti da uno schema
-- ---------------------------------------------------------------------------

create function public._scheme_points(
  p_scheme_id uuid, p_rule_type text, p_placement integer default null)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select rule.points
  from public.point_scheme_rules rule
  where rule.scheme_id = p_scheme_id
    and rule.rule_type = p_rule_type
    and (
      p_rule_type <> 'placement'
      or (p_placement is not null
          and p_placement >= rule.placement_from
          and p_placement <= coalesce(rule.placement_to, rule.placement_from))
    )
  order by rule.sort_order, rule.placement_from nulls last
  limit 1;
$$;

revoke all on function public._scheme_points(uuid, text, integer) from public, anon, authenticated;

-- Scrive nel ledger i punti per tutti i membri di una entry. Il reason_code
-- rende l'operazione idempotente grazie all'indice unico gia esistente
-- (tournament_id, user_id, reason_code).
create or replace function public._award_tournament_points(
  p_tournament_id uuid, p_entry_id uuid, p_reason text, p_points integer)
returns void
language sql
security definer
set search_path = public, auth, extensions
as $$
  insert into public.ranking_points_ledger
    (user_id, game_id, tournament_id, points, reason_code, description, created_by, metadata)
  select member.user_id, tournament.game_id, p_tournament_id, p_points, p_reason,
    'Punti torneo: ' || p_reason,
    auth.uid(), jsonb_build_object('entry_id', p_entry_id)
  from public.tournament_entry_members member
  join public.tournaments tournament on tournament.id = p_tournament_id
  where member.entry_id = p_entry_id
    and p_points is not null
    and p_points <> 0
  on conflict (tournament_id, user_id, reason_code) where tournament_id is not null do nothing;
$$;

revoke all on function public._award_tournament_points(uuid, uuid, text, integer) from public, anon, authenticated;

-- Assegna i punti di una regola dello schema collegato al torneo.
create function public._award_scheme_points(
  p_tournament_id uuid, p_entry_id uuid, p_rule_type text,
  p_placement integer default null, p_reason_suffix text default null)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_scheme_id uuid;
  v_points integer;
  v_reason text;
begin
  select point_scheme_id into v_scheme_id from public.tournaments where id = p_tournament_id;
  if v_scheme_id is null then
    return;
  end if;

  v_points := public._scheme_points(v_scheme_id, p_rule_type, p_placement);
  if v_points is null or v_points = 0 then
    return;
  end if;

  v_reason := case
    when p_rule_type = 'placement' then 'placement_' || p_placement::text
    else p_rule_type
  end;
  if p_reason_suffix is not null then
    v_reason := v_reason || '_' || p_reason_suffix;
  end if;

  perform public._award_tournament_points(p_tournament_id, p_entry_id, v_reason, v_points);
end;
$$;

revoke all on function public._award_scheme_points(uuid, uuid, text, integer, text) from public, anon, authenticated;

-- Punti di partecipazione a tutti gli iscritti che non si sono ritirati.
create function public._award_participation_points(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_entry record;
begin
  for v_entry in
    select id from public.tournament_entries
    where tournament_id = p_tournament_id and status <> 'withdrawn'
  loop
    perform public._award_scheme_points(p_tournament_id, v_entry.id, 'participation');
  end loop;
end;
$$;

revoke all on function public._award_participation_points(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. record_match_result guidato dallo schema
-- ---------------------------------------------------------------------------

create or replace function public.record_match_result(
  p_match_id uuid, p_score_payload jsonb, p_winner_entry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_match public.matches%rowtype;
  v_tournament public.tournaments%rowtype;
  v_loser_id uuid;
  v_is_final boolean;
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  select match.* into v_match from public.matches match where match.id = p_match_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'MATCH_NOT_FOUND'; end if;
  if v_match.status not in ('ready', 'called', 'running') then
    raise exception using errcode = 'P0001', message = 'MATCH_NOT_PLAYABLE';
  end if;
  if p_winner_entry_id is null
     or p_winner_entry_id not in (v_match.entry_a_id, v_match.entry_b_id) then
    raise exception using errcode = 'P0001', message = 'WINNER_NOT_IN_MATCH';
  end if;

  v_loser_id := case when p_winner_entry_id = v_match.entry_a_id
    then v_match.entry_b_id else v_match.entry_a_id end;

  update public.matches
  set winner_entry_id = p_winner_entry_id,
      score_payload = coalesce(p_score_payload, '{}'::jsonb),
      status = 'completed',
      completed_at = now()
  where id = p_match_id;

  select * into v_tournament from public.tournaments where id = v_match.tournament_id;

  -- Nei gironi ogni incontro vale punti; nell'eliminazione diretta contano i
  -- piazzamenti finali.
  if v_tournament.ranking_enabled and v_tournament.format in ('round_robin', 'double_round_robin') then
    perform public._award_scheme_points(v_match.tournament_id, p_winner_entry_id,
      'match_win', null, replace(p_match_id::text, '-', ''));
    if v_loser_id is not null then
      perform public._award_scheme_points(v_match.tournament_id, v_loser_id,
        'match_loss', null, replace(p_match_id::text, '-', ''));
    end if;
  end if;

  if v_tournament.format = 'single_elimination' then
    update public.tournament_entries set status = 'eliminated'
    where id = v_loser_id and status <> 'winner';

    v_is_final := v_match.round_number = (
      select max(round_number) from public.matches where tournament_id = v_match.tournament_id);

    if v_is_final then
      update public.tournament_entries set status = 'winner' where id = p_winner_entry_id;
      update public.tournaments set status = 'completed' where id = v_match.tournament_id;
      if v_tournament.ranking_enabled then
        perform public._award_scheme_points(v_match.tournament_id, p_winner_entry_id, 'placement', 1);
        if v_loser_id is not null then
          perform public._award_scheme_points(v_match.tournament_id, v_loser_id, 'placement', 2);
        end if;
        perform public._award_participation_points(v_match.tournament_id);
      end if;
    else
      perform public._advance_tournament_winner(p_match_id, p_winner_entry_id);
    end if;
  else
    -- Girone concluso: tutti gli incontri sono stati giocati.
    if not exists (
      select 1 from public.matches
      where tournament_id = v_match.tournament_id and status <> 'completed'
    ) then
      update public.tournaments set status = 'completed' where id = v_match.tournament_id;
      if v_tournament.ranking_enabled then
        perform public._award_participation_points(v_match.tournament_id);
      end if;
    end if;
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'record_match_result', 'match', p_match_id,
    jsonb_build_object('winner_entry_id', p_winner_entry_id,
      'score_payload', coalesce(p_score_payload, '{}'::jsonb)));
  return p_match_id;
end;
$$;

grant execute on function public.record_match_result(uuid, jsonb, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Generazione del calendario per i gironi
-- ---------------------------------------------------------------------------

create function public.create_round_robin_schedule(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_entries uuid[];
  v_count integer;
  v_created integer := 0;
  i integer;
  j integer;
  v_round integer := 1;
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select * into v_tournament from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'TOURNAMENT_NOT_FOUND'; end if;
  if v_tournament.format not in ('round_robin', 'double_round_robin') then
    raise exception using errcode = 'P0001', message = 'WRONG_FORMAT';
  end if;
  if exists (select 1 from public.matches where tournament_id = p_tournament_id) then
    raise exception using errcode = 'P0001', message = 'BRACKET_ALREADY_EXISTS';
  end if;

  select array_agg(id order by coalesce(seed, 2147483647), created_at)
  into v_entries
  from public.tournament_entries
  where tournament_id = p_tournament_id
    and status in ('registered', 'checked_in');

  v_count := coalesce(array_length(v_entries, 1), 0);
  if v_count < 2 then
    raise exception using errcode = 'P0001', message = 'NOT_ENOUGH_ENTRIES';
  end if;

  -- Tutti contro tutti: ogni coppia una volta. Andata e ritorno: due volte,
  -- con i ruoli invertiti nel girone di ritorno.
  for i in 1 .. v_count - 1 loop
    for j in i + 1 .. v_count loop
      insert into public.matches (tournament_id, round_number, bracket_position, entry_a_id, entry_b_id, status)
      values (p_tournament_id, v_round, v_created + 1, v_entries[i], v_entries[j], 'ready');
      v_created := v_created + 1;
    end loop;
  end loop;

  if v_tournament.format = 'double_round_robin' then
    v_round := 2;
    for i in 1 .. v_count - 1 loop
      for j in i + 1 .. v_count loop
        insert into public.matches (tournament_id, round_number, bracket_position, entry_a_id, entry_b_id, status)
        values (p_tournament_id, v_round, v_created + 1, v_entries[j], v_entries[i], 'ready');
        v_created := v_created + 1;
      end loop;
    end loop;
  end if;

  update public.tournaments set status = 'running' where id = p_tournament_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'create_round_robin_schedule', 'tournament', p_tournament_id,
    jsonb_build_object('matches', v_created));

  return v_created;
end;
$$;

grant execute on function public.create_round_robin_schedule(uuid) to authenticated;

-- Classifica di un girone: vittorie e punti dello schema.
create function public.tournament_standings(p_tournament_id uuid)
returns table (entry_id uuid, display_name text, played integer, wins integer, losses integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    entry.id,
    entry.display_name,
    count(match.id) filter (where match.status = 'completed')::integer as played,
    count(match.id) filter (where match.winner_entry_id = entry.id)::integer as wins,
    count(match.id) filter (
      where match.status = 'completed' and match.winner_entry_id is not null
        and match.winner_entry_id <> entry.id)::integer as losses
  from public.tournament_entries entry
  left join public.matches match
    on match.tournament_id = entry.tournament_id
   and (match.entry_a_id = entry.id or match.entry_b_id = entry.id)
  where entry.tournament_id = p_tournament_id
    and entry.status <> 'withdrawn'
  group by entry.id, entry.display_name
  order by wins desc, played asc, entry.display_name;
$$;

grant execute on function public.tournament_standings(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Profilo: nickname con storico
-- ---------------------------------------------------------------------------

create function public.update_my_nickname(p_nickname text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_current text;
  v_clean text := trim(p_nickname);
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if v_clean is null or char_length(v_clean) < 3 or char_length(v_clean) > 24 then
    raise exception using errcode = '22023', message = 'INVALID_NICKNAME';
  end if;
  if v_clean !~ '^[A-Za-z0-9_.-]+$' then
    raise exception using errcode = '22023', message = 'INVALID_NICKNAME_CHARS';
  end if;

  select nickname into v_current from public.profiles where id = auth.uid();
  if v_current is not null and lower(v_current) = lower(v_clean) then
    return v_current;
  end if;

  if exists (select 1 from public.profiles where lower(nickname) = lower(v_clean) and id <> auth.uid()) then
    raise exception using errcode = '23505', message = 'NICKNAME_TAKEN';
  end if;

  -- Lo storico serve alla moderazione: senza, un cambio nickname rende
  -- irrintracciabile un comportamento gia segnalato.
  if v_current is not null then
    insert into public.profile_nickname_history (user_id, previous_nickname)
    values (auth.uid(), v_current);
  end if;

  update public.profiles
  set nickname = v_clean, display_name = v_clean
  where id = auth.uid();

  return v_clean;
end;
$$;

revoke all on function public.update_my_nickname(text) from public, anon;
grant execute on function public.update_my_nickname(text) to authenticated;

create function public.nickname_available(p_nickname text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where lower(nickname) = lower(trim(p_nickname))
  );
$$;

grant execute on function public.nickname_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Bacheca: voto ai sondaggi e feedback
-- ---------------------------------------------------------------------------

create function public.vote_board_poll(p_post_id uuid, p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if not exists (
    select 1 from public.board_posts post
    where post.id = p_post_id
      and post.post_type = 'poll'
      and post.status = 'published'
      and post.published_at is not null
      and post.published_at <= timezone('utc', now())
  ) then
    raise exception using errcode = 'P0002', message = 'POLL_NOT_AVAILABLE';
  end if;
  if not exists (
    select 1 from public.board_poll_options where id = p_option_id and post_id = p_post_id
  ) then
    raise exception using errcode = 'P0001', message = 'OPTION_NOT_IN_POLL';
  end if;

  insert into public.board_poll_votes (post_id, option_id, user_id)
  values (p_post_id, p_option_id, auth.uid())
  on conflict (post_id, user_id) do update set option_id = excluded.option_id, created_at = timezone('utc', now());
end;
$$;

revoke all on function public.vote_board_poll(uuid, uuid) from public, anon;
grant execute on function public.vote_board_poll(uuid, uuid) to authenticated;
