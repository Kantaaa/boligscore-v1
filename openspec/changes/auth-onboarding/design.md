> Conventions: see `openspec/conventions.md`.

## Context

v1 has a basic Supabase email/password auth and dumps the user straight into the property list. v2 needs a public funnel (landing → register → onboarding → first invitation) and a partner-side flow (invitation acceptance). It also needs to be **agent-testable** — magic-link auth is notoriously painful in CI because it requires a working email inbox. We solve that by making **email/password the primary path** (works without email infrastructure) and using **Mailpit** in dev to capture any email-based flow without a real inbox.

## Goals / Non-Goals

**Goals:**
- Public landing page that explains the product and routes to register/login.
- Email/password authentication as the primary auth method (always available).
- Magic link as a secondary, optional auth method (works locally via Mailpit; in prod via Supabase built-in email).
- First-run onboarding: create the user's first household, optionally generate an invitation link, then route to `/app`.
- Invitation acceptance route (`/invitasjon/[token]`) that supports unauthenticated users by routing them through register/login first.
- A `/dev/login` route gated by env var that signs in a seeded test user with one click — used by e2e tests to bypass auth flows.
- Logout action lives only on `/app/meg`.

**Non-Goals:**
- OAuth (Google, Apple, GitHub) — out of MVP scope, can be added later as a separate change.
- 2FA — out of scope.
- Custom password reset UI — Supabase's default "forgot password" flow suffices in MVP.
- Email verification gates — Supabase email confirmation is configured to OFF in dev, ON in prod with a "kontroller e-post" notice.
- Welcome email sequences / drip campaigns.

## Decisions

### D1. Email/password is primary; magic link is secondary

**Choice**: register/login pages show email + password form by default. A `Logg inn med e-postlenke i stedet` link reveals an alternate form (just email field). Both run via Supabase Auth.

**Alternative considered**: magic-link only (passwordless).

**Rationale**: passwordless is delightful when it works but failure modes (email delayed, spam folder, link expired in another browser) are devastating UX. Password gives users (and tests) a reliable fallback. We don't have to choose — Supabase supports both natively.

### D2. Email/password verification flag

**Choice**: in dev, `EMAIL_CONFIRM_REQUIRED = false` (sign in immediately). In prod, `EMAIL_CONFIRM_REQUIRED = true` (user must click the confirmation link in their email before logging in).

**Rationale**: dev workflow needs to be fast and reliable. Prod needs to defend against bot signups. Supabase configures this per-project.

### D3. Mailpit for all dev email; Resend for prod invitation emails (deferred)

**Choice**: Supabase CLI's local stack ships Mailpit at `http://localhost:54324`. All Supabase-sent emails (magic link, confirmation, password reset) are captured there in dev. Invitation emails are deferred to a follow-up change (per `households` D9).

**Alternative considered**: ngrok the dev environment and use a real inbox.

**Rationale**: Mailpit is zero-config, zero-cost, zero-flake. The dev experience is "click the link in Mailpit's web UI". Tests poll Mailpit's HTTP API to read captured messages.

### D4. Onboarding always creates a household

**Choice**: after first signup, the user is routed to `/app/onboarding`. They cannot skip household creation; they can skip the **invitation** generation. If they reach `/app/*` without a household (somehow), the layout redirects them to onboarding.

**Rationale**: every other capability assumes "active household exists". Defaulting to "every authenticated user has at least one household" eliminates a class of empty-state branches. The household name field accepts any non-empty string, so this never blocks a user.

### D5. Post-login redirect with `next` param

**Choice**: `/logg-inn` and `/registrer` both accept a `?next=<url>` query param. After successful auth, the user is redirected to `next` (validated as same-origin) or to `/app` if absent or invalid.

**Rationale**: needed for the invitation-acceptance flow — when an unauthenticated user opens an invitation link, we redirect to `/logg-inn?next=/invitasjon/[token]` and bring them back after auth. Same-origin validation prevents open-redirect attacks.

### D6. `/dev/login` bypass route

**Choice**: `/dev/login` is implemented as a Next.js route handler. It calls `supabase.auth.signInWithPassword({ email, password })` for a seeded test user (`alice@test.local` / `test1234` or `bob@test.local`) and redirects to `/app`. Gated by `NEXT_PUBLIC_DEV_LOGIN_ENABLED === '1'`. Build-time check fails the production build if the env var is set in a prod environment.

**Rationale**: e2e tests don't have time to walk through email/password forms 50 times. A one-click bypass keeps test runs fast. The build-time guard is what prevents accidental ship to prod.

### D7. Logout in Meg only

**Choice**: there is no "logg ut" button in the header, the bottom nav, or the household switcher. Only `/app/meg` has a logout action.

**Alternative considered**: logout in a header dropdown.

**Rationale**: brief implies it. Mobile screens are crowded; the user almost never wants to log out by accident. Putting logout where users go to "configure things" matches the principle.

### D8. Public landing page is minimal

**Choice**: simple landing — headline, sub-text, primary CTA (`Registrer`), secondary CTA (`Logg inn`), one supporting illustration or screenshot. No marketing scroll, no testimonials, no feature grid.

**Rationale**: solo developer + MVP. Landing exists to (a) explain in one sentence what the product is and (b) push to register. Bigger landing pages can come once the product has stories worth telling.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Magic link emails delayed in prod, frustrating users | Email/password is always available as a fallback. Surface both clearly on the login page. |
| `/dev/login` accidentally enabled in prod | Build-time guard fails the build if `NEXT_PUBLIC_DEV_LOGIN_ENABLED` is `1` in `process.env.VERCEL_ENV === 'production'`. CI test asserts the route 404s in prod build. |
| Open redirect via `?next=https://evil.com` | Validate `next` is same-origin: parse as URL, check `host === window.location.host` (or use a relative-only allowlist). Reject otherwise. |
| User signs up but never confirms email (prod) | Login page shows "kontroller e-post — vi har sendt en bekreftelseslenke" if Supabase returns the unconfirmed-email error. Resend confirmation link button. |
| Bot signups | Supabase email confirmation in prod (D2). Add hCaptcha later if abuse occurs. |
| Race: user opens invitation link, registers, but token expires before they accept | Token has 7-day window; registration takes seconds. Acceptable. |

## Resolved Decisions

### D9. Default test user credentials

**Choice**: seeded test users are `alice@test.local` / `test1234` and `bob@test.local` / `test1234`. Same as listed in `conventions.md` test data.

**Rationale**: predictable, documented, identical across local + e2e environments.
