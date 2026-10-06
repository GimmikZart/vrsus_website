-- Manual messages can target one profile as well as every user or the checked-in
-- audience of a running event. The target is part of the audited dispatch.
drop function public.send_manual_notification(text, uuid, text, uuid);

create function public.send_manual_notification(
  p_scope text,
  p_event_id uuid,
  p_message text,
  p_dispatch_id uuid,
  p_target_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_message text := btrim(p_message);
  v_count integer;
  v_inserted integer;
begin
  if p_scope = 'user' then
    if not public.has_any_role(array['staff', 'admin', 'super_admin']) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  elsif not public.has_any_role(array['admin', 'super_admin']) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_scope not in ('all', 'live_event', 'user') or p_scope is null
    or v_message is null or char_length(v_message) not between 1 and 300
    or p_dispatch_id is null
    or (p_scope = 'all' and (p_event_id is not null or p_target_user_id is not null))
    or (p_scope = 'live_event' and (p_event_id is null or p_target_user_id is not null))
    or (p_scope = 'user' and (p_target_user_id is null or p_event_id is not null)) then
    raise exception 'INVALID_MANUAL_NOTIFICATION' using errcode = '22023';
  end if;

  if p_scope = 'live_event' then
    perform 1 from public.events
    where id = p_event_id and status = 'running'
    for share;
    if not found then
      raise exception 'EVENT_NOT_RUNNING' using errcode = '22023';
    end if;
  elsif p_scope = 'user' then
    perform 1 from public.profiles where id = p_target_user_id for share;
    if not found then
      raise exception 'USER_NOT_FOUND' using errcode = '22023';
    end if;
  end if;

  insert into public.audit_logs
    (actor_user_id, action, entity_type, entity_id, after_data)
  values
    (auth.uid(), 'manual_notification_sent', 'notification_dispatch',
     p_dispatch_id, jsonb_build_object(
       'scope', p_scope,
       'event_id', p_event_id,
       'target_user_id', p_target_user_id
     ))
  on conflict (action, entity_id)
    where action = 'manual_notification_sent' do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select (after_data ->> 'recipient_count')::integer into v_count
    from public.audit_logs
    where action = 'manual_notification_sent' and entity_id = p_dispatch_id;
    return v_count;
  end if;

  if p_scope = 'all' then
    insert into public.notifications
      (user_id, type, title, message, metadata)
    select id, 'manual', 'Messaggio da VRSUS', v_message,
      jsonb_build_object('dispatch_id', p_dispatch_id, 'scope', p_scope)
    from public.profiles;
  elsif p_scope = 'live_event' then
    insert into public.notifications
      (user_id, type, title, message, metadata)
    select distinct user_id, 'manual', 'Messaggio da VRSUS', v_message,
      jsonb_build_object(
        'dispatch_id', p_dispatch_id,
        'scope', p_scope,
        'event_id', p_event_id
      )
    from public.event_checkins
    where event_id = p_event_id;
  else
    insert into public.notifications
      (user_id, type, title, message, metadata)
    values
      (p_target_user_id, 'manual', 'Messaggio da VRSUS', v_message,
       jsonb_build_object(
         'dispatch_id', p_dispatch_id,
         'scope', p_scope,
         'target_user_id', p_target_user_id
       ));
  end if;
  get diagnostics v_count = row_count;

  update public.audit_logs
  set after_data = after_data || jsonb_build_object('recipient_count', v_count)
  where action = 'manual_notification_sent' and entity_id = p_dispatch_id;

  return v_count;
end;
$$;

revoke all on function public.send_manual_notification(text, uuid, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.send_manual_notification(text, uuid, text, uuid, uuid)
  to authenticated;
