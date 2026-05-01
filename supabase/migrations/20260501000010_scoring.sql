-- scoring capability — schema, history trigger, RLS, SQL function.
--
-- Tasks (openspec/changes/scoring/tasks.md):
--   1.1 Extend `property_scores` (already STUBBED in
--       20260501000004_properties_dependent_stubs.sql). The columns and
--       PRIMARY KEY are already in place; this migration ensures the
--       `(property_id, user_id)` index exists, adds the history trigger,
--       and replaces the stub RLS with capability-specific policies.
--   1.2 Create `property_score_history`. NEW table — not stubbed.
--   1.3 Create `property_section_notes`. NEW table — not stubbed.
--   1.4 AFTER INSERT OR UPDATE trigger that writes to history when the
--       score actually changed.
--   2.1-2.5 RLS for all three tables.
--   3.6 SQL function `get_property_with_scores(p_property_id, p_viewer_id)`.
--
-- See openspec/changes/scoring/{proposal,design,specs/scoring/spec.md}.

-- property_scores — index already created by stub; ensure idempotency.

create index if not exists property_scores_property_user_idx
    on public.property_scores (property_id, user_id);

-- property_score_history (NEW) -----------------------------------------------
--
-- Captures every score change. No FKs to property_scores: history rows
-- must outlive their source row when scores get deleted (cascades or
-- explicit DELETE via clearScore). FK to properties is omitted for the
-- same reason — if a property is hard-deleted the history rows can hang
-- around for audit; in MVP we accept the cascade-loose-end and let
-- ON DELETE CASCADE on property_id remove them with the property.

