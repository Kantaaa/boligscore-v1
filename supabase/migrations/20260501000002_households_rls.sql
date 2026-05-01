-- households capability — Row Level Security
--
-- Pattern (design D6 — membership-then-role):
--   Read  : EXISTS membership row for auth.uid().
--   Write : same EXISTS PLUS role IN (owner | member). Viewer is excluded.
--
-- The has_household_role() helper centralises the join so future tables
-- can write policies as one-liners. SECURITY DEFINER is required because
-- the helper is called inside RLS policy expressions; STABLE so the
-- planner can cache results within a query.

-- Helper ----------------------------------------------------------------------

create or replace function public.has_household_role(hid uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists(
        select 1
        from public.household_members hm
        where hm.household_id = hid
          and hm.user_id = auth.uid()
          and hm.role = any(roles)
    );
$$;

comment on function public.has_household_role(uuid, text[]) is
    'Returns true when auth.uid() is a member of the given household with any of the supplied roles. Used in RLS policies on household-scoped tables.';

revoke all on function public.has_household_role(uuid, text[]) from public;
grant execute on function public.has_household_role(uuid, text[]) to authenticated, anon;

-- Public RPC: read invitation by token ---------------------------------------
--
-- The invitation acceptance page must render before the user is signed in
-- (we redirect unauthenticated users to /registrer with next=...). The
-- regular RLS policy on household_invitations would hide the row from
-- anonymous callers, so we expose a SECURITY DEFINER function that only
-- returns the safe public-facing fields.

create or replace function public.get_invitation_by_token(p_token uuid)
returns table (
    id uuid,
    household_id uuid,
    household_name text,
    inviter_id uuid,
    role text,
    expires_at timestamptz,
    accepted_by uuid
)
language sql
stable
security definer
set search_path = public
as $$
    select
        i.id,
        i.household_id,
        h.name as household_name,
        i.created_by as inviter_id,
        i.role,
        i.expires_at,
        i.accepted_by
    from public.household_invitations i
    join public.households h on h.id = i.household_id
    where i.token = p_token
    limit 1;
$$;

comment on function public.get_invitation_by_token(uuid) is
    'Public read of a single invitation row by token. Returns only the fields needed to render the acceptance page; the token itself is the capability.';

revoke all on function public.get_invitation_by_token(uuid) from public;
grant execute on function public.get_invitation_by_token(uuid) to authenticated, anon;

-- Enable RLS ------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security;

-- households policies ---------------------------------------------------------

drop policy if exists households_select on public.households;
create policy households_select on public.households
    for select
    using (
        exists (
            select 1 from public.household_members hm
            where hm.household_id = households.id
              and hm.user_id = auth.uid()
        )
    );

-- INSERT: any authenticated user. The accompanying first-owner row is
-- created by the createHousehold server action in the same transaction.
drop policy if exists households_insert on public.households;
create policy households_insert on public.households
    for insert
    with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists households_update on public.households;
create policy households_update on public.households
    for update
    using (public.has_household_role(id, array['owner']))
    with check (public.has_household_role(id, array['owner']));

drop policy if exists households_delete on public.households;
create policy households_delete on public.households
    for delete
    using (public.has_household_role(id, array['owner']));

-- household_members policies --------------------------------------------------

-- SELECT: members of the same household can see each other.
drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members
    for select
    using (
        exists (
            select 1 from public.household_members self
            where self.household_id = household_members.household_id
              and self.user_id = auth.uid()
        )
    );

-- INSERT: either the creator inserting their own first-owner row (no
-- existing membership yet — guarded by created_by = self in households),
-- or an existing owner adding someone, or the accept-invitation server
-- action where the invitee inserts their own row after token check.
-- The viewer-cannot-write rule is preserved because viewer is excluded
-- from the owner branch.
drop policy if exists household_members_insert on public.household_members;
create policy household_members_insert on public.household_members
    for insert
    with check (
        -- Self-inserting (used by both first-owner-on-create and
        -- accept-invitation flows; the rest of the validation lives in
        -- the server action / invitation row).
        user_id = auth.uid()
        or public.has_household_role(household_id, array['owner'])
    );

-- UPDATE: owners can change roles (and last_accessed_at on others, if ever),
-- and any member can update their own last_accessed_at.
drop policy if exists household_members_update on public.household_members;
create policy household_members_update on public.household_members
    for update
    using (
        user_id = auth.uid()
        or public.has_household_role(household_id, array['owner'])
    )
    with check (
        user_id = auth.uid()
        or public.has_household_role(household_id, array['owner'])
    );

-- DELETE: self (leave) OR owner (remove member).
drop policy if exists household_members_delete on public.household_members;
create policy household_members_delete on public.household_members
    for delete
    using (
        user_id = auth.uid()
        or public.has_household_role(household_id, array['owner'])
    );

-- household_invitations policies ---------------------------------------------

-- SELECT: members of the household can list invitations. Anonymous read by
-- token goes through get_invitation_by_token() RPC instead.
drop policy if exists household_invitations_select on public.household_invitations;
create policy household_invitations_select on public.household_invitations
    for select
    using (
        exists (
            select 1 from public.household_members hm
            where hm.household_id = household_invitations.household_id
              and hm.user_id = auth.uid()
        )
    );

-- INSERT: only owner or member of the household. Viewer denied (D6).
drop policy if exists household_invitations_insert on public.household_invitations;
create policy household_invitations_insert on public.household_invitations
    for insert
    with check (
        public.has_household_role(household_id, array['owner', 'member'])
        and created_by = auth.uid()
    );

-- UPDATE: only the accepting user can mark accepted_by, and only when the
-- row is unaccepted and not expired. The atomic UPDATE in acceptInvitation
-- relies on this combined with WHERE clauses.
drop policy if exists household_invitations_update on public.household_invitations;
create policy household_invitations_update on public.household_invitations
    for update
    using (
        accepted_by is null
        and expires_at > now()
        and auth.uid() is not null
    )
    with check (
        accepted_by = auth.uid()
    );

-- DELETE: original inviter or any owner of the household can revoke.
drop policy if exists household_invitations_delete on public.household_invitations;
create policy household_invitations_delete on public.household_invitations
    for delete
    using (
        created_by = auth.uid()
        or public.has_household_role(household_id, array['owner'])
    );
