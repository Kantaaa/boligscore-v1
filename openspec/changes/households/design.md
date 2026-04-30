> Conventions: see `openspec/conventions.md`.

## Context

Boligscore v2 is a clean-slate rebuild on a new Supabase project. Households are the foundational entity — every other capability (`properties`, `scoring`, `weights`, `comparison`) requires `household_id` ownership. Without households, RLS has nothing to gate on and partner scoring has no meaning.

Key constraints:
- **Defense-in-depth**: any household member could in principle craft a malicious request. Auth checks must live in the database (RLS), not just the app layer.
- **Multi-household per user**: a user can be in multiple households (e.g. own with partner, member of family's). The active household is session-scoped UI state.
- **Clean slate**: no v1 data migration. We can pick the cleanest schema without compatibility constraints.
- **Mobile-first PWA**: switching households happens via a header chip, not a sidebar.

## Goals / Non-Goals

**Goals:**
- Model households, members (with roles), and invitations as Supabase tables.
- Enforce role-based access (`owner` / `member` / `viewer`) at the RLS layer for all writes.
- Provide an invitation flow that works with copy-paste links (no inbox required) and optional email send.
- Provide a household switcher UI in the app shell that other capabilities consume.
- Token-based invitations with a 7-day expiry.

**Non-Goals:**
- Real-time push of household changes (member added, role changed) to other sessions. Polling/refresh on focus is acceptable for MVP.
- Custom roles beyond the three defined. No per-permission grants.
- Cross-household resource sharing (e.g. copying a property to another household). Out of scope.
- Transferring ownership. MVP: only the original creator is owner; co-owners can be added (multiple owners allowed) but no UI to "promote member to owner" until later.
- Audit log for household-level actions (member added, role changed). v1 nice-to-have.

## Decisions

### D1. Roles are a string enum, not a permissions table

**Choice**: `household_members.role TEXT CHECK (role IN ('owner', 'member', 'viewer'))`.

**Alternative considered**: flexible `(member, capability) → granted bool` table.

**Rationale**: three roles is enough for MVP and the brief. Flexible permissions add table joins to every RLS check, which is performance overhead and a complexity cost paid forever for a feature we don't need. Easy to migrate to a permissions table later if we ever need finer grain.

### D2. Multiple owners allowed; original creator tracked separately

**Choice**: any user can have `role = 'owner'`. `households.created_by` is the original creator and is **immutable**. Either an owner can be elevated by another owner.

**Rationale**: prevents the "last owner leaves" footgun. If a household has multiple owners, anyone can leave without bricking the household. Brief is silent on this — but the failure mode of "I left and now nobody can manage" is severe enough to design around. Original creator is stored for diagnostics / future "transfer ownership" flow.

### D3. Token-based invitations with `uuid` token + optional email

**Choice**: invitations create a row with a randomly generated UUID `token`. The token alone is sufficient to accept (no email required). Optionally, the inviting user provides an email address and we send an email containing the link `/invitasjon/[token]`.

**Alternative considered**: required email with verification.

**Rationale**: brief explicitly says "Kopier invitasjonslenke" is the primary action — copy-paste is the easiest UX (text the partner the link, no email setup needed). Email is a convenience, not a requirement. A leaked token can be revoked by the inviter (delete row). Single-use enforced by setting `accepted_by` on accept.

### D4. Invitations expire 7 days from creation

**Choice**: `expires_at = created_at + INTERVAL '7 days'`. Hardcoded in default value.

**Rationale**: matches user decision. 7 days is long enough to text and forget, short enough to limit token-leak blast radius. Configurable later if needed.

### D5. Active household is client-side state, scoped to session

**Choice**: the active household is stored in `localStorage` (key: `boligscore.activeHouseholdId`), with the user's most recently accessed household as fallback. Server queries always include the household ID explicitly — no implicit "current household" on the server.

**Alternative considered**: `users.active_household_id` column synced server-side.

**Rationale**: keeps the server stateless w.r.t. UI state. Server endpoints accept `household_id` and verify membership via RLS; the client picks which one. Avoids race conditions where two tabs disagree about active household. Handles the brief's "byttepil øverst" trivially.

### D6. RLS pattern — membership-then-role

**Choice**: every table with `household_id` has two RLS policies:
1. **Read policy**: `EXISTS (SELECT 1 FROM household_members WHERE household_id = <table>.household_id AND user_id = auth.uid())`. Any role can read.
2. **Write policy**: same as read PLUS `role IN ('owner', 'member')`. Viewer is excluded.

A helper SQL function `auth.has_household_role(hid uuid, roles text[])` will encapsulate this for reuse.

**Rationale**: simple, fast (the join is on indexed columns), and centralizes the "viewer cannot write" rule. Tested via integration tests that try writes as each role.

### D7. Onboarding creates a household even if user clicks "skip invitation"

**Choice**: a logged-in user always has at least one household. If they skip the invitation step, they still own a household (just with one member — themselves).

**Rationale**: every other capability assumes "active household exists". Defaulting to "everyone has at least one" eliminates a class of empty-state branches across the app. The user can rename or delete it later.

### D8. Household name is freeform; no uniqueness constraint

**Choice**: `households.name TEXT NOT NULL` with no unique index. Two households can both be called "Hjem".

**Rationale**: it's a personal label, not an identifier. Forcing uniqueness creates UX friction with no privacy or correctness benefit.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Last owner leaves, household becomes unmanageable | Multiple owners allowed (D2). Block "leave" action when caller is the only `owner` — UI must promote another member first. |
| Invitation token leaked (e.g. shared in a public chat) | Inviter can delete pending invitations from `Husstand` page. Tokens expire in 7 days regardless. Single-use after accept. |
| Viewer attempts a write and bypasses UI guards | RLS denies (D6). UI guards are convenience, not the security boundary. Integration tests verify each role's write attempts are denied at the DB. |
| User in many households drops the switcher into a tiny dropdown | Acceptable for MVP. If a user is in >5 households we can revisit (search box, etc.). |
| `localStorage` cleared → active household resets | On boot, fall back to "most recently accessed" (a `last_accessed_at` column on `household_members` updated when active). If user has zero households, route to onboarding. |
| Two tabs with different active households diverge | Acceptable: each tab acts on its own active household. Cross-tab sync can be added later via `storage` event. |
| Race: two users accept the same invitation simultaneously | `accepted_by` set via `UPDATE ... WHERE accepted_by IS NULL RETURNING *`. Whoever updates the row first wins; the loser sees a "kunne ikke godta — invitasjonen er allerede brukt" message. |

## Resolved Decisions

### D9. Copy-link only for first launch; email send deferred

**Choice**: MVP ships **copy-link only**. The "Send via e-post" button is deferred to a follow-up change (`households-email-invitations`).

**Rationale**: copy-link is the primary action per the brief. Email send requires Resend setup + DNS verification + transactional-email cost (free tier ~3k/month). Not blocking MVP — most invitations will be sent via SMS/Slack/text anyway.

### D10. Inviter can pick the role when generating an invitation; default `member`

**Choice**: the invitation panel includes a role selector (`member` default, can switch to `owner` or `viewer`). The selected role is stored on the invitation row and applied on acceptance.

**Rationale**: viewers are useful immediately for parents/realtors, and second owners avoid the sole-owner footgun. Surfacing role at send time is a small UI cost for meaningful flexibility. Default of `member` keeps the simple case one-click.

### D11. Hard cascade delete with typed-name confirmation

**Choice**: deleting a household hard-cascades to all dependent rows (members, invitations, properties, scores, weights, etc.) via foreign-key `ON DELETE CASCADE`. The UI requires the user to type the household name to confirm.

**Rationale**: simple schema, matches the "destructive actions = explicit modal" rule in `conventions.md`. Soft delete with grace period is safer but adds a `deleted_at` filter to every read query — not worth it at this scale. The typed-name modal makes accidental deletion implausible.
