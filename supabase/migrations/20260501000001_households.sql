-- households capability — schema
--
-- Tables:
--   households                — top-level household entity
--   household_members         — user ↔ household join table with role
--   household_invitations     — token-based invitation rows (7d expiry)
--
-- Conventions:
--   - English identifiers, snake_case columns, comments in English.
--   - Idempotent where possible (CREATE TABLE IF NOT EXISTS, etc.) so
--     contributors can replay this migration during local setup.
--   - Roles use a TEXT column with a CHECK constraint per design D1.
--   - household_id foreign keys ON DELETE CASCADE per design D11
--     (hard cascade delete with typed-name confirmation in UI).

-- Required extensions ---------------------------------------------------------

create extension if not exists "pgcrypto";

-- households ------------------------------------------------------------------

create table if not exists public.households (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) > 0),
    created_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    -- Threshold used by the comparison capability to flag disagreements.
    -- Stored on the household so partners share the same threshold.
    -- Range 1..10 mirrors the 0..10 scoring scale (delta of 0 is meaningless).
    comparison_disagreement_threshold int not null default 3
        check (comparison_disagreement_threshold between 1 and 10)
);

comment on table public.households is
    'Top-level household entity. Every other capability (properties, scores, weights) is scoped to a household.';
comment on column public.households.created_by is
    'Original creator. Immutable after insert (enforced by trigger).';
comment on column public.households.comparison_disagreement_threshold is
    'Delta in the 0..10 scoring scale at or above which a property criterion is flagged as a disagreement in the comparison view.';

-- household_members -----------------------------------------------------------

create table if not exists public.household_members (
    household_id uuid not null references public.households(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('owner', 'member', 'viewer')),
    joined_at timestamptz not null default now(),
    last_accessed_at timestamptz not null default now(),
    primary key (household_id, user_id)
);

create index if not exists household_members_user_id_idx
    on public.household_members (user_id);

comment on table public.household_members is
    'Join row between a user and a household, with a role. Composite PK prevents duplicate memberships.';
comment on column public.household_members.role is
    'One of owner | member | viewer. CHECK constraint enforces the enum.';

-- household_invitations -------------------------------------------------------

create table if not exists public.household_invitations (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    token uuid not null unique default gen_random_uuid(),
    invited_email text,
    role text not null check (role in ('owner', 'member', 'viewer')) default 'member',
    expires_at timestamptz not null default (now() + interval '7 days'),
    accepted_by uuid references auth.users(id),
    created_by uuid not null references auth.users(id),
    created_at timestamptz not null default now()
);

create index if not exists household_invitations_token_idx
    on public.household_invitations (token);

create index if not exists household_invitations_household_id_idx
    on public.household_invitations (household_id);

comment on table public.household_invitations is
    'Invitation rows used by the /invitasjon/[token] flow. Single-use: accepted_by is set in an atomic UPDATE on accept.';
comment on column public.household_invitations.role is
    'Role granted on acceptance. Defaults to member; inviter may pick owner or viewer (design D10).';
comment on column public.household_invitations.expires_at is
    'Hardcoded 7-day expiry (design D4).';

-- Immutability of households.created_by --------------------------------------

create or replace function public.households_prevent_created_by_update()
returns trigger
language plpgsql
as $$
begin
    if new.created_by is distinct from old.created_by then
        raise exception 'households.created_by is immutable';
    end if;
    return new;
end;
$$;

drop trigger if exists households_prevent_created_by_update on public.households;
create trigger households_prevent_created_by_update
    before update on public.households
    for each row execute function public.households_prevent_created_by_update();
