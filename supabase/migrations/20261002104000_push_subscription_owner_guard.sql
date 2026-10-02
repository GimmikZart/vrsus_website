-- A guessed OneSignal subscription ID must not move an active device from
-- another account. A device may be reattached after its owner signs out.
create or replace function public.upsert_push_subscription(
  p_provider text,
  p_provider_subscription_id text,
  p_device_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if char_length(trim(coalesce(p_provider, ''))) not between 2 and 40
    or char_length(trim(coalesce(p_provider_subscription_id, ''))) not between 1 and 255
  then
    raise exception using errcode = '22023', message = 'INVALID_PUSH_SUBSCRIPTION';
  end if;

  insert into public.push_subscriptions
    (user_id, provider, provider_subscription_id, device_label, active)
  values
    (auth.uid(), trim(p_provider), trim(p_provider_subscription_id),
     nullif(trim(p_device_label), ''), true)
  on conflict (provider, provider_subscription_id) do update set
    user_id = excluded.user_id,
    device_label = excluded.device_label,
    active = true
  where public.push_subscriptions.user_id = auth.uid()
     or public.push_subscriptions.active = false
  returning id into v_id;

  if v_id is null then
    raise exception using errcode = '42501', message = 'PUSH_SUBSCRIPTION_IN_USE';
  end if;
  perform public.upsert_notification_preferences(true, false);
  return v_id;
end;
$$;