create table if not exists public.property_score_history (
    id uuid primary key default gen_random_uuid(),
    property_id uuid not null references public.properties(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    criterion_id uuid not null references public.criteria(id) on delete restrict,
    old_score int check (old_score is null or old_score between 0 and 10),
    new_score int not null check (new_score between 0 and 10),
    changed_at timestamptz not null default now()
);

create index if not exists property_score_history_property_user_idx
    on public.property_score_history (property_id, user_id);

create index if not exists property_score_history_changed_at_idx
    on public.property_score_history (changed_at desc);

comment on table public.property_score_history is
    'Append-only audit log of every change to property_scores. Written by trigger property_scores_history_trg only. SELECT exposed to row owner; INSERT/UPDATE/DELETE never policy-allowed (writes happen as the trigger runs in the table owner''s context).';

-- property_section_notes (NEW) -----------------------------------------------
--
-- One row per (property × user × section). Visibility column is wired
-- in for future "shared" notes — RLS already reads it (D4). MVP UI
-- only ever writes 'private', but the schema is ready.

create table if not exists public.property_section_notes (
    property_id uuid not null references public.properties(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    section_id uuid not null references public.criterion_sections(id) on delete restrict,
    body text not null default '',
    visibility text not null default 'private'
        check (visibility in ('private', 'shared')),
    updated_at timestamptz not null default now(),
    primary key (property_id, user_id, section_id)
);

create index if not exists property_section_notes_property_user_idx
    on public.property_section_notes (property_id, user_id);

comment on table public.property_section_notes is
    'Per-section "huskelapp" textarea contents. One row per (property, user, section). visibility=''private'' (default) means only the author can read; ''shared'' is supported by RLS but unused by MVP UI.';
comment on column public.property_section_notes.visibility is
    'Either ''private'' (default — only the author reads) or ''shared'' (any household member reads). MVP writes only ''private''.';

-- History trigger -------------------------------------------------------------
--
-- AFTER INSERT OR UPDATE on property_scores. The WHEN clause filters
-- out no-op updates (e.g. user taps the same chip twice); we still
-- want the INSERT branch to fire even though OLD is NULL there, hence
-- `OLD IS NULL OR OLD.score IS DISTINCT FROM NEW.score`.

create or replace function public._scoring_score_history_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.property_score_history
        (property_id, user_id, criterion_id, old_score, new_score, changed_at)
    values
        (new.property_id, new.user_id, new.criterion_id,
         case when tg_op = 'INSERT' then null else old.score end,
         new.score,
         now());
    return null; -- AFTER trigger; return value ignored.
end;
$$;

comment on function public._scoring_score_history_fn() is
    'Trigger function for property_scores_history_trg: writes a property_score_history row when a score is inserted or actually changed. SECURITY DEFINER so the policy-denied INSERT/UPDATE/DELETE on property_score_history doesn''t block this trigger.';

drop trigger if exists property_scores_history_trg on public.property_scores;
create trigger property_scores_history_trg
    after insert or update on public.property_scores
    for each row
    when (old is null or old.score is distinct from new.score)
    execute function public._scoring_score_history_fn();

-- RLS — property_scores -------------------------------------------------------
--
-- Replace the stub SELECT (still member-only but explicit) and add
-- INSERT/UPDATE/DELETE: row's user_id must match auth.uid() AND the
-- caller must have owner/member role in the property's household.
-- Viewers and non-members are denied at RLS.

drop policy if exists property_scores_select on public.property_scores;
create policy property_scores_select on public.property_scores
    for select
    using (
        exists (
            select 1
            from public.properties p
            where p.id = property_scores.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member', 'viewer']
              )
        )
    );

drop policy if exists property_scores_insert on public.property_scores;
create policy property_scores_insert on public.property_scores
    for insert
    with check (
        user_id = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_scores.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    );

drop policy if exists property_scores_update on public.property_scores;
create policy property_scores_update on public.property_scores
    for update
    using (
        user_id = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_scores.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    )
    with check (
        user_id = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_scores.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    );

drop policy if exists property_scores_delete on public.property_scores;
create policy property_scores_delete on public.property_scores
    for delete
    using (
        user_id = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_scores.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    );

comment on policy property_scores_select on public.property_scores is
    'Members of the property''s household can read all scores (own + partner) — but the API layer / get_property_with_scores deliberately hides partner scores; raw SELECT is fine because the comparison capability needs the join.';
comment on policy property_scores_insert on public.property_scores is
    'Only the row owner (user_id = auth.uid()) AND only an owner/member of the property''s household can insert. Viewers denied.';

-- RLS — property_score_history -----------------------------------------------
--
-- SELECT: own rows AND member of the property's household. The
-- second clause is defence-in-depth: a user removed from a household
-- shouldn't see their old history rows for that household's
-- properties.
-- INSERT/UPDATE/DELETE: no policies — writes only happen via the
-- SECURITY DEFINER trigger function.

alter table public.property_score_history enable row level security;

drop policy if exists property_score_history_select on public.property_score_history;
create policy property_score_history_select on public.property_score_history
    for select
    using (
        user_id = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_score_history.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member', 'viewer']
              )
        )
    );

comment on policy property_score_history_select on public.property_score_history is
    'A user can only read their own history rows AND only while they''re still a member of the property''s household.';

-- RLS — property_section_notes -----------------------------------------------
--
-- SELECT: member of the property's household AND (visibility = 'shared'
-- OR user_id = auth.uid()). MVP only ever writes 'private', so today
-- this resolves to "your own notes only"; once the UI flips a note to
-- shared, the partner gets visibility automatically.
-- INSERT/UPDATE/DELETE: own rows, owner/member role.

alter table public.property_section_notes enable row level security;

drop policy if exists property_section_notes_select on public.property_section_notes;
create policy property_section_notes_select on public.property_section_notes
    for select
    using (
        exists (
            select 1
            from public.properties p
            where p.id = property_section_notes.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member', 'viewer']
              )
        )
        and (
            visibility = 'shared'
            or user_id = auth.uid()
        )
    );

drop policy if exists property_section_notes_insert on public.property_section_notes;
create policy property_section_notes_insert on public.property_section_notes
    for insert
    with check (
        user_id = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_section_notes.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    );

