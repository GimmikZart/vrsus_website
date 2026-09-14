-- Tessera ARCI: chi e socio, quali giornate la richiedono.
--
-- Il circolo e affiliato ARCI: per le serate aperte al pubblico il cliente
-- deve essere socio, per compleanni e giornate private di solito no. Servono
-- quindi due cose distinte: lo stato del socio, che vive sul profilo, e il
-- requisito della giornata, che vive sull'evento.
--
-- La tessera non si spunta una volta per sempre: scade ogni anno associativo.
-- Invece di un lavoro schedulato che azzera le righe a una certa data, la
-- validita si deriva da una stagione. Una tessera vale se e stata verificata
-- dopo l'inizio della stagione corrente; la stagione comincia all'ultima
-- ricorrenza della data di rinnovo (1 ottobre di default) oppure a un
-- azzeramento manuale piu recente. Cosi il rinnovo annuale avviene da solo, il
-- pulsante di azzeramento e immediato e lo storico delle verifiche resta.

-- ---------------------------------------------------------------------------
-- 1. Colonne
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column arci_card_verified_at timestamptz,
  add column arci_card_verified_by uuid references public.profiles(id) on delete set null;

create index profiles_arci_card_idx
  on public.profiles (arci_card_verified_at desc nulls last);

comment on column public.profiles.arci_card_verified_at is
  'Momento in cui lo staff ha visto la tessera ARCI. La validita si valuta contro arci_season_start().';
comment on column public.profiles.arci_card_verified_by is
  'Operatore che ha registrato la tessera.';

alter table public.events
  add column arci_required boolean not null default true;

comment on column public.events.arci_required is
  'Tessera ARCI obbligatoria per partecipare. Default true: si toglie per compleanni e giornate private.';

-- ---------------------------------------------------------------------------
-- 2. Stagione associativa
-- ---------------------------------------------------------------------------

insert into public.site_settings (key, value)
values (
  'arci.membership',
  jsonb_build_object('renewal_month', 10, 'renewal_day', 1, 'reset_at', null)
)
on conflict (key) do nothing;

create function public.arci_membership_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  -- site_settings e leggibile solo da admin: la lettura passa da qui, cosi
  -- anche l utente comune puo sapere se la sua tessera e ancora valida.
  select coalesce(
    (select value from public.site_settings where key = 'arci.membership'),
    '{}'::jsonb
  );
$$;

create function public.arci_season_start()
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings jsonb := public.arci_membership_settings();
  v_month integer := coalesce((v_settings ->> 'renewal_month')::integer, 10);
  v_day integer := coalesce((v_settings ->> 'renewal_day')::integer, 1);
  v_reset timestamptz := nullif(v_settings ->> 'reset_at', '')::timestamptz;
  v_today date := (timezone('utc', now()))::date;
  v_year integer := extract(year from v_today)::integer;
  v_last_day integer;
  v_renewal date;
begin
  if v_month < 1 or v_month > 12 then v_month := 10; end if;
  if v_day < 1 then v_day := 1; end if;

  -- Una data di rinnovo al 31 di un mese corto si appoggia all ultimo giorno
  -- disponibile invece di far fallire make_date.
  v_last_day := extract(
    day from (date_trunc('month', make_date(v_year, v_month, 1)) + interval '1 month - 1 day')
  )::integer;
  v_renewal := make_date(v_year, v_month, least(v_day, v_last_day));

  if v_renewal > v_today then
    v_last_day := extract(
      day from (date_trunc('month', make_date(v_year - 1, v_month, 1)) + interval '1 month - 1 day')
    )::integer;
    v_renewal := make_date(v_year - 1, v_month, least(v_day, v_last_day));
  end if;

  return greatest(
    (v_renewal::timestamp at time zone 'utc'),
    coalesce(v_reset, '-infinity'::timestamptz)
  );
end;
$$;

comment on function public.arci_season_start() is
  'Inizio della stagione associativa corrente: ultima data di rinnovo oppure azzeramento manuale piu recente.';

