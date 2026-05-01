# Households — architecture notes

> Spec source: `openspec/changes/households/{proposal,design,specs/households/spec.md}.md`.

The `households` capability is the foundational layer for v2: every
other table (`properties`, `property_scores`, `weights`, etc.) carries
a `household_id` and is gated by RLS on household membership.

This doc is a quick orientation for capability authors. The canonical
behaviour lives in the OpenSpec docs.

## Tables

```text
households
  id uuid PK
  name text NOT NULL CHECK (length(trim(name)) > 0)
  created_by uuid (immutable via trigger)
  created_at timestamptz
  comparison_disagreement_threshold int (1..10, default 3)

household_members
  household_id uuid FK households.id ON DELETE CASCADE
  user_id uuid FK auth.users.id ON DELETE CASCADE
  role text CHECK (role IN ('owner','member','viewer'))
  joined_at timestamptz
  last_accessed_at timestamptz
  PK (household_id, user_id)

household_invitations
  id uuid PK
  household_id uuid FK households.id ON DELETE CASCADE
  token uuid UNIQUE
  invited_email text NULL
  role text CHECK (role IN ('owner','member','viewer')) DEFAULT 'member'
  expires_at timestamptz DEFAULT (now() + interval '7 days')
  accepted_by uuid NULL FK auth.users.id
  created_by uuid FK auth.users.id
  created_at timestamptz
```

`households.created_by` is immutable: a `BEFORE UPDATE` trigger
(`households_prevent_created_by_update`) raises if the column changes.
This is design D2 — the original creator is preserved for diagnostics
but does not gate any policy (any owner can manage the household).

## RLS pattern

Every household-scoped table has two policies:

1. **Read** — `EXISTS (SELECT 1 FROM household_members WHERE
   household_id = <table>.household_id AND user_id = auth.uid())`.
   Any role can read.
2. **Write** — same membership check PLUS `role IN ('owner', 'member')`.
   Viewer is excluded.

The helper `public.has_household_role(hid uuid, roles text[])` wraps
the membership-and-role check so future capability authors can write
one-liners:

```sql
CREATE POLICY properties_write ON public.properties
    FOR INSERT TO authenticated
    WITH CHECK (public.has_household_role(household_id, ARRAY['owner','member']));
```

`has_household_role` is `STABLE SECURITY DEFINER` so the planner can
cache results within a query. It is granted to `authenticated` and
`anon`; `anon` invocation just returns `false`.

### Invitation acceptance — public read

The acceptance page must render before the user signs in, so a
`SECURITY DEFINER` function `public.get_invitation_by_token(uuid)`
returns a curated subset (id, household_id, household_name, inviter_id,
role, expires_at, accepted_by). This bypasses RLS deliberately —
without it, anonymous callers couldn't see the invitation summary.
The `token` is the capability and is not leaked to other rows.

### Atomic acceptance

`acceptInvitation` issues:

```sql
UPDATE household_invitations
SET accepted_by = auth.uid()
WHERE token = $1
  AND accepted_by IS NULL
  AND expires_at > now()
RETURNING household_id, role;
```

Two concurrent callers cannot both win this update because Postgres
serialises updates on the same row. The loser sees zero rows and gets
`ALREADY_ACCEPTED_MESSAGE`.

If the caller is already a member, we return early with
`alreadyMember: true` and **do not** mark the invitation accepted —
this lets the inviter still use it for someone else.

## Active household state

Per design D5 the active household is **client-side state** stored in
`localStorage.boligscore.activeHouseholdId`. Server queries always
include the household id explicitly; there is no implicit "current
household" on the server.

The protected `/app` layout pre-fetches `listMyHouseholds()` and
exposes the list through `<ActiveHouseholdProvider>`. The
`useActiveHousehold()` hook returns `{ activeHouseholdId, memberships,
setActiveHousehold }`.

Fallbacks:
- `localStorage` value points at an unknown id → drop and pick
  `pickFallback(memberships)` (newest `last_accessed_at`).
- Memberships empty → `/app` redirects to `/app/onboarding`.

## Hard cascade delete

Per design D11 deleting a household hard-cascades. All household-scoped
tables MUST declare `ON DELETE CASCADE` on `household_id`. The UI
requires the user to type the household name as confirmation; the
server action also re-checks the typed name as defence in depth.

## Where to look

| Concern | File |
| --- | --- |
| SQL — schema | `supabase/migrations/20260501000001_households.sql` |
| SQL — RLS policies | `supabase/migrations/20260501000002_households_rls.sql` |
| Server actions | `src/server/households/*.ts` |
| Pure helpers + types | `src/lib/households/{roles,types}.ts` |
| UI — switcher / provider | `src/components/households/{HouseholdSwitcher,ActiveHouseholdProvider}.tsx` |
| UI — Husstand page | `src/app/app/husstand/page.tsx` + `src/components/households/HusstandClient.tsx` |
| UI — onboarding | `src/app/app/onboarding/page.tsx` + `src/components/households/OnboardingClient.tsx` |
| UI — invitation acceptance | `src/app/(public)/invitasjon/[token]/page.tsx` |
| Tests — unit | `src/lib/households/roles.test.ts` |
| Tests — integration (skipped) | `tests/integration/*.test.ts` |
| Tests — e2e (fixmed) | `tests/e2e/household-*.spec.ts` |
