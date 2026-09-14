-- Piazzamenti completi per l'eliminazione diretta.
--
-- Lo schema di punteggio puo definire intervalli come 3-4 o 5-8, ma il motore
-- assegnava soltanto il primo e il secondo posto: le regole per gli altri
-- piazzamenti restavano lettera morta. Qui il piazzamento viene derivato dal
-- round in cui una entry e stata eliminata.
--
-- In un bracket a R round, chi perde al round r si colloca nell'intervallo che
-- comincia a 2^(R-r)+1: chi perde la finale e secondo, chi perde in semifinale
-- e terzo o quarto, chi perde ai quarti e fra il quinto e l'ottavo.

create function public._award_knockout_placements(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_rounds integer;
  v_match record;
  v_loser_id uuid;
  v_placement integer;
begin
  select max(round_number) into v_rounds
  from public.matches
  where tournament_id = p_tournament_id;

  if v_rounds is null then
    return;
  end if;

  for v_match in
    select match.round_number, match.entry_a_id, match.entry_b_id, match.winner_entry_id
    from public.matches match
    where match.tournament_id = p_tournament_id
      and match.status = 'completed'
      and match.winner_entry_id is not null
  loop
    v_loser_id := case
      when v_match.winner_entry_id = v_match.entry_a_id then v_match.entry_b_id
      else v_match.entry_a_id
    end;

    -- Un bye non ha sconfitto da premiare.
    if v_loser_id is null then
      continue;
    end if;

    v_placement := power(2, v_rounds - v_match.round_number)::integer + 1;
    perform public._award_scheme_points(p_tournament_id, v_loser_id, 'placement', v_placement);
  end loop;
end;
$$;

revoke all on function public._award_knockout_placements(uuid) from public, anon, authenticated;

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

  if v_tournament.ranking_enabled
     and v_tournament.format in ('round_robin', 'double_round_robin') then
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
        perform public._award_knockout_placements(v_match.tournament_id);
        perform public._award_participation_points(v_match.tournament_id);
      end if;
    else
      perform public._advance_tournament_winner(p_match_id, p_winner_entry_id);
    end if;
  else
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
