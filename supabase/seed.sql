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
        '00000000-0000-0000-0000-00000000a11ce',
        'alice@test.local',
        crypt('test1234', gen_salt('bf')),
        now(), now(), now(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated'
    ),
    (
        '00000000-0000-0000-0000-00000000b0b00',
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
        '00000000-0000-0000-0000-00000000a11ce'
    )
on conflict (id) do nothing;

insert into public.household_members (household_id, user_id, role)
values
    (
        '00000000-0000-0000-0000-0000000000A1',
        '00000000-0000-0000-0000-00000000a11ce',
        'owner'
    ),
    (
        '00000000-0000-0000-0000-0000000000A1',
        '00000000-0000-0000-0000-00000000b0b00',
        'member'
    )
on conflict (household_id, user_id) do nothing;
