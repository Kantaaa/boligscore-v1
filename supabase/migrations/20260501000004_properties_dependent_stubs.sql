-- properties capability — stub tables for downstream capabilities.
--
-- Why this migration exists in the `properties` capability:
--   The list-view function `get_property_list()` (next migration) needs
--   to reference `property_scores`, `property_felles_scores`,
--   `household_weights`, `user_weights`, `criteria`, and
--   `criterion_sections` to compute `felles_total`, `your_total`,
--   `partner_total`, and `your_score_count` (D3, design.md).
--
--   These tables are formally owned by the `weights`, `scoring`, and
--   `comparison` capabilities (see those capabilities' design.md). We
--   define them here as **empty placeholders** so the list function
--   can compile and return defensible NULLs. Each downstream capability
--   will:
--     - extend these tables (add triggers, seed data, additional
--       indexes), and
--     - replace these RLS policies with capability-specific ones.
--
--   Concretely:
--     * `weights` will:
--         - seed 22 `criteria` rows + 3 `criterion_sections`,
--         - add the AFTER INSERT triggers on households / household_members
--           that seed `household_weights` / `user_weights`,
--         - tighten the RLS to its capability spec.
--     * `scoring` will:
--         - extend `property_scores` with the history trigger,
--         - tighten RLS for SELECT/INSERT/UPDATE.
--     * `comparison` will:
--         - tighten `property_felles_scores` RLS, add `updated_at` triggers.
--
--   Documentation: openspec/changes/{weights,scoring,comparison}/
--
--   The placeholder RLS denies all writes by default (deny by absence of
--   permissive INSERT/UPDATE/DELETE policies). SELECT is permissive for
--   members so the list function can compute aggregates.

create extension if not exists "pgcrypto";

-- criterion_sections (owned by `weights`) -------------------------------------

create table if not exists public.criterion_sections (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    label text not null,
    description text,
    sort_order int not null default 0
);

comment on table public.criterion_sections is
    'STUB: defined in `properties` capability so dependent SQL compiles. The `weights` capability extends this with seed data and tightened RLS.';

-- criteria (owned by `weights`) -----------------------------------------------

create table if not exists public.criteria (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    section_id uuid not null references public.criterion_sections(id),
    label text not null,
    description text,
    sort_order int not null default 0
);

create index if not exists criteria_section_id_idx on public.criteria (section_id);

comment on table public.criteria is
    'STUB: defined in `properties` capability. The `weights` capability seeds the canonical 22 criteria.';

-- household_weights (owned by `weights`) --------------------------------------

create table if not exists public.household_weights (
    household_id uuid not null references public.households(id) on delete cascade,
    criterion_id uuid not null references public.criteria(id) on delete restrict,
    weight int not null default 5 check (weight between 0 and 10),
    updated_at timestamptz not null default now(),
    updated_by uuid references auth.users(id),
    primary key (household_id, criterion_id)
);

create index if not exists household_weights_household_id_idx
    on public.household_weights (household_id);

comment on table public.household_weights is
    'STUB: defined in `properties` capability. The `weights` capability adds seeding triggers and tighter RLS.';

-- user_weights (owned by `weights`) -------------------------------------------

create table if not exists public.user_weights (
    household_id uuid not null references public.households(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    criterion_id uuid not null references public.criteria(id) on delete restrict,
    weight int not null default 5 check (weight between 0 and 10),
    updated_at timestamptz not null default now(),
    primary key (household_id, user_id, criterion_id)
);

create index if not exists user_weights_household_user_idx
    on public.user_weights (household_id, user_id);

comment on table public.user_weights is
    'STUB: defined in `properties` capability. The `weights` capability adds seeding triggers and tighter RLS.';

-- property_scores (owned by `scoring`) ----------------------------------------

create table if not exists public.property_scores (
    property_id uuid not null references public.properties(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    criterion_id uuid not null references public.criteria(id) on delete restrict,
    score int not null check (score between 0 and 10),
    updated_at timestamptz not null default now(),
    primary key (property_id, user_id, criterion_id)
);

create index if not exists property_scores_property_user_idx
    on public.property_scores (property_id, user_id);

comment on table public.property_scores is
    'STUB: defined in `properties` capability. The `scoring` capability adds the history trigger and tightens RLS.';

-- property_felles_scores (owned by `comparison`) ------------------------------

create table if not exists public.property_felles_scores (
    property_id uuid not null references public.properties(id) on delete cascade,
    criterion_id uuid not null references public.criteria(id) on delete restrict,
    score int not null check (score between 0 and 10),
    updated_by uuid references auth.users(id),
    updated_at timestamptz not null default now(),
    primary key (property_id, criterion_id)
);

create index if not exists property_felles_scores_property_idx
    on public.property_felles_scores (property_id);

comment on table public.property_felles_scores is
    'STUB: defined in `properties` capability. The `comparison` capability tightens RLS and adds editing triggers.';

-- RLS for stubs ---------------------------------------------------------------
--
-- Permissive SELECT only. INSERT/UPDATE/DELETE are denied by absence of
-- policies (RLS-default deny). Downstream capabilities will replace
-- these with their own write policies.

alter table public.criterion_sections enable row level security;
alter table public.criteria enable row level security;
alter table public.household_weights enable row level security;
alter table public.user_weights enable row level security;
alter table public.property_scores enable row level security;
alter table public.property_felles_scores enable row level security;

-- criterion_sections SELECT: any authenticated user (read-only seed data).
drop policy if exists criterion_sections_select on public.criterion_sections;
create policy criterion_sections_select on public.criterion_sections
    for select
    using (auth.uid() is not null);

-- criteria SELECT: any authenticated user (read-only seed data).
drop policy if exists criteria_select on public.criteria;
create policy criteria_select on public.criteria
    for select
    using (auth.uid() is not null);

-- household_weights SELECT: members of the household.
drop policy if exists household_weights_select on public.household_weights;
create policy household_weights_select on public.household_weights
    for select
    using (
        exists (
            select 1 from public.household_members hm
            where hm.household_id = household_weights.household_id
              and hm.user_id = auth.uid()
        )
    );

-- user_weights SELECT: own rows only.
drop policy if exists user_weights_select on public.user_weights;
create policy user_weights_select on public.user_weights
    for select
    using (
        user_id = auth.uid()
        and exists (
            select 1 from public.household_members hm
            where hm.household_id = user_weights.household_id
              and hm.user_id = auth.uid()
        )
    );

-- property_scores SELECT: members of the property's household.
drop policy if exists property_scores_select on public.property_scores;
create policy property_scores_select on public.property_scores
    for select
    using (
        exists (
            select 1 from public.properties p
            join public.household_members hm
              on hm.household_id = p.household_id
            where p.id = property_scores.property_id
              and hm.user_id = auth.uid()
        )
    );

-- property_felles_scores SELECT: members of the property's household.
drop policy if exists property_felles_scores_select on public.property_felles_scores;
create policy property_felles_scores_select on public.property_felles_scores
    for select
    using (
        exists (
            select 1 from public.properties p
            join public.household_members hm
              on hm.household_id = p.household_id
            where p.id = property_felles_scores.property_id
              and hm.user_id = auth.uid()
        )
    );
