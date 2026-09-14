-- Fase A, quarta parte: registrazione con nickname e data di nascita,
-- consenso genitoriale per i minorenni (DEC-026) e adeguamento di
-- duplicate_event al dominio piattaforme.

-- ---------------------------------------------------------------------------
-- 1. Il profilo nasce con nickname, data di nascita e anagrafica
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_nickname text;
  v_candidate text;
  v_suffix integer := 0;
begin
  v_candidate := nullif(trim(new.raw_user_meta_data ->> 'nickname'), '');
  if v_candidate is null then
    v_candidate := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  end if;
  if v_candidate is null then
    v_candidate := 'player';
  end if;
  v_candidate := left(regexp_replace(v_candidate, '[^A-Za-z0-9_.-]', '', 'g'), 24);
  if char_length(v_candidate) < 3 then
    v_candidate := 'player' || left(replace(new.id::text, '-', ''), 6);
  end if;

  -- Il nickname e unico: se quello richiesto e gia preso si aggiunge un
  -- suffisso invece di far fallire la registrazione.
  v_nickname := v_candidate;
  while exists (select 1 from public.profiles where lower(nickname) = lower(v_nickname)) loop
    v_suffix := v_suffix + 1;
    v_nickname := left(v_candidate, 20) || v_suffix::text;
  end loop;

  insert into public.profiles (id, display_name, nickname, first_name, last_name, birth_date)
  values (
    new.id,
    v_nickname,
    v_nickname,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    case
      when nullif(trim(new.raw_user_meta_data ->> 'birth_date'), '') is null then null
      else (new.raw_user_meta_data ->> 'birth_date')::date
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Consenso genitoriale
-- ---------------------------------------------------------------------------

create function public.my_consent_status()
returns table (is_minor boolean, has_consent boolean)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    public.is_minor(profile.birth_date) as is_minor,
    exists (
      select 1 from public.guardian_consents consent
      where consent.user_id = profile.id and consent.revoked_at is null
    ) as has_consent
  from public.profiles profile
  where profile.id = auth.uid();
$$;

revoke all on function public.my_consent_status() from public, anon;
grant execute on function public.my_consent_status() to authenticated;

create function public.record_guardian_consent(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text default null,
  p_relationship text default 'parent')
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if char_length(trim(coalesce(p_first_name, ''))) < 1
     or char_length(trim(coalesce(p_last_name, ''))) < 1
     or coalesce(p_email, '') !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception using errcode = '22023', message = 'INVALID_GUARDIAN_DATA';
  end if;
  if p_relationship not in ('parent', 'legal_guardian', 'other') then
    raise exception using errcode = '22023', message = 'INVALID_RELATIONSHIP';
  end if;

  insert into public.guardian_consents
    (user_id, guardian_first_name, guardian_last_name, guardian_email, guardian_phone, relationship)
  values (auth.uid(), trim(p_first_name), trim(p_last_name), lower(trim(p_email)),
    nullif(trim(p_phone), ''), p_relationship)
  on conflict (user_id) do update
    set guardian_first_name = excluded.guardian_first_name,
        guardian_last_name = excluded.guardian_last_name,
        guardian_email = excluded.guardian_email,
        guardian_phone = excluded.guardian_phone,
        relationship = excluded.relationship,
        consent_given_at = timezone('utc', now()),
        revoked_at = null
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_guardian_consent(text, text, text, text, text) from public, anon;
grant execute on function public.record_guardian_consent(text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Un minore senza consenso non puo prenotare
-- ---------------------------------------------------------------------------

-- Il controllo vive nel database e non nell'interfaccia: altrimenti basterebbe
-- una chiamata diretta alla RPC per aggirarlo (DEC-026). Il trigger guarda
-- l'utente della prenotazione, non chi la sta creando, cosi vale anche quando
-- e lo staff a iscrivere qualcuno sul posto.
create function public.enforce_guardian_consent()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_birth_date date;
begin
  select birth_date into v_birth_date from public.profiles where id = new.user_id;

  if public.is_minor(v_birth_date)
     and not exists (
       select 1 from public.guardian_consents consent
       where consent.user_id = new.user_id and consent.revoked_at is null
     ) then
    raise exception using errcode = 'P0001', message = 'GUARDIAN_CONSENT_REQUIRED';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_guardian_consent() from public, anon, authenticated;

create trigger bookings_require_guardian_consent
  before insert on public.bookings
  for each row execute function public.enforce_guardian_consent();

create trigger tournament_members_require_guardian_consent
  before insert on public.tournament_entry_members
  for each row execute function public.enforce_guardian_consent();

-- ---------------------------------------------------------------------------
-- 4. duplicate_event adeguato al dominio piattaforme
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
    seo_title, seo_description)
  values (
    trim(p_new_slug), trim(p_new_title), source_event.short_description,
    source_event.description, 'draft', false, source_event.event_type,
    p_new_starts_at, p_new_ends_at, null, null, source_event.booking_enabled,
    source_event.venue_name, source_event.venue_address, source_event.venue_notes,
    source_event.price_cents, source_event.payment_required, source_event.max_capacity,
    source_event.capacity_visibility, source_event.waitlist_enabled,
    source_event.cover_image_path, source_event.seo_title, source_event.seo_description)
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
