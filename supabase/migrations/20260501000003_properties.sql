-- properties capability — schema (statuses + properties)
--
-- Tables:
--   property_statuses        — extensible status lookup (D1)
--                              global rows have household_id IS NULL.
--                              custom per-household statuses are
--                              additionally allowed; UI shows union.
--   properties               — the household-scoped property entity.
--
-- Conventions:
--   - English identifiers, snake_case columns, comments in English.
--   - Idempotent where possible (CREATE TABLE IF NOT EXISTS, etc.).
--   - household_id foreign keys ON DELETE CASCADE (mirrors households D11).
--   - status_id ON DELETE RESTRICT to surface "you must move properties
--     before deleting this status" (D9 / requirement-locked behaviour).

-- Required extensions ---------------------------------------------------------

create extension if not exists "pgcrypto";

-- property_statuses -----------------------------------------------------------

create table if not exists public.property_statuses (
    id uuid primary key default gen_random_uuid(),
    -- NULL = global / built-in status (D1).
    -- non-null = household-specific status.
    household_id uuid references public.households(id) on delete cascade,
    label text not null check (length(trim(label)) > 0),
    color text not null,
    icon text not null,
    is_terminal boolean not null default false,
    sort_order int not null default 0,
    created_at timestamptz not null default now()
);

-- Unique label per household (or globally for household_id IS NULL).
-- Postgres treats NULL as distinct in UNIQUE constraints, so we use a
-- partial unique index for the global (NULL) case and a separate one
-- for the per-household scope.
create unique index if not exists property_statuses_global_label_idx
    on public.property_statuses (label)
    where household_id is null;

create unique index if not exists property_statuses_household_label_idx
    on public.property_statuses (household_id, label)
    where household_id is not null;

comment on table public.property_statuses is
    'Extensible status lookup for properties. Global rows (household_id IS NULL) are seeded; households may add custom rows. Global rows are immutable via RLS.';
comment on column public.property_statuses.household_id is
    'NULL = global / built-in. Otherwise scoped to a household.';
comment on column public.property_statuses.is_terminal is
    'True for end-of-pipeline statuses (kjopt, ikke aktuell). UI may visually de-emphasise.';

-- Seed 7 global default statuses (D1, requirement: Status workflow).
-- Idempotent via ON CONFLICT DO NOTHING anchored on the partial unique
-- index of (label) where household_id IS NULL.
insert into public.property_statuses
    (household_id, label, color, icon, is_terminal, sort_order)
values
    (null, 'favoritt',     'status-favoritt',      '★', false, 10),
    (null, 'vurderer',     'status-vurderer',      '◔', false, 20),
    (null, 'på visning',   'status-paa-visning',   '👁', false, 30),
    (null, 'i budrunde',   'status-i-budrunde',    '⚖', false, 40),
    (null, 'bud inne',     'status-bud-inne',      '✋', false, 50),
    (null, 'kjøpt',        'status-kjopt',         '✓', true,  60),
    (null, 'ikke aktuell', 'status-ikke-aktuell',  '✗', true,  70)
on conflict do nothing;

-- properties ------------------------------------------------------------------