drop policy if exists property_section_notes_update on public.property_section_notes;
create policy property_section_notes_update on public.property_section_notes
    for update
    using (
        user_id = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_section_notes.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    )
    with check (
        user_id = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_section_notes.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    );

drop policy if exists property_section_notes_delete on public.property_section_notes;
create policy property_section_notes_delete on public.property_section_notes
    for delete
    using (
        user_id = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_section_notes.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    );

-- get_property_with_scores ----------------------------------------------------
--
-- Returns one row with the property fields PLUS aggregated counters.
-- The caller's individual scores are returned via a separate query
-- (getMyScores) — this function returns only counters so it can be a
-- single-row scalar fetch on the Min vurdering tab.
--
-- Important: partner scores are NOT exposed here (D-spec: "Partner score
-- visibility leak prevented"). Only `partner_score_count` is returned.
--
-- SECURITY DEFINER + explicit membership check at the top so a
-- non-member calling the function gets an empty set rather than
-- aggregated data.

create or replace function public.get_property_with_scores(
    p_property_id uuid,
    p_viewer_id uuid
)
returns table (
    id uuid,
    household_id uuid,
    address text,
    finn_link text,
    price bigint,
    costs bigint,
    monthly_costs bigint,
    bra numeric,
    primary_rooms int,
    bedrooms int,
    bathrooms numeric,
    year_built int,
    property_type text,
    floor text,
    status_id uuid,
    added_by uuid,
    created_at timestamptz,
    updated_at timestamptz,
    your_score_count int,
    partner_id uuid,
    partner_score_count int,
    total_criteria int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_household_id uuid;
    v_partner_id uuid;
    v_member_count int;
    v_total_criteria int;
begin
    -- Resolve property + membership check.
    select p.household_id into v_household_id
    from public.properties p
    where p.id = p_property_id;

    if v_household_id is null then
        return; -- property not found
    end if;

    if not exists (
        select 1
        from public.household_members hm
        where hm.household_id = v_household_id
          and hm.user_id = p_viewer_id
    ) then
        return; -- viewer is not a member
    end if;

    -- Resolve unique partner: NULL if 1 or 3+ members.
    select count(*) into v_member_count
    from public.household_members hm
    where hm.household_id = v_household_id;

    if v_member_count = 2 then
        select hm.user_id into v_partner_id
        from public.household_members hm
        where hm.household_id = v_household_id
          and hm.user_id <> p_viewer_id
        limit 1;
    end if;

    -- Total criteria — single source of truth for the counter.
    select count(*)::int into v_total_criteria from public.criteria;

    return query
    select
        p.id,
        p.household_id,
        p.address,
        p.finn_link,
        p.price,
        p.costs,
        p.monthly_costs,
        p.bra,
        p.primary_rooms,
        p.bedrooms,
        p.bathrooms,
        p.year_built,
        p.property_type,
        p.floor,
        p.status_id,
        p.added_by,
        p.created_at,
        p.updated_at,
        coalesce((
            select count(*)::int
            from public.property_scores ps
            where ps.property_id = p.id
              and ps.user_id = p_viewer_id
        ), 0) as your_score_count,
        v_partner_id as partner_id,
        case
            when v_partner_id is null then null
            else coalesce((
                select count(*)::int
                from public.property_scores ps
                where ps.property_id = p.id
                  and ps.user_id = v_partner_id
            ), 0)
        end as partner_score_count,
        v_total_criteria as total_criteria
    from public.properties p
    where p.id = p_property_id;
end;
$$;

comment on function public.get_property_with_scores(uuid, uuid) is
    'Returns the property + aggregate counters for the Min vurdering tab. Includes your_score_count and partner_score_count (NOT individual partner scores — those would leak the partner''s vurdering). SECURITY DEFINER + membership check so non-members get nothing.';

revoke all on function public.get_property_with_scores(uuid, uuid) from public;
grant execute on function public.get_property_with_scores(uuid, uuid) to authenticated;