create function public.arci_card_is_valid(p_verified_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_verified_at is not null and p_verified_at >= public.arci_season_start();
$$;

grant execute on function public.arci_membership_settings() to authenticated;
grant execute on function public.arci_season_start() to anon, authenticated;
grant execute on function public.arci_card_is_valid(timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Nessuno si tessera da solo
-- ---------------------------------------------------------------------------

-- profiles_update_own permette a ogni utente di aggiornare la propria riga e
-- non distingue le colonne: senza questa guardia un utente potrebbe scriversi
-- da solo la tessera. La verifica resta un gesto dello staff.
create function public.enforce_arci_card_authority()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if (new.arci_card_verified_at is distinct from old.arci_card_verified_at
      or new.arci_card_verified_by is distinct from old.arci_card_verified_by)
    and auth.uid() is not null
    and not public.has_any_role(array['staff', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'ARCI_UPDATE_FORBIDDEN';
  end if;

  return new;
end;
$$;

create trigger profiles_enforce_arci_card_authority
  before update on public.profiles
  for each row
  execute function public.enforce_arci_card_authority();

-- ---------------------------------------------------------------------------
-- 4. Operazioni dello staff
-- ---------------------------------------------------------------------------

create function public.set_arci_card(p_user_id uuid, p_valid boolean)
returns table (
  user_id uuid,
  arci_card_valid boolean,
  arci_card_verified_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_previous timestamptz;
  v_next timestamptz;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if not public.has_any_role(array['staff', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  select profile.arci_card_verified_at into v_previous
  from public.profiles profile
  where profile.id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'PROFILE_NOT_FOUND';
  end if;

  v_next := case when coalesce(p_valid, false) then now() else null end;

  update public.profiles
  set arci_card_verified_at = v_next,
      arci_card_verified_by = case when v_next is null then null else auth.uid() end
  where id = p_user_id;

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(),
    case when v_next is null then 'arci_card_cleared' else 'arci_card_verified' end,
    'profile',
    p_user_id,
    jsonb_build_object('arci_card_verified_at', v_previous),
    jsonb_build_object('arci_card_verified_at', v_next));

  return query select p_user_id, public.arci_card_is_valid(v_next), v_next;
end;
$$;

create function public.reset_arci_cards()
returns timestamptz
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  -- clock_timestamp e non now(): l azzeramento deve superare anche le tessere
  -- registrate nella stessa transazione, altrimenti resterebbero valide.
  v_now timestamptz := clock_timestamp();
  v_affected integer;
begin
  if not public.has_any_role(array['admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  -- Azzeramento morbido: si sposta l inizio della stagione a adesso. Le
  -- tessere gia verificate restano a registro ma non valgono piu, e nessuno
  -- perde la traccia di chi era socio la stagione prima.
  select count(*)::integer into v_affected
  from public.profiles
  where public.arci_card_is_valid(arci_card_verified_at);

  insert into public.site_settings (key, value, updated_by)
  values (
    'arci.membership',
    public.arci_membership_settings() || jsonb_build_object('reset_at', v_now),
    auth.uid())
  on conflict (key) do update
  set value = excluded.value,
      updated_at = timezone('utc', now()),
      updated_by = excluded.updated_by;

  insert into public.audit_logs (
    actor_user_id, action, entity_type, entity_id, after_data)
  values (
    auth.uid(),
    'arci_cards_reset',
    'site_setting',
    null,
    jsonb_build_object('reset_at', v_now, 'invalidated', v_affected));

  return v_now;
end;
$$;

create function public.set_arci_renewal(p_month integer, p_day integer)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_value jsonb;
begin
  if not public.has_any_role(array['admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;
  if p_month is null or p_month < 1 or p_month > 12
    or p_day is null or p_day < 1 or p_day > 31 then
    raise exception using errcode = '22023', message = 'INVALID_RENEWAL_DATE';
  end if;

  v_value := public.arci_membership_settings()
    || jsonb_build_object('renewal_month', p_month, 'renewal_day', p_day);

  insert into public.site_settings (key, value, updated_by)
  values ('arci.membership', v_value, auth.uid())
  on conflict (key) do update
  set value = excluded.value,
      updated_at = timezone('utc', now()),
      updated_by = excluded.updated_by;

  return v_value;
end;
$$;

create function public.arci_membership_overview()
returns table (
  season_start timestamptz,
  renewal_month integer,
  renewal_day integer,
  reset_at timestamptz,
  valid_count integer,
  member_count integer
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_settings jsonb := public.arci_membership_settings();
begin
  if not public.has_any_role(array['staff', 'admin', 'super_admin']) then
    raise exception using errcode = '42501', message = 'FORBIDDEN';
  end if;

  return query
  select
    public.arci_season_start(),
    coalesce((v_settings ->> 'renewal_month')::integer, 10),
    coalesce((v_settings ->> 'renewal_day')::integer, 1),
    nullif(v_settings ->> 'reset_at', '')::timestamptz,
    count(*) filter (where public.arci_card_is_valid(profile.arci_card_verified_at))::integer,
    count(*)::integer
  from public.profiles profile;
end;
$$;

create function public.my_arci_status()
returns table (
  card_valid boolean,
  verified_at timestamptz,
  season_start timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    public.arci_card_is_valid(profile.arci_card_verified_at),
    case
      when public.arci_card_is_valid(profile.arci_card_verified_at)
      then profile.arci_card_verified_at
      else null
    end,
    public.arci_season_start()
  from public.profiles profile
  where profile.id = auth.uid();
$$;

revoke all on function public.set_arci_card(uuid, boolean) from public, anon, authenticated;
revoke all on function public.reset_arci_cards() from public, anon, authenticated;
revoke all on function public.set_arci_renewal(integer, integer) from public, anon, authenticated;
revoke all on function public.arci_membership_overview() from public, anon, authenticated;
revoke all on function public.my_arci_status() from public, anon;

grant execute on function public.set_arci_card(uuid, boolean) to authenticated;
grant execute on function public.reset_arci_cards() to authenticated;
grant execute on function public.set_arci_renewal(integer, integer) to authenticated;
grant execute on function public.arci_membership_overview() to authenticated;
grant execute on function public.my_arci_status() to authenticated;

comment on function public.set_arci_card(uuid, boolean) is
  'Registra o revoca la tessera ARCI di un utente. Solo staff e admin.';
comment on function public.reset_arci_cards() is
  'Azzera subito tutte le tessere spostando l inizio della stagione associativa.';

-- ---------------------------------------------------------------------------
-- 5. Check-in: la tessera si controlla alla porta
-- ---------------------------------------------------------------------------

-- La firma cambia (due colonne in piu), quindi la funzione va ricreata: chi fa
-- entrare le persone deve vedere subito se la giornata richiede la tessera e
-- se quel socio ce l ha.
drop function if exists public.check_in_booking(text, text);

create function public.check_in_booking(p_qr_token text, p_payment_status text default null)
returns table (
  booking_id uuid,
  event_id uuid,
  user_id uuid,
  event_title text,
  status text,
  payment_status text,
  checked_in_at timestamptz,
  already_checked_in boolean,
  arci_required boolean,
  arci_card_valid boolean
)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  booking_row public.bookings%rowtype;
  event_row public.events%rowtype;
  checkin_time timestamptz;
  v_card_valid boolean;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if not public.has_any_role(array['staff', 'admin', 'super_admin']) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_payment_status is not null
    and p_payment_status not in ('unpaid', 'paid_on_site', 'complimentary', 'not_required') then
    raise exception 'PAYMENT_STATUS_INVALID' using errcode = 'P0001';
  end if;

  select booking.*
  into booking_row
  from public.bookings booking
  where booking.qr_token_hash = encode(extensions.digest(trim(coalesce(p_qr_token, '')), 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'QR_INVALID' using errcode = 'P0001';
  end if;

  if booking_row.status <> 'confirmed' then
    raise exception 'BOOKING_NOT_CONFIRMED' using errcode = 'P0001';
  end if;

  select * into event_row from public.events where id = booking_row.event_id;

  select public.arci_card_is_valid(profile.arci_card_verified_at)
  into v_card_valid
  from public.profiles profile
  where profile.id = booking_row.user_id;

  if booking_row.checked_in_at is not null then
    return query select
      booking_row.id,
      booking_row.event_id,
      booking_row.user_id,
      event_row.title,
      booking_row.status,
      booking_row.payment_status,
      booking_row.checked_in_at,
      true,
      event_row.arci_required,
      coalesce(v_card_valid, false);
    return;
  end if;

  checkin_time := now();

  if p_payment_status is not null then
    update public.bookings
    set payment_status = p_payment_status
    where id = booking_row.id;
    booking_row.payment_status := p_payment_status;
  end if;

  update public.bookings
  set checked_in_at = checkin_time
  where id = booking_row.id;

  insert into public.event_checkins (
    event_id,
    booking_id,
    user_id,
    checked_in_at,
    checked_in_by,
    payment_status_at_checkin
  )
  values (
    booking_row.event_id,
    booking_row.id,
    booking_row.user_id,
    checkin_time,
    auth.uid(),
    booking_row.payment_status
  );

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data)
  values (
    auth.uid(),
    'booking_checked_in',
    'booking',
    booking_row.id,
    jsonb_build_object('checked_in_at', null, 'payment_status', booking_row.payment_status),
    jsonb_build_object('checked_in_at', checkin_time, 'payment_status', booking_row.payment_status)
  );

  return query select
    booking_row.id,
    booking_row.event_id,
    booking_row.user_id,
    event_row.title,
    booking_row.status,
    booking_row.payment_status,
    checkin_time,
    false,
    event_row.arci_required,
    coalesce(v_card_valid, false);
end;
$$;

revoke all on function public.check_in_booking(text, text) from public, anon, authenticated;
grant execute on function public.check_in_booking(text, text) to authenticated;

comment on function public.check_in_booking(text, text) is
  'Staff/admin QR check-in. Ripetere la chiamata non duplica il check-in e riporta lo stato della tessera ARCI.';

-- ---------------------------------------------------------------------------
-- 6. Il requisito e pubblico
-- ---------------------------------------------------------------------------

-- Chi prenota deve sapere prima di arrivare se serve la tessera. La colonna si
-- aggiunge in coda perche create or replace non puo riordinare le esistenti.
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
    event.event_type,
    event.arci_required
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

-- ---------------------------------------------------------------------------
-- 7. La copia di un evento porta con se il requisito
-- ---------------------------------------------------------------------------

create or replace function public.duplicate_event(
  p_source_event_id uuid, p_new_slug text, p_new_title text,
  p_new_starts_at timestamptz, p_new_ends_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  source_event public.events%rowtype;
  new_event_id uuid;
begin
  if not public.has_any_role(array['admin', 'super_admin']) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_new_slug is null
    or p_new_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(trim(p_new_slug)) > 180
    or p_new_title is null
    or char_length(trim(p_new_title)) not between 1 and 180
    or p_new_starts_at is null
    or p_new_ends_at is null
    or p_new_ends_at <= p_new_starts_at then
    raise exception 'INVALID_EVENT_DUPLICATE' using errcode = 'P0001';
  end if;

  select * into source_event from public.events where id = p_source_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.events (
    slug, title, short_description, description, status, is_public, event_type,
    starts_at, ends_at, booking_opens_at, booking_closes_at, booking_enabled,
    venue_name, venue_address, venue_notes, price_cents, payment_required,
    max_capacity, capacity_visibility, waitlist_enabled, cover_image_path,
    seo_title, seo_description, arci_required)
  values (
    trim(p_new_slug), trim(p_new_title), source_event.short_description,
    source_event.description, 'draft', false, source_event.event_type,
    p_new_starts_at, p_new_ends_at, null, null, source_event.booking_enabled,
    source_event.venue_name, source_event.venue_address, source_event.venue_notes,
    source_event.price_cents, source_event.payment_required, source_event.max_capacity,
    source_event.capacity_visibility, source_event.waitlist_enabled,
    source_event.cover_image_path, source_event.seo_title, source_event.seo_description,
    source_event.arci_required)
  returning id into new_event_id;

  insert into public.event_platforms (
    event_id, platform_id, public_name, description_override, capacity_override,
    is_public, active, sort_order, metadata)
  select new_event_id, source.platform_id, source.public_name, source.description_override,
    source.capacity_override, source.is_public, source.active, source.sort_order, source.metadata
  from public.event_platforms source
  where source.event_id = p_source_event_id;

  -- Le associazioni gioco/piattaforma vanno ricollegate alle righe appena
  -- create, non a quelle dell'evento di origine.
  insert into public.event_platform_games (event_platform_id, game_id, sort_order, active)
  select target.id, link.game_id, link.sort_order, link.active
  from public.event_platform_games link
  join public.event_platforms source on source.id = link.event_platform_id
  join public.event_platforms target
    on target.event_id = new_event_id and target.platform_id = source.platform_id
  where source.event_id = p_source_event_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, after_data)
  values (auth.uid(), 'event_duplicated', 'event', new_event_id,
    jsonb_build_object('source_event_id', p_source_event_id, 'slug', trim(p_new_slug)));

  return new_event_id;
end;
$$;

grant execute on function public.duplicate_event(uuid, text, text, timestamptz, timestamptz) to authenticated;
