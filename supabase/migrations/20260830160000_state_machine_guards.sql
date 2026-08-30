-- Enforce the operational state machines at the database boundary.

create or replace function public.enforce_event_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'draft' and new.status in ('scheduled', 'cancelled'))
    or (old.status = 'scheduled' and new.status in ('running', 'cancelled'))
    or (
      old.status = 'scheduled'
      and new.status = 'draft'
      and timezone('utc', now()) < old.starts_at
    )
    or (old.status = 'running' and new.status in ('completed', 'cancelled'))
  ) then
    raise exception 'INVALID_EVENT_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_tournament_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'draft' and new.status in ('registration_open', 'cancelled'))
    or (
      old.status = 'registration_open'
      and new.status in ('registration_closed', 'cancelled')
    )
    or (
      old.status = 'registration_closed'
      and new.status in ('checkin', 'running', 'cancelled')
    )
    or (old.status = 'checkin' and new.status in ('running', 'cancelled'))
    or (old.status = 'running' and new.status in ('completed', 'cancelled'))
  ) then
    raise exception 'INVALID_TOURNAMENT_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

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
    or (old.status = 'ready' and new.status in ('called', 'running', 'cancelled'))
    or (old.status = 'called' and new.status in ('running', 'cancelled'))
    or (old.status = 'running' and new.status in ('completed', 'cancelled'))
  ) then
    raise exception 'INVALID_MATCH_STATUS_TRANSITION' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists events_status_transition_guard on public.events;
create trigger events_status_transition_guard
  before update of status on public.events
  for each row execute function public.enforce_event_status_transition();

drop trigger if exists tournaments_status_transition_guard on public.tournaments;
create trigger tournaments_status_transition_guard
  before update of status on public.tournaments
  for each row execute function public.enforce_tournament_status_transition();

drop trigger if exists matches_status_transition_guard on public.matches;
create trigger matches_status_transition_guard
  before update of status on public.matches
  for each row execute function public.enforce_match_status_transition();

-- A downstream match may receive one winner before its other feeder has
-- finished. Treat it as a bye only when every other feeder is genuinely
-- empty (or already completed without a winner); otherwise leave it pending
-- until the second winner arrives.
create or replace function public._advance_tournament_winner(
  p_match_id uuid,
  p_winner_entry_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_match public.matches%rowtype;
  v_next public.matches%rowtype;
begin
  select *
  into v_match
  from public.matches
  where id = p_match_id
  for update;

  if v_match.next_match_id is null then
    update public.tournament_entries
    set status = 'winner'
    where id = p_winner_entry_id;

    update public.tournaments
    set status = 'completed'
    where id = v_match.tournament_id;
    return;
  end if;

  select *
  into v_next
  from public.matches
  where id = v_match.next_match_id
  for update;

  if v_match.next_match_slot = 'a' then
    update public.matches
    set entry_a_id = p_winner_entry_id
    where id = v_next.id;
  else
    update public.matches
    set entry_b_id = p_winner_entry_id
    where id = v_next.id;
  end if;

  select *
  into v_next
  from public.matches
  where id = v_next.id
  for update;

  if v_next.entry_a_id is not null and v_next.entry_b_id is not null then
    update public.matches
    set status = 'ready'
    where id = v_next.id;
  elsif v_next.entry_a_id is not null or v_next.entry_b_id is not null then
    -- Do not turn a partially populated future match into a bye. The other
    -- feeder may still produce a competitor later in this round.
    if v_next.status = 'completed' and v_next.winner_entry_id is not null then
      return;
    end if;

    if not exists (
      select 1
      from public.matches feeder
      where feeder.next_match_id = v_next.id
        and feeder.id <> v_match.id
        and not (
          (feeder.entry_a_id is null and feeder.entry_b_id is null)
          or (feeder.status = 'completed' and feeder.winner_entry_id is null)
        )
    ) then
      update public.matches
      set winner_entry_id = coalesce(v_next.entry_a_id, v_next.entry_b_id),
          status = 'completed',
          completed_at = now()
      where id = v_next.id;

      perform public._advance_tournament_winner(
        v_next.id,
        coalesce(v_next.entry_a_id, v_next.entry_b_id)
      );
    end if;
  end if;
end;
$$;

create or replace function public.record_match_result(
  p_match_id uuid,
  p_score_payload jsonb,
  p_winner_entry_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_match public.matches%rowtype;
  v_tournament public.tournaments%rowtype;
  v_loser_id uuid;
begin
  if not public.has_any_role(array['tournament_admin', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select match.*
  into v_match
  from public.matches match
  where match.id = p_match_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'MATCH_NOT_FOUND';
  end if;

  if v_match.status <> 'running' then
    raise exception using errcode = 'P0001', message = 'MATCH_NOT_PLAYABLE';
  end if;

  if p_winner_entry_id is null
    or p_winner_entry_id not in (v_match.entry_a_id, v_match.entry_b_id) then
    raise exception using errcode = 'P0001', message = 'WINNER_NOT_IN_MATCH';
  end if;

  v_loser_id := case
    when p_winner_entry_id = v_match.entry_a_id then v_match.entry_b_id
    else v_match.entry_a_id
  end;

  update public.matches
  set winner_entry_id = p_winner_entry_id,
      score_payload = coalesce(p_score_payload, '{}'::jsonb),
      status = 'completed',
      completed_at = now()
  where id = p_match_id;

  update public.tournament_entries
  set status = 'eliminated'
  where id = v_loser_id
    and status <> 'winner';

  select *
  into v_tournament
  from public.tournaments
  where id = v_match.tournament_id;

  if v_match.round_number = (
    select max(round_number)
    from public.matches
    where tournament_id = v_match.tournament_id
  ) then
    update public.tournament_entries
    set status = 'winner'
    where id = p_winner_entry_id;

    update public.tournaments
    set status = 'completed'
    where id = v_match.tournament_id;

    if v_tournament.ranking_enabled then
      perform public._award_tournament_points(
        v_match.tournament_id,
        p_winner_entry_id,
        'tournament_win',
        100
      );
      if v_loser_id is not null then
        perform public._award_tournament_points(
          v_match.tournament_id,
          v_loser_id,
          'tournament_runner_up',
          60
        );
      end if;
    end if;
  else
    perform public._advance_tournament_winner(p_match_id, p_winner_entry_id);
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    auth.uid(),
    'record_match_result',
    'match',
    p_match_id,
    jsonb_build_object(
      'winner_entry_id', p_winner_entry_id,
      'score_payload', coalesce(p_score_payload, '{}'::jsonb)
    )
  );

  return p_match_id;
end;
$$;