create table if not exists public.properties (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    address text not null check (length(trim(address)) > 0),
    finn_link text,
    price bigint check (price is null or price >= 0),
    costs bigint check (costs is null or costs >= 0),
    monthly_costs bigint check (monthly_costs is null or monthly_costs >= 0),
    bra numeric check (bra is null or bra >= 0),
    primary_rooms int check (primary_rooms is null or primary_rooms >= 0),
    bedrooms int check (bedrooms is null or bedrooms >= 0),
    bathrooms numeric check (bathrooms is null or bathrooms >= 0),
    -- Year-built range, dynamic via extract(year from now()).
    year_built int check (
        year_built is null
        or year_built between 1800 and (extract(year from now())::int + 5)
    ),
    property_type text,
    floor text,
    status_id uuid not null references public.property_statuses(id) on delete restrict,
    added_by uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.properties is
    'Household-scoped property records. status_id references property_statuses (extensible lookup).';
comment on column public.properties.household_id is
    'Owning household. Immutable after insert (enforced by trigger).';
comment on column public.properties.added_by is
    'User who created the row. Immutable after insert (enforced by trigger).';
comment on column public.properties.created_at is
    'Creation timestamp. Immutable after insert (enforced by trigger).';
comment on column public.properties.year_built is
    'CHECK uses extract(year FROM now()) so the upper bound moves forward over time without migration.';

-- Immutability of properties.{household_id, added_by, created_at} ------------

create or replace function public.properties_prevent_immutable_update()
returns trigger
language plpgsql
as $$
begin
    if new.household_id is distinct from old.household_id then
        raise exception 'properties.household_id is immutable';
    end if;
    if new.added_by is distinct from old.added_by then
        raise exception 'properties.added_by is immutable';
    end if;
    if new.created_at is distinct from old.created_at then
        raise exception 'properties.created_at is immutable';
    end if;
    return new;
end;
$$;

drop trigger if exists properties_prevent_immutable_update on public.properties;
create trigger properties_prevent_immutable_update
    before update on public.properties
    for each row execute function public.properties_prevent_immutable_update();

-- updated_at maintenance ------------------------------------------------------

create or replace function public.properties_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
    before update on public.properties
    for each row execute function public.properties_set_updated_at();

-- Indexes ---------------------------------------------------------------------

create index if not exists properties_household_status_idx
    on public.properties (household_id, status_id);

create index if not exists properties_household_created_at_idx
    on public.properties (household_id, created_at desc);

create index if not exists properties_status_id_idx
    on public.properties (status_id);

-- Enable RLS ------------------------------------------------------------------

alter table public.property_statuses enable row level security;
alter table public.properties enable row level security;

-- property_statuses policies (D1, tasks 2.4-2.6) ------------------------------

-- SELECT: global rows are visible to anyone authenticated, custom rows
-- only to members of the owning household.
drop policy if exists property_statuses_select on public.property_statuses;
create policy property_statuses_select on public.property_statuses
    for select
    using (
        household_id is null
        or exists (
            select 1 from public.household_members hm
            where hm.household_id = property_statuses.household_id
              and hm.user_id = auth.uid()
        )
    );

-- INSERT: only household-scoped rows; only owner/member of that household.
drop policy if exists property_statuses_insert on public.property_statuses;
create policy property_statuses_insert on public.property_statuses
    for insert
    with check (
        household_id is not null
        and public.has_household_role(household_id, array['owner', 'member'])
    );

-- UPDATE: only household-scoped rows; only owner/member of that household.
drop policy if exists property_statuses_update on public.property_statuses;
create policy property_statuses_update on public.property_statuses
    for update
    using (
        household_id is not null
        and public.has_household_role(household_id, array['owner', 'member'])
    )
    with check (
        household_id is not null
        and public.has_household_role(household_id, array['owner', 'member'])
    );

-- DELETE: only household-scoped rows; only owner/member.
-- ON DELETE RESTRICT on properties.status_id ensures statuses with
-- referencing properties cannot be deleted (D9 / spec scenario).
drop policy if exists property_statuses_delete on public.property_statuses;
create policy property_statuses_delete on public.property_statuses
    for delete
    using (
        household_id is not null
        and public.has_household_role(household_id, array['owner', 'member'])
    );

-- properties policies (tasks 2.2-2.3) -----------------------------------------

drop policy if exists properties_select on public.properties;
create policy properties_select on public.properties
    for select
    using (
        exists (
            select 1 from public.household_members hm
            where hm.household_id = properties.household_id
              and hm.user_id = auth.uid()
        )
    );

-- INSERT: owner/member of the household; added_by must be the caller.
drop policy if exists properties_insert on public.properties;
create policy properties_insert on public.properties
    for insert
    with check (
        public.has_household_role(household_id, array['owner', 'member'])
        and added_by = auth.uid()
    );

drop policy if exists properties_update on public.properties;
create policy properties_update on public.properties
    for update
    using (public.has_household_role(household_id, array['owner', 'member']))
    with check (public.has_household_role(household_id, array['owner', 'member']));

drop policy if exists properties_delete on public.properties;
create policy properties_delete on public.properties
    for delete
    using (public.has_household_role(household_id, array['owner', 'member']));
