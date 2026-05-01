> Conventions: see `openspec/conventions.md`.

## 1. Supabase auth configuration

> Hosted Supabase: settings live in the dashboard, not in `supabase/config.toml`.
> `docs/architecture/auth.md` documents what to configure manually. Dev users
> for the hosted project are seeded via `scripts/seed-dev-users.mjs` instead
> of `supabase/seed.sql` (which is local-CLI-only).

- [~] 1.1 In Supabase project dashboard (or `supabase/config.toml` for local): enable email/password and magic link providers; set Site URL to deploy origin. — Documented in `docs/architecture/auth.md`; manual dashboard step.
- [~] 1.2 Set redirect URLs whitelist: `http://localhost:3000/**`, `https://*.vercel.app/**`, prod domain. — Documented; manual dashboard step.
- [~] 1.3 In dev (`supabase/config.toml`): `[auth.email] enable_confirmations = false`. In prod (Supabase dashboard): `enable_confirmations = true`. — Documented; manual dashboard step.
- [~] 1.4 Customize email templates (Norwegian copy) for: magic link, signup confirmation, password reset. — Documented; manual dashboard step.
- [~] 1.5 Verify Mailpit captures emails: run `supabase start`, trigger a password reset, see it in Mailpit at `http://localhost:54324`. — Hosted project has no Mailpit; deferred to local-Supabase-CLI workflow.
- [x] 1.6 Provide `scripts/seed-dev-users.mjs` so the hosted project gets `alice@test.local` / `bob@test.local` (password `test1234`) idempotently via the admin API.

## 2. Public landing page

- [ ] 2.1 `app/page.tsx` — headline "Score boliger sammen. Bli enige raskere.", supporting text, primary CTA `Registrer` (link to `/registrer`), secondary CTA `Logg inn` (link to `/logg-inn`).
- [ ] 2.2 Subtle hero illustration or screenshot; no marketing scroll, no testimonials.
- [ ] 2.3 Norwegian copy throughout. Tone: rolig, ryddig, trygg.

## 3. Register page

- [ ] 3.1 `app/registrer/page.tsx` — form with email + password fields. "Logg inn med e-postlenke i stedet" link reveals the magic-link form variant.
- [ ] 3.2 Server action `registerWithPassword({ email, password, next })` calls Supabase signup. Handles errors: invalid email, weak password, already registered.
- [ ] 3.3 Server action `requestMagicLink({ email, next })` calls `signInWithOtp` with `emailRedirectTo`.
- [ ] 3.4 Validate `next` param is same-origin; default to `/app/onboarding`.
- [ ] 3.5 Inline validation errors in Norwegian.

## 4. Login page

- [ ] 4.1 `app/logg-inn/page.tsx` — same structure as register; email + password and magic-link variant.
- [ ] 4.2 Server action `loginWithPassword({ email, password, next })`. Handle errors: wrong password, unconfirmed email (prod), generic.
- [ ] 4.3 Default `next` is `/app`.
- [ ] 4.4 Forgot-password link routes to Supabase's default reset flow.

## 5. Onboarding page

- [ ] 5.1 `app/app/onboarding/page.tsx` — single-input form: "Hva skal vi kalle husholdningen deres?". On submit, calls `createHousehold` (from `households` capability).
- [ ] 5.2 After creation, advance to invitation step: invitation link generated immediately, "Kopier invitasjonslenke" button copies it. Helper text per the brief.
- [ ] 5.3 "Hopp over — legg til senere" button routes to `/app`.
- [ ] 5.4 Auto-redirect logic: in `app/app/layout.tsx`, if authenticated user has zero households AND not currently on `/app/onboarding`, redirect to `/app/onboarding`.
- [ ] 5.5 Reverse guard: if user already has at least one household and visits `/app/onboarding` directly, redirect to `/app`.

## 6. Logout action

