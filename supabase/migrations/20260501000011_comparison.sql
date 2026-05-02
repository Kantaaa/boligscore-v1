-- comparison capability — RLS tightening, triggers, and SQL math.
--
-- The `property_felles_scores` table itself was created as a STUB in
-- 20260501000004_properties_dependent_stubs.sql with permissive SELECT
-- only and no INSERT/UPDATE/DELETE policies (writes denied by absence).
-- This migration:
--   1. Tightens SELECT (members of the property's household).
--   2. Adds INSERT/UPDATE/DELETE policies — owner/member only,
--      `updated_by = auth.uid()` enforced via DEFAULT + trigger.
--   3. Adds an `updated_at` auto-touch trigger.
--   4. Defines `compute_felles_total()`, `compute_user_total()`, and
--      `get_property_comparison()` SQL helpers used by the comparison
--      data layer.
--
-- households.comparison_disagreement_threshold was added in 0001.
-- This migration only verifies its existence in a defensive DO block.
--
-- Tasks: openspec/changes/comparison/tasks.md (1.x — 3.x)
-- Spec : openspec/changes/comparison/specs/comparison/spec.md
-- Design: openspec/changes/comparison/design.md (D1, D2, D7, D10)

-- 0. Sanity-check the threshold column from the households capability ---------

do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'households'
          and column_name = 'comparison_disagreement_threshold'
    ) then
        raise exception 'households.comparison_disagreement_threshold missing — '
                        'should have been added by 20260501000001_households.sql';
    end if;
end$$;

-- 1. property_felles_scores — RLS rewrite -------------------------------------
--
-- The stub already enabled RLS and added a permissive SELECT. Replace
-- it with capability-specific policies. INSERT/UPDATE/DELETE require
-- owner/member role AND updated_by = auth.uid().

drop policy if exists property_felles_scores_select on public.property_felles_scores;
create policy property_felles_scores_select on public.property_felles_scores
    for select
    using (
        exists (
            select 1
            from public.properties p
            where p.id = property_felles_scores.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member', 'viewer']
              )
        )
    );

drop policy if exists property_felles_scores_insert on public.property_felles_scores;
create policy property_felles_scores_insert on public.property_felles_scores
    for insert
    with check (
        updated_by = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_felles_scores.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    );

