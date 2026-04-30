> Conventions: see `openspec/conventions.md`.

## Why

Boligscore v1 is single-user — each account owns its own properties and scores. The core value of v2 is **partner scoring**: two people in the same relationship rate the same property independently and reconcile. Households are the foundation that makes shared property data, partner-aware scoring, and shared weights possible. Without households, none of the v2 flows (compare, felles weights, invite partner) can be built.

## What Changes

- **BREAKING — clean slate**: v2 starts on a **new Supabase project**. v1 data is **not migrated**. Existing v1 users will need to re-register and rebuild their property list.
- Introduce a `households` entity with: id, name (e.g. "Ine & Kanta"), created_by, created_at.
- Introduce a `household_members` join with: household_id, user_id, role, joined_at.
- **Roles**: `owner` | `member` | `viewer`.
  - `owner`: full read/write + manage members + delete household.
  - `member`: full read/write on properties, scoring, felles weights, can invite.
  - `viewer`: read-only — can see properties, scores, comparison; **cannot** score, edit weights, add properties, or invite. Useful for e.g. parents/realtor following along.
- A user can belong to **multiple** households and switch between them via a chip in the header (e.g. `🏠 Ine & Kanta ▾`).
- Introduce `household_invitations` with: id, household_id, token (uuid), invited_email (nullable), role (defaults to `member`), expires_at, accepted_by (nullable), created_at.
- **Invitation expiry: 7 days** from creation.
- Owner can: rename household, change member roles, remove members, delete household. Members can: leave household. Viewers: same as members for self-management.
- Invitation flow: owner generates a token → shareable link `/invitasjon/[token]` → invitee accepts and becomes member with the role specified in the invitation. **MVP ships copy-link only**; email-send is deferred to a follow-up change.
- Supabase RLS: every read/write on properties, scores, weights, etc. must check household membership and respect the role (`viewer` blocked from writes).

## Out of MVP scope (future)

- **Email-send for invitations**: a "Send via e-post" button that delivers the invitation link via Resend. Deferred to a follow-up change (`households-email-invitations`) once Resend is provisioned. MVP relies on the copy-link CTA — users share the link via SMS/Slack/text/etc.

## Capabilities

### New Capabilities
- `households`: household entity, members, role-based access (owner/member/viewer), invitations with 7-day expiry, household-switching UI.

### Modified Capabilities
<!-- None - this is the foundational capability that all others depend on. -->

## Impact

- **Database (Supabase)**: new tables `households`, `household_members`, `household_invitations`. All later tables (`properties`, `property_scores`, `weights`, etc.) get a `household_id` foreign key from day 1 — no backfill needed since we're starting fresh.
- **Auth/RLS**: new policies that gate all access by household membership AND respect role for writes.
- **UI**: header household-switcher chip; Husstand page (members list with role badges, invitation panel with role selector, leave/delete actions); onboarding step that creates the first household.
- **Routes**: `/app/onboarding`, `/app/husstand`, `/invitasjon/[token]`.
- **Dependencies**: blocks `properties`, `scoring`, `weights`, `comparison`, `auth-onboarding`. Should be implemented first.
