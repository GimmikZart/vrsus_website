-- Phase 2 role lookup. The function exposes only the current user's role codes.

create function public.get_my_roles()
returns table (code text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select role.code
  from public.user_roles user_role
  join public.roles role on role.id = user_role.role_id
  where user_role.user_id = auth.uid()
  order by role.code;
$$;

revoke all on function public.get_my_roles() from public, anon;
grant execute on function public.get_my_roles() to authenticated;
