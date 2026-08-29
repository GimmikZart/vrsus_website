insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vrsus-assets',
  'vrsus-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy admin_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vrsus-assets'
    and public.has_any_role(array['admin', 'super_admin'])
  );

create policy admin_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vrsus-assets'
    and public.has_any_role(array['admin', 'super_admin'])
  )
  with check (
    bucket_id = 'vrsus-assets'
    and public.has_any_role(array['admin', 'super_admin'])
  );

create policy admin_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vrsus-assets'
    and public.has_any_role(array['admin', 'super_admin'])
  );

comment on table storage.buckets is
  'VRSUS CMS assets use the public vrsus-assets bucket; object mutations require an admin role.';
