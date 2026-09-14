-- La locandina della home mostra il tipo di evento: va proiettato nella view
-- pubblica. La colonna si aggiunge in coda perche create or replace non puo
-- riordinare le colonne esistenti.
--
-- `event_type` non e un dato riservato: dice se la giornata e un compleanno,
-- un all you can play, un team building o una giornata privata. La capienza
-- resta esclusa dalla proiezione come prima.

create or replace view public.public_events as
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
      when event.capacity_visibility = 'hidden' then null::text
      when event.max_capacity is null then 'available'
      when capacity.confirmed_count >= event.max_capacity then 'full'
      when capacity.confirmed_count::numeric
        >= ceil(event.max_capacity::numeric * public.get_public_capacity_threshold())
        then 'almost_full'
      else 'available'
    end as public_capacity_status,
    case
      when event.capacity_visibility = 'exact' then capacity.confirmed_count
      else null::integer
    end as public_confirmed_count,
    case
      when event.capacity_visibility = 'exact' then event.max_capacity
      else null::integer
    end as public_max_capacity,
    event.event_type
  from public.events event
  left join lateral (
    select count(*)::integer as confirmed_count
    from public.bookings booking
    where booking.event_id = event.id and booking.status = 'confirmed'
  ) capacity on true
  where event.is_public = true
    and event.status = any (array['scheduled', 'running', 'completed'])
    and event.archived_at is null;

grant select on public.public_events to anon, authenticated;
