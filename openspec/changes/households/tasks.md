> Conventions: see `openspec/conventions.md`.

## 1. Project bootstrap (prerequisite if not done)

- [x] 1.1 Provision a fresh Supabase project for v2 and store URL/anon key in `.env.local`.
- [x] 1.2 Confirm Next.js (App Router) skeleton exists (delivered by `navigation-shell` capability — depend on its early scaffolding).
- [x] 1.3 Add Supabase JS client (`@supabase/supabase-js`, `@supabase/ssr`) and a typed client factory (`lib/supabase/server.ts`, `lib/supabase/client.ts`).
- [~] 1.4 Run `supabase init` and start `supabase start` locally; confirm Mailpit is reachable at `http://localhost:54324`. (deferred: Supabase CLI not installed on this machine; migrations are written as SQL files under `supabase/migrations/` and applied via the dashboard SQL Editor — see `supabase/README.md`.)

## 2. Database schema (SQL migration)

- [x] 2.1 Create migration `supabase/migrations/<ts>_households.sql`.
- [x] 2.2 Create `households` table: `id uuid PK default gen_random_uuid()`, `name text NOT NULL CHECK (length(trim(name)) > 0)`, `created_by uuid NOT NULL REFERENCES auth.users(id)`, `created_at timestamptz NOT NULL default now()`, `comparison_disagreement_threshold int NOT NULL default 3 CHECK (comparison_disagreement_threshold BETWEEN 1 AND 10)`.
- [x] 2.3 Create `household_role` enum / domain: `('owner', 'member', 'viewer')`. Use a CHECK constraint on a TEXT column for portability.
- [x] 2.4 Create `household_members` table: `household_id uuid REFERENCES households(id) ON DELETE CASCADE`, `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE`, `role text NOT NULL CHECK (role IN ('owner','member','viewer'))`, `joined_at timestamptz NOT NULL default now()`, `last_accessed_at timestamptz NOT NULL default now()`. Composite PK `(household_id, user_id)`. Index on `user_id`.
- [x] 2.5 Create `household_invitations` table: `id uuid PK default gen_random_uuid()`, `household_id uuid REFERENCES households(id) ON DELETE CASCADE`, `token uuid NOT NULL UNIQUE default gen_random_uuid()`, `invited_email text`, `role text NOT NULL CHECK (role IN ('owner','member','viewer')) default 'member'`, `expires_at timestamptz NOT NULL default (now() + interval '7 days')`, `accepted_by uuid REFERENCES auth.users(id)`, `created_by uuid NOT NULL REFERENCES auth.users(id)`, `created_at timestamptz NOT NULL default now()`. Index on `token`.
- [x] 2.6 Add a trigger preventing updates to `households.created_by` (raise exception).

## 3. RLS policies

- [x] 3.1 Enable RLS on all three tables.
- [x] 3.2 Create SQL function `public.has_household_role(hid uuid, roles text[])` returning bool, defined as `SELECT EXISTS(SELECT 1 FROM household_members WHERE household_id = hid AND user_id = auth.uid() AND role = ANY(roles))`. Mark `STABLE` and `SECURITY DEFINER`.
- [x] 3.3 `households` policies:
  - SELECT: `EXISTS (SELECT 1 FROM household_members WHERE household_id = households.id AND user_id = auth.uid())`.
  - INSERT: any authenticated user (creator becomes owner via app code or trigger).
  - UPDATE: `has_household_role(id, ARRAY['owner'])`.
  - DELETE: `has_household_role(id, ARRAY['owner'])`.
- [x] 3.4 `household_members` policies:
  - SELECT: must be a member of the same household.
  - INSERT: only via accept-invitation server action OR by an owner.
  - UPDATE (role change): `has_household_role(household_id, ARRAY['owner'])`.
  - DELETE (remove/leave): self OR owner.
- [x] 3.5 `household_invitations` policies:
  - SELECT: members of the household OR token-by-token public read for acceptance flow (handled via a `SECURITY DEFINER` function so anonymous can fetch by token).
  - INSERT: `has_household_role(household_id, ARRAY['owner','member'])`.
  - UPDATE (mark accepted): the accepting user only, and only if `accepted_by IS NULL` and `expires_at > now()`.
  - DELETE: owner or the original inviter.

## 4. Server actions / data layer

- [x] 4.1 `createHousehold(name)` — Next.js Server Action. Inserts household + first owner membership in a transaction.
- [x] 4.2 `renameHousehold(id, name)` — checks role via RLS.
- [x] 4.3 `deleteHousehold(id)` — owner only, requires typed-name confirmation on client.
- [x] 4.4 `listMyHouseholds()` — returns `[{id, name, role, joined_at, last_accessed_at}]` for the current user.
- [x] 4.5 `getHousehold(id)` — fetch single household + member list with roles.
- [x] 4.6 `setMemberRole(householdId, userId, role)` — owner only.
- [x] 4.7 `removeMember(householdId, userId)` — owner only.
- [x] 4.8 `leaveHousehold(householdId)` — self only. Server-side check: deny if caller is sole owner; return error message in Norwegian.
- [x] 4.9 `createInvitation(householdId, role?, invitedEmail?)` — generates token, optionally sends email.
- [x] 4.10 `getInvitationByToken(token)` — RPC via `SECURITY DEFINER` so unauthenticated users can read enough to render the acceptance page (returns: household name, inviter name, role, expires_at; never the token row directly).
- [x] 4.11 `acceptInvitation(token)` — atomic update: `UPDATE household_invitations SET accepted_by = auth.uid() WHERE token = $1 AND accepted_by IS NULL AND expires_at > now() RETURNING household_id, role`. Then insert `household_members` row.
- [x] 4.12 `revokeInvitation(invitationId)` — owner or original creator can delete unaccepted invitations.

