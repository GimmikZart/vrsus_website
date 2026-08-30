-- Public capacity projection follows the explicit visibility contract:
-- hidden exposes no capacity signal, status exposes only a derived label, and
-- exact exposes the confirmed/max pair. The raw events table remains private.

create or replace function public.get_public_capacity_threshold()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when jsonb_typeof(setting.value) = 'number' then
          greatest(least((setting.value #>> '{}')::numeric, 1), 0)
        else null
      end
      from public.site_settings setting
      where setting.key = 'booking.almost-full-threshold'
      limit 1
    ),
    0.8::numeric
  );
$$;

revoke all on function public.get_public_capacity_threshold() from public;
grant execute on function public.get_public_capacity_threshold() to anon, authenticated;

create or replace view public.public_events
with (security_invoker = false)
as
select
  event.id,
  event.slug,
  event.title,
  event.short_description,
  event.description,
  event.status,
  event.starts_at,
  event.ends_at,
  event.booking_opens_at,
  event.booking_closes_at,
  event.booking_enabled,
  event.venue_name,
  event.venue_address,
  event.venue_notes,
  event.price_cents,
  event.payment_required,
  event.waitlist_enabled,
  event.cover_image_path,
  event.seo_title,
  event.seo_description,
  event.seo_image_path,
  case
    when event.capacity_visibility = 'hidden' then null
    when event.max_capacity is null then 'available'
    when capacity.confirmed_count >= event.max_capacity then 'full'
    when capacity.confirmed_count >= ceil(
      event.max_capacity * public.get_public_capacity_threshold()
    ) then 'almost_full'
    else 'available'
  end as public_capacity_status,
  case
    when event.capacity_visibility = 'exact' then capacity.confirmed_count
    else null
  end::integer as public_confirmed_count,
  case
    when event.capacity_visibility = 'exact' then event.max_capacity
    else null
  end as public_max_capacity
from public.events event
left join lateral (
  select count(*)::integer as confirmed_count
  from public.bookings booking
  where booking.event_id = event.id
    and booking.status = 'confirmed'
) capacity on true
where event.is_public = true
  and event.status in ('scheduled', 'running', 'completed')
  and event.archived_at is null;

grant select on public.public_events to anon, authenticated;

comment on view public.public_events is
  'Public event projection. Capacity is hidden by default, reduced to a status label in status mode, and exposed as confirmed/max only in exact mode.';

comment on function public.get_public_capacity_threshold() is
  'Returns the bounded public almost-full threshold from site_settings, defaulting to 80 percent.';
