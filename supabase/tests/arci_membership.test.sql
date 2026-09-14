begin;

select plan(20);

-- ---------------------------------------------------------------------------
-- Superficie
-- ---------------------------------------------------------------------------

select has_function(
  'public',
  'set_arci_card',
  array['uuid', 'boolean']::text[],
  'set_arci_card RPC exists'
);
select has_function(
  'public',
  'reset_arci_cards',
  'reset_arci_cards RPC exists'
);
select has_function(
  'public',
  'arci_season_start',
  'arci_season_start helper exists'
);
select has_function(
  'public',
  'my_arci_status',
  'my_arci_status RPC exists'
);
select has_column(
  'public',
  'events',
  'arci_required',
  'events carry the ARCI requirement'
);

-- ---------------------------------------------------------------------------
-- Fixture
-- ---------------------------------------------------------------------------

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-0000-0000-0000000000e1', 'authenticated', 'authenticated', 'arci-user@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000e2', 'authenticated', 'authenticated', 'arci-staff@example.test', 'not-a-real-password', timezone('utc', now())),
  ('00000000-0000-0000-0000-0000000000e3', 'authenticated', 'authenticated', 'arci-admin@example.test', 'not-a-real-password', timezone('utc', now()));

insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000e2', id from public.roles where code = 'staff';
insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000e3', id from public.roles where code = 'admin';

insert into public.events (
  slug, title, status, is_public, starts_at, ends_at, booking_enabled, max_capacity
)
values (
  'arci-membership-fixture',
  'ARCI membership fixture',
  'scheduled',
  true,
  timezone('utc', now()) + interval '1 day',
  timezone('utc', now()) + interval '1 day 8 hours',
  true,
  5
);

select is(
  (select arci_required from public.events where slug = 'arci-membership-fixture'),
  true,
  'a new event requires the ARCI card unless someone says otherwise'
);

-- events non ha grant per il browser: l id passa da una tabella temporanea,
-- come nelle altre suite.
create temporary table arci_test_event (id uuid not null);
insert into arci_test_event
select id from public.events where slug = 'arci-membership-fixture';
grant select on arci_test_event to authenticated;

create temporary table arci_test_booking (id uuid not null, token text);
grant select, insert, update on arci_test_booking to authenticated;

-- ---------------------------------------------------------------------------
-- Nessuno si tessera da solo
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);

select throws_ok(
  $$update public.profiles set arci_card_verified_at = now() where id = '00000000-0000-0000-0000-0000000000e1'$$,
  '42501',
  'ARCI_UPDATE_FORBIDDEN',
  'an ordinary user cannot certify their own ARCI card'
);

select throws_ok(
  $$select * from public.set_arci_card('00000000-0000-0000-0000-0000000000e1', true)$$,
  '42501',
  'FORBIDDEN',
  'the staff RPC is closed to ordinary users'
);

select is(
  (select card_valid from public.my_arci_status()),
  false,
  'a profile without a verification is not a member'
);

-- ---------------------------------------------------------------------------
-- La porta: check-in con e senza tessera
-- ---------------------------------------------------------------------------

insert into arci_test_booking (id)
select booking_id
from public.create_event_booking((select id from arci_test_event));

update arci_test_booking
set token = (
  select qr_token
  from public.get_my_booking_qr((select id from arci_test_booking))
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', true);

select is(
  (
    select arci_required
    from public.check_in_booking((select token from arci_test_booking), null)
  ),
  true,
  'check-in reports that the evening requires the card'
);
select is(
  (
    select arci_card_valid
    from public.check_in_booking((select token from arci_test_booking), null)
  ),
  false,
  'check-in reports a missing card'
);

-- ---------------------------------------------------------------------------
-- Lo staff registra la tessera
-- ---------------------------------------------------------------------------

select is(
  (
    select arci_card_valid
    from public.set_arci_card('00000000-0000-0000-0000-0000000000e1', true)
  ),
  true,
  'staff can register a card they have seen'
);

select is(
  (
    select arci_card_valid
    from public.check_in_booking((select token from arci_test_booking), null)
  ),
  true,
  'a repeated check-in sees the card registered a moment earlier'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
select is(
  (select card_valid from public.my_arci_status()),
  true,
  'the member can read their own card as valid'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', true);
select is(
  public.arci_card_is_valid('2000-01-01T00:00:00Z'::timestamptz),
  false,
  'a verification from a past season does not count'
);

-- ---------------------------------------------------------------------------
-- Chiusura della stagione
-- ---------------------------------------------------------------------------

select throws_ok(
  $$select public.reset_arci_cards()$$,
  '42501',
  'FORBIDDEN',
  'staff cannot close the membership season'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e3', true);

select throws_ok(
  $$select public.set_arci_renewal(13, 1)$$,
  '22023',
  'INVALID_RENEWAL_DATE',
  'the renewal date is validated'
);

select ok(
  public.reset_arci_cards() is not null,
  'an admin can close the season on the spot'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
select is(
  (select card_valid from public.my_arci_status()),
  false,
  'after the reset every card has to be shown again'
);

set local role postgres;
-- Solo le righe scritte da questa prova: il database di sviluppo puo avere
-- gia tessere registrate a mano (DEC-030).
select is(
  (
    select count(*)::integer
    from public.audit_logs
    where action in ('arci_card_verified', 'arci_cards_reset')
      and actor_user_id in (
        '00000000-0000-0000-0000-0000000000e2',
        '00000000-0000-0000-0000-0000000000e3'
      )
  ),
  2,
  'registering and resetting cards leaves an audit trail'
);

select * from finish();

rollback;