## 5. Email integration — DEFERRED to follow-up change `households-email-invitations`

MVP ships **copy-link only**. The "Send via e-post" button is **not** rendered in the MVP UI; users share the link via SMS/Slack/text. The tasks below stay here as a reference for the follow-up change but are **not** part of this change's done-criteria.

- [ ] ~~5.1 Add `RESEND_API_KEY` to env (prod) and a Resend templates module under `lib/email/`.~~ (deferred)
- [ ] ~~5.2 Implement `sendInvitationEmail({ to, inviterName, householdName, link })`.~~ (deferred)
- [ ] ~~5.3 Email body: Norwegian copy.~~ (deferred)

## 6. UI — Husstand page (`/app/husstand`)

- [x] 6.1 Page lists active household: name (editable for owner), member list with role badges and "fjern" / "endre rolle" actions for owners.
- [x] 6.2 Invitation panel: "Kopier lenke" (primary, copies `${origin}/invitasjon/${token}` to clipboard). Role selector (default `member`, options `owner` / `member` / `viewer`) when generating a new invitation. **No "Send via e-post" button in MVP** — deferred to follow-up change.
- [x] 6.3 Pending invitations list with revoke action.
- [x] 6.4 Danger zone (owner only): "Slett husholdning" with typed-name confirmation modal.
- [x] 6.5 "Forlat husholdning" action (visible to non-sole-owner members).
- [x] 6.6 All status / role indicators use icon + text + color (per a11y rules in conventions.md).

## 7. UI — Household switcher

- [x] 7.1 Component `<HouseholdSwitcher />` rendered in the app shell header (delivered by `navigation-shell` but the component itself ships here).
- [x] 7.2 Chip displays active household name with house emoji and dropdown caret.
- [x] 7.3 Dropdown lists all memberships with role badges + "Opprett ny husholdning" (routes to `/app/onboarding`).
- [x] 7.4 Selecting a household updates `localStorage.activeHouseholdId`, calls a server action to bump `household_members.last_accessed_at`, and re-renders the active route.
- [x] 7.5 If user has zero memberships, redirect to `/app/onboarding`.

## 8. UI — Onboarding (`/app/onboarding`)

- [x] 8.1 Form with single `name` input. Submit calls `createHousehold`.
- [~] 8.2 Post-create screen: "Kopier invitasjonslenke" (primary), "Send via e-post" (secondary), "Hopp over" (skip). (deferred: "Send via e-post" intentionally omitted per design D9 — copy-link only in MVP.)
- [x] 8.3 Skip routes to `/app` (empty state).
- [x] 8.4 Auto-runs after first signup if `listMyHouseholds()` returns empty. (Enforced by /app page redirecting to /app/onboarding when memberships are zero.)

## 9. UI — Invitation acceptance (`/invitasjon/[token]`)

- [x] 9.1 Server-render the invitation summary via `getInvitationByToken`. Show household name, inviter, role, expiry.
- [x] 9.2 If unauthenticated: redirect to `/registrer?next=/invitasjon/<token>`.
- [x] 9.3 If expired / already accepted: show error variant with the right Norwegian message.
- [x] 9.4 If user is already a member: show "Du er allerede medlem" + button to switch active household.
- [x] 9.5 "Bli med" button calls `acceptInvitation`. On success, set `localStorage.activeHouseholdId` to the new household and redirect to `/app`.

## 10. Tests

- [x] 10.1 **Unit (Vitest)**: role helper functions, sole-owner check, invitation expiry helper, name validator.
- [~] 10.2 **Integration (Vitest + Supabase local)**: RLS — for each role (owner/member/viewer), verify allowed operations succeed and forbidden ones fail (read, write on each household-scoped table). Race-condition test for concurrent invitation acceptance. (Test bodies written in `tests/integration/rls.test.ts`, gated by `TEST_SUPABASE_URL` env var; skipped in this loop because no Supabase local instance is available.)
- [~] 10.3 **Integration**: `acceptInvitation` atomicity (two simultaneous calls — exactly one succeeds). (Skipped — see 10.2; spec mapping in `tests/integration/acceptInvitation.test.ts`.)
- [~] 10.4 **Integration**: cascade delete — deleting a household removes members, invitations, and household-scoped data from other tables. (Skipped — see 10.2; `tests/integration/cascadeDelete.test.ts`.)
- [~] 10.5 **E2E (Playwright)**: full invite-and-accept flow — Alice creates household, copies link, opens new browser context as Bob, accepts, both see same household. Switcher works. (Spec written in `tests/e2e/household-invite.spec.ts` with `test.fixme()` until /dev/login from auth-onboarding ships.)
- [ ] ~~10.6 **E2E**: Mailpit-based invitation email — Alice sends invitation by email, test reads Mailpit's HTTP API, follows the link as Bob, accepts, verifies membership.~~ (deferred with email-send follow-up change)
- [~] 10.7 **E2E**: viewer attempts to add a property → UI blocks AND a direct API call would fail RLS (curl/test with viewer JWT). (Spec written in `tests/e2e/household-viewer-rls.spec.ts` with `test.fixme()`; needs both /dev/login and the properties capability for the API write target.)

## 11. Documentation

- [x] 11.1 Update root `README.md` with Supabase CLI local-dev section (Mailpit URL, seed command).
- [x] 11.2 Update `README.md` with role explanation table (owner / member / viewer).
- [x] 11.3 Add a short `docs/architecture/households.md` summarizing the RLS model and `has_household_role` helper for future contributors.
