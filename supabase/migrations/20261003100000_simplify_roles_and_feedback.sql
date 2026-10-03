-- The product exposes only three cumulative roles: every account is a user,
-- staff accounts are also users, and admins are users and staff (DEC-061).

alter table public.roles drop constraint if exists roles_code_check;

-- Preserve existing privileges before retiring the two legacy role names.
insert into public.user_roles (user_id, role_id, created_by)
select assignment.user_id, staff_role.id, assignment.created_by
from public.user_roles assignment
join public.roles legacy_role on legacy_role.id = assignment.role_id
cross join public.roles staff_role
where legacy_role.code = 'tournament_admin'
  and staff_role.code = 'staff'
on conflict (user_id, role_id) do nothing;

insert into public.user_roles (user_id, role_id, created_by)
select assignment.user_id, admin_role.id, assignment.created_by
from public.user_roles assignment
join public.roles legacy_role on legacy_role.id = assignment.role_id
cross join public.roles admin_role
where legacy_role.code = 'super_admin'
  and admin_role.code = 'admin'
on conflict (user_id, role_id) do nothing;

delete from public.user_roles
where role_id in (
  select id from public.roles where code in ('tournament_admin', 'super_admin')
);

delete from public.roles where code in ('tournament_admin', 'super_admin');

alter table public.roles
  add constraint roles_code_check check (code in ('user', 'staff', 'admin'));

update public.roles
set name = case code
    when 'user' then 'User'
    when 'staff' then 'Staff'
    when 'admin' then 'Admin'
  end,
  description = case code
    when 'user' then 'Cliente registrato.'
    when 'staff' then 'Operatore per funzioni live, tornei, ranking e utenti.'
    when 'admin' then 'Amministratore completo della piattaforma.'
  end,
  updated_at = timezone('utc', now());

-- Backfill the cumulative hierarchy for every existing profile.
insert into public.user_roles (user_id, role_id)
select profile.id, user_role.id
from public.profiles profile
cross join public.roles user_role
where user_role.code = 'user'
on conflict (user_id, role_id) do nothing;

insert into public.user_roles (user_id, role_id)
select assignment.user_id, staff_role.id
from public.user_roles assignment
join public.roles assigned_role on assigned_role.id = assignment.role_id
cross join public.roles staff_role
where assigned_role.code = 'admin'
  and staff_role.code = 'staff'
on conflict (user_id, role_id) do nothing;

-- New profiles always receive the base User role.
create or replace function public.ensure_base_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role_id)
  select new.id, role.id
  from public.roles role
  where role.code = 'user'
  on conflict (user_id, role_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profile_ensure_base_user_role on public.profiles;
create trigger profile_ensure_base_user_role
  after insert on public.profiles
  for each row execute function public.ensure_base_user_role();

create or replace function public.enforce_role_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_code text;
begin
  select code into assigned_code from public.roles where id = new.role_id;
  if assigned_code in ('staff', 'admin') then
    insert into public.user_roles (user_id, role_id, created_by)
    select new.user_id, role.id, new.created_by
    from public.roles role
    where role.code = 'user'
       or (assigned_code = 'admin' and role.code = 'staff')
    on conflict (user_id, role_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists user_roles_enforce_hierarchy on public.user_roles;
create trigger user_roles_enforce_hierarchy
  after insert on public.user_roles
  for each row execute function public.enforce_role_hierarchy();

-- Legacy policy/function bodies still mention the retired names. Map them to
-- their successor until those historical migrations are naturally retired.
create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.user_roles user_role
    join public.roles role on role.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and role.code = case required_role
        when 'tournament_admin' then 'staff'
        when 'super_admin' then 'admin'
        else required_role
      end
  );
$$;

create or replace function public.has_any_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.user_roles user_role
    join public.roles role on role.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and role.code = any (
        select case requested_role
          when 'tournament_admin' then 'staff'
          when 'super_admin' then 'admin'
          else requested_role
        end
        from unnest(required_roles) requested_role
      )
  );
$$;

create or replace function public.get_my_roles()
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
  order by case role.code when 'user' then 1 when 'staff' then 2 else 3 end;
$$;

create or replace function public.set_user_role(
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
  requested_role text;
begin
  if not public.has_role('admin') then
    raise exception 'admin role required' using errcode = 'insufficient_privilege';
  end if;

  requested_role := lower(trim(coalesce(target_role_code, '')));
  if requested_role not in ('user', 'staff', 'admin') then
    raise exception 'unknown role code' using errcode = 'invalid_parameter_value';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'target user profile not found' using errcode = 'foreign_key_violation';
  end if;
  if requested_role = 'user' and not should_assign then
    raise exception 'the base user role cannot be removed' using errcode = 'invalid_parameter_value';
  end if;
  if requested_role = 'staff' and not should_assign and exists (
    select 1 from public.user_roles assignment
    join public.roles role on role.id = assignment.role_id
    where assignment.user_id = target_user_id and role.code = 'admin'
  ) then
    raise exception 'admin accounts must remain staff' using errcode = 'invalid_parameter_value';
  end if;

  if should_assign then
    insert into public.user_roles (user_id, role_id, created_by)
    select target_user_id, role.id, auth.uid()
    from public.roles role
    where role.code = 'user'
       or (requested_role in ('staff', 'admin') and role.code = 'staff')
       or (requested_role = 'admin' and role.code = 'admin')
    on conflict (user_id, role_id) do nothing;
  else
    delete from public.user_roles assignment
    using public.roles role
    where assignment.user_id = target_user_id
      and assignment.role_id = role.id
      and role.code = requested_role;
  end if;

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id, after_data, metadata
  ) values (
    auth.uid(),
    case when should_assign then 'role.assigned' else 'role.removed' end,
    'user_role',
    target_user_id,
    jsonb_build_object('role', requested_role, 'assigned', should_assign),
    jsonb_build_object('source', 'set_user_role')
  );
end;
$$;

revoke all on function public.ensure_base_user_role() from public, anon, authenticated;
revoke all on function public.enforce_role_hierarchy() from public, anon, authenticated;
revoke all on function public.set_user_role(uuid, text, boolean) from public, anon;
grant execute on function public.set_user_role(uuid, text, boolean) to authenticated;

-- Feedback gains the explicit incident/problem category requested by product.
alter table public.user_feedback drop constraint if exists user_feedback_kind_check;
alter table public.user_feedback
  add constraint user_feedback_kind_check
  check (kind in ('message', 'suggestion', 'review', 'problem'));