- [ ] 6.1 `app/app/meg/page.tsx` — placeholder Meg page (will be expanded later) with "Logg ut" button.
- [ ] 6.2 Server action `signOut()` calls `supabase.auth.signOut()` and redirects to `/`.
- [ ] 6.3 Verify no logout action appears in the header or bottom nav (audit `<AppShellHeader>` and `<BottomNav>` from `navigation-shell`).

## 7. Dev login bypass

- [ ] 7.1 `app/dev/login/route.ts` — route handler. Reads `as` query param (`alice` or `bob`), signs in via `signInWithPassword`, redirects to `/app`.
- [ ] 7.2 Wrap entire handler in `if (process.env.NEXT_PUBLIC_DEV_LOGIN_ENABLED !== '1') return new Response(null, { status: 404 })`.
- [ ] 7.3 Build-time guard in `next.config.mjs`: `if (process.env.VERCEL_ENV === 'production' && process.env.NEXT_PUBLIC_DEV_LOGIN_ENABLED === '1') throw new Error('dev/login MUST be disabled in production')`.
- [ ] 7.4 Test users seeded via `supabase/seed.sql`: `alice@test.local` and `bob@test.local`, password `test1234` (per conventions.md).

## 8. Invitation acceptance handoff

This page lives in `households` capability (`app/invitasjon/[token]/page.tsx`); this capability only contributes the **redirect-when-unauthenticated** behavior, which lives in middleware or in the page itself.

- [ ] 8.1 In `app/invitasjon/[token]/page.tsx` (created by `households`): if unauthenticated, redirect to `/registrer?next=/invitasjon/<token>`. (Document the requirement here; implementation may be split.)
- [ ] 8.2 Verify `next` param round-trip works for both `/registrer` and `/logg-inn` paths.

## 9. Open-redirect protection

- [ ] 9.1 Helper `validateNext(next: string | undefined): string` — returns `next` if it's a relative path starting with `/` and not starting with `//`, else returns `/app`.
- [ ] 9.2 Use this helper in every redirect-after-auth path: register, login, magic link, dev login.
- [ ] 9.3 Unit test the helper for: relative path → returns it; absolute URL → returns `/app`; protocol-relative `//evil.com` → returns `/app`; undefined → returns `/app`; non-string → returns `/app`.

## 10. Tests

- [ ] 10.1 **Unit (Vitest)**: `validateNext` helper covers all cases above.
- [ ] 10.2 **E2E (Playwright)**: full funnel — landing → register → onboarding (create household) → see empty `/app`. With email/password (no email needed in dev).
- [ ] 10.3 **E2E**: invitation flow end-to-end — Alice creates a household via dev-login; copies invitation link; Bob (new browser context) opens link, gets redirected to register, signs up, accepts invitation, lands on `/app` with the new household active.
- [ ] 10.4 **E2E**: magic link via Mailpit — request a magic link, poll Mailpit's HTTP API for the captured message, follow the link, verify session.
- [ ] 10.5 **E2E**: logout — sign in, click "Logg ut" in `Meg`, assert redirected to `/` and `/app/*` redirects to `/logg-inn`.
- [ ] 10.6 **E2E**: open-redirect attack — `/logg-inn?next=https://evil.com` redirects to `/app` after login, NOT to evil.com.
- [ ] 10.7 **E2E**: `/dev/login` returns 404 in production build (asserted via `NEXT_PUBLIC_DEV_LOGIN_ENABLED` unset).
- [ ] 10.8 **E2E**: onboarding auto-redirect — newly registered user lands on `/app/onboarding`; visiting `/app/vekter` directly redirects them to `/app/onboarding`.

## 11. Documentation

- [ ] 11.1 Update root `README.md`: section "Authentication & local testing" explaining email/password vs magic link, where Mailpit is, how to use `/dev/login`.
- [ ] 11.2 `docs/architecture/auth.md` — short doc describing the auth flow, route protection, and dev bypass.
- [ ] 11.3 `.env.example` — document `NEXT_PUBLIC_DEV_LOGIN_ENABLED`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
