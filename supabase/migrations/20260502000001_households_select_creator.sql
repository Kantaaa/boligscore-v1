-- households RLS hotfix #2: allow creator to SELECT their own household.
--
-- Why: PostgreSQL applies the SELECT policy to the RETURNING clause of
-- INSERT. The createHousehold server action does
-- `INSERT INTO households (...) RETURNING id`, but at that exact moment
-- the user is NOT yet a member (the household_members row is inserted
-- in the next statement). With the previous SELECT policy
-- `is_household_member(id)` the RETURNING is denied, which PostgREST
-- surfaces as "new row violates row-level security policy for table
-- 'households'" (the error message is misleading — the row inserts
-- but the RETURNING fails, rolling back the whole statement).
--
-- Fix: SELECT policy now allows BOTH members and the original creator.
-- This handles the transient moment between household creation and
-- first-member insert, and aligns with the intuition that you should
-- always be able to see your own creation.
--
-- Drop side-effects: cleans up the diagnostic functions used to track
-- this down (debug_whoami, debug_policies, debug_check_insert).

drop function if exists public.debug_whoami();
drop function if exists public.debug_policies(text);
drop function if exists public.debug_check_insert(uuid);

drop policy if exists households_select on public.households;
create policy households_select on public.households
    for select
    using (is_household_member(id) or created_by = auth.uid());
