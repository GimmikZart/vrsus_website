-- Each authenticated user receives only their own notification changes.
-- Keep notification content server-owned: the client may change read_at only.
alter publication supabase_realtime add table public.notifications;

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
