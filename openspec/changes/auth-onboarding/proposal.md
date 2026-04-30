> Conventions: see `openspec/conventions.md`.

## Why

v1 has a basic auth screen and dumps the user into the property list. v2 needs a real **funnel**: landing page that explains the product, clean register/login (with magic-link option), an onboarding step that creates the first household and offers an invitation, and an invitation-acceptance route for the partner. Without this, household-based features (the whole product) have no entry point, and partners can't actually be invited in. **Email-based flows (magic link, invitations) are notoriously hard to test** — this proposal pins down a dev workflow that doesn't depend on real inboxes.

## What Changes

- **Landing page** (`/`):
  - Public, no auth required.
  - Headline: "Score boliger sammen. Bli enige raskere."
  - Hero illustration (subtle, not loud).
  - Primary CTA: `Registrer`. Secondary: `Logg inn`.
  - Tone: rolig, ryddig, trygg (per design brief — Linear / Notion / Things 3 vibe, not corporate).
- **Registrer** (`/registrer`) and **Logg inn** (`/logg-inn`):
  - **Email + password** is the **primary, always-available** auth method (easiest to test, no email dependency).
  - **Magic link** is offered as an alternative on both pages — labeled "Logg inn med e-postlenke i stedet".
  - Minimal forms — no extra fields beyond what's required.
- **Onboarding** (`/app/onboarding`) — runs immediately after first signup if user has zero households:
  - Single field: "Hva skal vi kalle husholdningen deres?" (placeholder example: `Ine & Kanta` or `Vårt boligsøk`).
  - On submit: create household, make user owner.
  - Then show two CTAs:
    - Primary: `Kopier invitasjonslenke`.
    - Secondary: `Send via e-post` (opens email field, sends invitation email with token).
  - Helper text: "Send denne lenken til din partner for å score boliger sammen."
  - Skip option: `Hopp over — legg til senere`. Skip routes user to `/app` empty state.
- **Invitation acceptance** (`/invitasjon/[token]`):
  - If not logged in → redirect to register/login first, return to this URL after.
  - Show: "Ine har invitert deg til husholdningen 'Ine & Kanta' som [rolle]. Godta?" with `Bli med` button.
  - On accept: add user as member with the role specified in the invitation (default `member`), redirect to `/app`.
  - Error states: token expired ("Denne lenken har utløpt. Be om en ny."), token already used, user already a member.
- **Logg ut**: action lives **only on the `Meg` page** (not in header/nav). Clears Supabase session, redirects to `/`.

## Email infrastructure

- **Local dev**: use **Supabase CLI + Mailpit**. Supabase local stack ships with Mailpit (a fake SMTP server with a web UI at `localhost:54324`). All outbound email — magic links AND invitation emails — lands there as a captured message you click. **No real inbox needed for end-to-end testing.** Document this in the repo `README` so future-you and agents don't fight magic-link auth in tests.
- **Production**:
  - **Magic link & password reset**: Supabase Auth's built-in email (rate-limited but adequate for a small-scale product).
  - **Invitation emails**: **Resend** (transactional service) — invitation deliverability matters more than auth emails (auth emails the user expects, invitation emails arrive cold to a partner). Configure via Supabase Edge Function or Next.js API route.
- **Staging**: same as production but with a verified test domain.
- **Test mode flag**: an env var `NEXT_PUBLIC_TEST_MODE_BYPASS=true` enables a `/dev/login` route that signs in a seeded test user with one click. Available only when env is set; surfaced via build guard so it can't ship to prod by accident. Used by e2e tests.

## Capabilities

### New Capabilities
- `auth-onboarding`: landing page, registration/login (password + magic link), first-run household onboarding, invitation acceptance flow with role propagation, logout, dev-mode email capture via Mailpit.

### Modified Capabilities
<!-- None - replaces v1's bare auth screen entirely. -->

## Out of MVP scope (future)

- **OAuth providers** (Google, Apple): out of scope. Email/password + magic link is enough.
- **2FA**: out of scope.
- **Password reset UI**: Supabase's default "forgot password" email flow suffices in MVP. Custom UI later.

## Impact

- **Auth (Supabase)**: enable email/password + magic-link providers, configure email templates (Norwegian copy), set redirect URLs.
- **Email delivery**: Mailpit in dev (Supabase CLI native), Resend in prod for invitation emails. Need a Resend API key in env vars.
- **Database**: writes to `households` + `household_members` (from onboarding) and `household_invitations` (already defined in `households` capability).
- **Routes added**: `/`, `/registrer`, `/logg-inn`, `/app/onboarding`, `/invitasjon/[token]`, plus dev-only `/dev/login` (gated by env var). Plus a route guard for `/app/*` that redirects unauthenticated users to `/logg-inn`.
- **UI**: new public-facing landing page (different layout from app shell), minimal auth forms, onboarding screen with copy/share affordances.
- **Repo docs**: `README` section "Local development email testing" explaining the Mailpit URL and how to run Supabase CLI locally.
- **Dependencies**: requires `households` (for entity creation) and `navigation-shell` (for `/app/*` route protection and post-login destination). Blocks nothing else but is the entry point users hit first.
