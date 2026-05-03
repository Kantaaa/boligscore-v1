-- Local-development / e2e seed data.
--
-- Convention: two test users (alice@test.local, bob@test.local) sharing
-- one household ("Alice & Bob") with role owner / member respectively.
--
-- The auth.users inserts mimic what `supabase auth signUp` would produce.
-- This file is intended for `supabase db reset` against a local instance,
-- NOT for production. The IDs are deterministic so e2e tests can refer
-- to them without extra lookups.

-- Test users ------------------------------------------------------------------

-- The encrypted_password value below is bcrypt('test1234') — copy it from
-- a real `auth.users` row or generate via `crypt('test1234', gen_salt('bf'))`
-- when seeding. Some local Supabase versions reject this insert if the
-- auth schema enforces additional constraints; in that case, use the
-- Supabase auth admin API or `supabase auth signUp` instead.

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
values
    (
        '00000000-0000-0000-0000-0000000a11ce',
        'alice@test.local',
        crypt('test1234', gen_salt('bf')),
        now(), now(), now(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated'
    ),
    (
        '00000000-0000-0000-0000-0000000b0b00',
        'bob@test.local',
        crypt('test1234', gen_salt('bf')),
        now(), now(), now(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated'
    )
on conflict (id) do nothing;

-- Shared household ------------------------------------------------------------

insert into public.households (id, name, created_by)
values
    (
        '00000000-0000-0000-0000-0000000000A1',
        'Alice & Bob',
        '00000000-0000-0000-0000-0000000a11ce'
    )
on conflict (id) do nothing;

insert into public.household_members (household_id, user_id, role)
values
    (
        '00000000-0000-0000-0000-0000000000A1',
        '00000000-0000-0000-0000-0000000a11ce',
        'owner'
    ),
    (
        '00000000-0000-0000-0000-0000000000A1',
        '00000000-0000-0000-0000-0000000b0b00',
        'member'
    )
on conflict (household_id, user_id) do nothing;

-- Demo properties (per openspec/conventions.md test-data convention) ----------

-- Three properties at varied statuses so /app and the property cards
-- have something to render in dev / e2e. Status ids are looked up by
-- label so the seed survives changes to the seeded uuid generation.

insert into public.properties (
    id, household_id, address, finn_link, price, costs, monthly_costs,
    bra, primary_rooms, bedrooms, bathrooms, year_built,
    property_type, floor, status_id, added_by
)
select
    '00000000-0000-0000-0000-0000000000B1',
    '00000000-0000-0000-0000-0000000000A1',
    'Storgata 1, 0182 Oslo',
    null,
    5200000, 65000, 4200,
    72, 3, 2, 1, 2010,
    'Leilighet', '4. etasje',
    s.id,
    '00000000-0000-0000-0000-0000000a11ce'
from public.property_statuses s
where s.household_id is null and s.label = 'vurderer'
on conflict (id) do nothing;

insert into public.properties (
    id, household_id, address, finn_link, price, costs, monthly_costs,
    bra, primary_rooms, bedrooms, bathrooms, year_built,
    property_type, floor, status_id, added_by
)
select
    '00000000-0000-0000-0000-0000000000B2',
    '00000000-0000-0000-0000-0000000000A1',
    'Bjørnstjerne Bjørnsons gate 12, 0354 Oslo',
    null,
    7800000, 95000, 5500,
    98, 4, 3, 2, 1985,
    'Rekkehus', '1. etasje',
    s.id,
    '00000000-0000-0000-0000-0000000b0b00'
from public.property_statuses s
where s.household_id is null and s.label = 'på visning'
on conflict (id) do nothing;

insert into public.properties (
    id, household_id, address, finn_link, price, costs, monthly_costs,
    bra, primary_rooms, bedrooms, bathrooms, year_built,
    property_type, floor, status_id, added_by
)
select
    '00000000-0000-0000-0000-0000000000B3',
    '00000000-0000-0000-0000-0000000000A1',
    'Trondheimsveien 100, 0565 Oslo',
    null,
    4100000, 48000, 3100,
    55, 2, 1, 1, 2002,
    'Leilighet', '2. etasje',
    s.id,
    '00000000-0000-0000-0000-0000000a11ce'
from public.property_statuses s
where s.household_id is null and s.label = 'favoritt'
on conflict (id) do nothing;
