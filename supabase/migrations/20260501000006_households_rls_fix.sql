-- households RLS hotfix: prevent infinite recursion.
--
-- The previous SELECT policies on households / household_members / household_invitations
-- contained inline subqueries on household_members. When the SELECT policy on
-- household_members ran, its inline subquery retriggered the same policy →
-- "infinite recursion detected in policy for relation 'household_members'".
--
-- Fix: centralise the membership check in a SECURITY DEFINER helper. Since the
-- function runs with definer privileges, the inner SELECT bypasses RLS — no
-- recursion. Mirrors the pattern of has_household_role().

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists(
        select 1 from public.household_members
        where household_id = hid
          and user_id = auth.uid()
    );
$$;

comment on function public.is_household_member(uuid) is
    'Returns true when auth.uid() is a member of the given household. SECURITY DEFINER so RLS does not recurse when called from policies on household_members itself.';

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated, anon;

-- Rewrite the three SELECT policies that previously used inline subqueries.

drop policy if exists households_select on public.households;
create policy households_select on public.households
    for select
    using (public.is_household_member(id));

drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members
    for select
    using (public.is_household_member(household_id));

drop policy if exists household_invitations_select on public.household_invitations;
create policy household_invitations_select on public.household_invitations
    for select
    using (public.is_household_member(household_id));
