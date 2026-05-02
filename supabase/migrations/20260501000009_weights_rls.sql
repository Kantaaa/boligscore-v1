-- weights capability — Row Level Security.
--
-- Tasks (openspec/changes/weights/tasks.md):
--   3.1 Enable RLS on `criteria`, `criterion_sections`, `household_weights`,
--       `user_weights`.
--   3.2 `criteria` and `criterion_sections`: SELECT for any authenticated
--       user; no writes via API (service-role only).
--   3.3 `household_weights` SELECT: caller is member of household_id.
--   3.4 `household_weights` UPDATE: owner/member only. INSERT/DELETE
--       blocked at API (handled by trigger only).
--   3.5 `user_weights` SELECT: caller's own row only.
--   3.6 `user_weights` UPDATE: same condition as SELECT.
--
-- The stubs migration (20260501000004_properties_dependent_stubs.sql)
-- already enabled RLS on all four tables and added permissive SELECT
-- policies for `criteria`, `criterion_sections`, `household_weights`,
-- and `user_weights` (own rows only). This migration:
--   * keeps SELECT as-is for the four tables (already correct), and
--   * ADDS the UPDATE policies that were absent in the stubs (writes
--     were denied by absence of policies).
--   * Does NOT add INSERT/DELETE policies — population is via triggers
--     only and DELETE is via FK cascade only.

-- household_weights -----------------------------------------------------------

drop policy if exists household_weights_update on public.household_weights;
create policy household_weights_update on public.household_weights
    for update
    using (public.has_household_role(household_id, array['owner', 'member']))
    with check (public.has_household_role(household_id, array['owner', 'member']));

comment on policy household_weights_update on public.household_weights is
    'Felles weight UPDATE allowed for owner/member of the household. Viewer denied. INSERT/DELETE not allowed (trigger / cascade only).';

-- user_weights ----------------------------------------------------------------

drop policy if exists user_weights_update on public.user_weights;
create policy user_weights_update on public.user_weights
    for update
    using (
        user_id = auth.uid()
        and public.has_household_role(household_id, array['owner', 'member'])
    )
    with check (
        user_id = auth.uid()
        and public.has_household_role(household_id, array['owner', 'member'])
    );

comment on policy user_weights_update on public.user_weights is
    'Personal weight UPDATE: only the row owner (user_id = auth.uid()) AND only if owner/member role in the household. Viewer denied.';
