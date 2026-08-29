-- Super-admin-only role management. Authorization is enforced in the database.

create function public.set_user_role(
  target_user_id uuid,
  target_role_code text,
  should_assign boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_role_id uuid;
begin
  if not public.has_role('super_admin') then
    raise exception 'super_admin role required' using errcode = 'insufficient_privilege';
  end if;

  select id into target_role_id from public.roles where code = target_role_code;
  if target_role_id is null then
    raise exception 'unknown role code' using errcode = 'invalid_parameter_value';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'target user profile not found' using errcode = 'foreign_key_violation';
  end if;

  if should_assign then
    insert into public.user_roles (user_id, role_id, created_by)
    values (target_user_id, target_role_id, auth.uid())
    on conflict (user_id, role_id) do nothing;
  else
    delete from public.user_roles
    where user_id = target_user_id and role_id = target_role_id;
  end if;

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id, after_data, metadata
  )
  values (
    auth.uid(),
    case when should_assign then 'role.assigned' else 'role.removed' end,
    'user_role',
    target_user_id,
    jsonb_build_object('role', target_role_code, 'assigned', should_assign),
    jsonb_build_object('source', 'set_user_role')
  );
end;
$$;

revoke all on function public.set_user_role(uuid, text, boolean) from public, anon;
grant execute on function public.set_user_role(uuid, text, boolean) to authenticated;