drop policy if exists property_felles_scores_update on public.property_felles_scores;
create policy property_felles_scores_update on public.property_felles_scores
    for update
    using (
        exists (
            select 1
            from public.properties p
            where p.id = property_felles_scores.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    )
    with check (
        updated_by = auth.uid()
        and exists (
            select 1
            from public.properties p
            where p.id = property_felles_scores.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    );

drop policy if exists property_felles_scores_delete on public.property_felles_scores;
create policy property_felles_scores_delete on public.property_felles_scores
    for delete
    using (
        exists (
            select 1
            from public.properties p
            where p.id = property_felles_scores.property_id
              and public.has_household_role(
                  p.household_id,
                  array['owner', 'member']
              )
        )
    );

comment on policy property_felles_scores_select on public.property_felles_scores is
    'Members of the property''s household (any role) can read felles scores.';
comment on policy property_felles_scores_insert on public.property_felles_scores is
    'Owner/member of the property''s household can insert. updated_by must equal auth.uid() (defence-in-depth in case the DEFAULT is overridden).';

-- 2. updated_at touch trigger -------------------------------------------------
--
-- Keep `updated_at` honest on every UPDATE. INSERT defaults to now()
-- via the column default in the stub.

create or replace function public._comparison_felles_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    -- Defensive: if a caller (or buggy server action) tries to write
    -- updated_by to someone other than auth.uid(), reject. This is
    -- belt-and-braces for the WITH CHECK on the policy.
    if new.updated_by is distinct from auth.uid() then
        -- During SECURITY DEFINER admin paths auth.uid() can be NULL;
        -- only enforce when there *is* a logged-in user.
        if auth.uid() is not null then
            raise exception 'property_felles_scores.updated_by must equal auth.uid()';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists property_felles_scores_touch on public.property_felles_scores;
create trigger property_felles_scores_touch
    before insert or update on public.property_felles_scores
    for each row execute function public._comparison_felles_touch_updated_at();

comment on function public._comparison_felles_touch_updated_at() is
    'Sets updated_at to now() on every INSERT/UPDATE and asserts updated_by = auth.uid() when a user is logged in. Defence-in-depth for the RLS policy.';

-- 3. compute_felles_total -----------------------------------------------------
--
-- Returns the rounded 0..100 felles total for a property, or NULL when
-- the household has no weights or every weight is 0 (denominator zero).
--
-- Numerator: Σ (felles_score × household_weight) over criteria with
--            a felles row set.
-- Denominator: Σ household_weight over ALL criteria (so missing felles
--              rows reduce the total — the punishment for being
--              incomplete that the brief calls for).

create or replace function public.compute_felles_total(p_property_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_household_id uuid;
    v_numerator numeric := 0;
    v_denominator numeric := 0;
begin
    select p.household_id into v_household_id
    from public.properties p
    where p.id = p_property_id;

    if v_household_id is null then
        return null;
    end if;

    select coalesce(sum(hw.weight), 0)
      into v_denominator
    from public.household_weights hw
    where hw.household_id = v_household_id;

    if v_denominator = 0 then
        return null;
    end if;

    select coalesce(sum(fs.score::numeric * hw.weight::numeric), 0)
      into v_numerator
    from public.property_felles_scores fs
    join public.household_weights hw
      on hw.household_id = v_household_id
     and hw.criterion_id = fs.criterion_id
    where fs.property_id = p_property_id;

    -- felles_total = round( (Σ (score × weight) / Σ weight) × 10 )
    -- Score range 0..10, scaled by 10 → 0..100 integer.
    return round((v_numerator / v_denominator) * 10)::int;
end;
$$;

comment on function public.compute_felles_total(uuid) is
    'Felles totalscore (0..100 int) for a property. NULL when no weights exist or all weights are 0. Missing felles rows contribute 0 to numerator but the denominator still uses ALL household_weights — sparse storage is the punishment for incompleteness.';

revoke all on function public.compute_felles_total(uuid) from public;
grant execute on function public.compute_felles_total(uuid) to authenticated;

-- 4. compute_user_total -------------------------------------------------------
--
-- Mirror of compute_felles_total but driven by property_scores +
-- user_weights for a specific user. Used for both `din_total` (viewer)
-- and `partner_total` (the other member).

create or replace function public.compute_user_total(
    p_property_id uuid,
    p_user_id uuid
)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_household_id uuid;
    v_numerator numeric := 0;
    v_denominator numeric := 0;
begin
    select p.household_id into v_household_id
    from public.properties p
    where p.id = p_property_id;

    if v_household_id is null then
        return null;
    end if;

    select coalesce(sum(uw.weight), 0)
      into v_denominator
    from public.user_weights uw
    where uw.household_id = v_household_id
      and uw.user_id = p_user_id;

    if v_denominator = 0 then
        return null;
    end if;

    -- Sum over criteria THE USER HAS SCORED. Unscored criteria are
    -- excluded from numerator AND denominator (din_total only looks
    -- at criteria the user has expressed an opinion about — D7 says
    -- "sum only over criteria you've scored"). We model this by
    -- joining property_scores INNER → only scored criteria contribute.
    select coalesce(sum(ps.score::numeric * uw.weight::numeric), 0)
      into v_numerator
    from public.property_scores ps
    join public.user_weights uw
      on uw.household_id = v_household_id
     and uw.user_id = ps.user_id
     and uw.criterion_id = ps.criterion_id
    where ps.property_id = p_property_id
      and ps.user_id = p_user_id;

    -- Re-sum the denominator over the same criteria so the formula
    -- matches D7's "Σ user_weight[viewer][c] over criteria you've
    -- scored". When the user has scored 0 criteria → denominator 0
    -- → null (UI shows "Ikke nok data").
    select coalesce(sum(uw.weight), 0)
      into v_denominator
    from public.user_weights uw
    join public.property_scores ps
      on ps.user_id = uw.user_id
     and ps.criterion_id = uw.criterion_id
     and ps.property_id = p_property_id
    where uw.household_id = v_household_id
      and uw.user_id = p_user_id;

    if v_denominator = 0 then
        return null;
    end if;

    return round((v_numerator / v_denominator) * 10)::int;
end;
$$;

comment on function public.compute_user_total(uuid, uuid) is
    'Personal totalscore (0..100 int) for (property × user). Sums only over criteria the user has scored (D7). NULL when user_weights are missing/all-zero or the user has not scored anything.';

revoke all on function public.compute_user_total(uuid, uuid) from public;
grant execute on function public.compute_user_total(uuid, uuid) to authenticated;

-- 5. get_property_comparison --------------------------------------------------
--
-- Single-call payload for the Sammenligning tab. Returns:
--   * property fields,
--   * threshold + member count,
--   * the three totalscores (felles / din / partner),
--   * a JSON array of per-criterion rows: {criterion_id, section_id,
--     criterion_label, criterion_sort_order, section_label,
--     section_sort_order, your_score, partner_score, partner_user_id,
--     snitt, felles_score, felles_set}.
--
-- Member count drives UI variant selection:
--   1 → simplified (Kriterium | Din | Felles)
--   2 → full       (Kriterium | <viewer> | <partner> | Snitt | Felles)
--   3+ → simplified (D9 — out of MVP scope to render multi-member matrix)
--
-- Partner scores ARE included on purpose — the comparison view's whole
-- value is showing partner scores. This is the intentional partner-data
-- exposure that the get_property_with_scores function deliberately
-- avoided. Limited to 2-member households.

create or replace function public.get_property_comparison(
    p_property_id uuid,
    p_viewer_id uuid
)
returns table (
    property_id uuid,
    household_id uuid,
    address text,
    threshold int,
    member_count int,
    partner_user_id uuid,
    rows jsonb,
    felles_total int,
    your_total int,
    partner_total int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_household_id uuid;
    v_address text;
    v_threshold int;
    v_member_count int;
    v_partner_user_id uuid;
    v_rows jsonb;
begin
    -- Resolve property + membership check.
    select p.household_id, p.address into v_household_id, v_address
    from public.properties p
    where p.id = p_property_id;

    if v_household_id is null then
        return;
    end if;

    if not exists (
        select 1
        from public.household_members hm
        where hm.household_id = v_household_id
          and hm.user_id = p_viewer_id
    ) then
        return;
    end if;

    select h.comparison_disagreement_threshold
      into v_threshold
    from public.households h
    where h.id = v_household_id;

    select count(*) into v_member_count
    from public.household_members hm
    where hm.household_id = v_household_id;

    -- Pick the unique partner only when member count is exactly 2.
    if v_member_count = 2 then
        select hm.user_id into v_partner_user_id
        from public.household_members hm
        where hm.household_id = v_household_id
          and hm.user_id <> p_viewer_id
        limit 1;
    end if;

    -- Build the per-criterion JSON array. Order is enforced inside
    -- the aggregate via ORDER BY (the subquery's ORDER BY alone does
    -- NOT carry through jsonb_agg in Postgres).
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'criterion_id',          c.id,
                'criterion_key',         c.key,
                'criterion_label',       c.label,
                'criterion_sort_order',  c.sort_order,
                'section_id',            c.section_id,
                'section_key',           s.key,
                'section_label',         s.label,
                'section_sort_order',    s.sort_order,
                'your_score',            ps_self.score,
                'partner_score',         case when v_partner_user_id is not null
                                              then ps_partner.score else null end,
                'partner_user_id',       v_partner_user_id,
                'snitt',                 case
                    when v_partner_user_id is not null
                      and ps_self.score is not null
                      and ps_partner.score is not null
                    then round((ps_self.score::numeric + ps_partner.score::numeric) / 2.0)::int
                    else null
                end,
                'felles_score',          fs.score,
                'felles_set',            (fs.score is not null)
            )
            order by s.sort_order, c.sort_order
        ),
        '[]'::jsonb
    )
      into v_rows
    from public.criteria c
    join public.criterion_sections s on s.id = c.section_id
    left join public.property_scores ps_self
      on ps_self.property_id = p_property_id
     and ps_self.user_id = p_viewer_id
     and ps_self.criterion_id = c.id
    left join public.property_scores ps_partner
      on v_partner_user_id is not null
     and ps_partner.property_id = p_property_id
     and ps_partner.user_id = v_partner_user_id
     and ps_partner.criterion_id = c.id
    left join public.property_felles_scores fs
      on fs.property_id = p_property_id
     and fs.criterion_id = c.id;

    return query
    select
        p_property_id,
        v_household_id,
        v_address,
        v_threshold,
        v_member_count,
        v_partner_user_id,
        v_rows,
        public.compute_felles_total(p_property_id),
        public.compute_user_total(p_property_id, p_viewer_id),
        case
            when v_partner_user_id is null then null
            else public.compute_user_total(p_property_id, v_partner_user_id)
        end;
end;
$$;

comment on function public.get_property_comparison(uuid, uuid) is
    'Single-call payload for the Sammenligning tab: property + threshold + member count + per-criterion rows (your_score, partner_score, snitt, felles_score) + the three totalscores. Membership check at top so non-members get an empty result.';

revoke all on function public.get_property_comparison(uuid, uuid) from public;
grant execute on function public.get_property_comparison(uuid, uuid) to authenticated;
