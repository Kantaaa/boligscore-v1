# Auth & onboarding — architecture notes

> Spec source: `openspec/changes/auth-onboarding/{proposal,design,specs/auth-onboarding/spec.md}.md`.

The `auth-onboarding` capability covers the public funnel (landing →
register/login → first-run onboarding) and the partner-side invitation
flow. Auth provider is **Supabase Auth** (email + password as primary,
magic link as secondary).

This doc is a quick orientation. The canonical behaviour lives in the
OpenSpec docs.

## Routes overview

| Route | Auth | Purpose |
| --- | --- | --- |
| `/` | public | Minimal landing page (D8). |
| `/registrer` | public | Email + password registration; magic-link variant. |
| `/logg-inn` | public | Email + password login; magic-link variant. |
| `/invitasjon/[token]` | public | Accepts an invitation; redirects to `/registrer?next=…` when anonymous. |
| `/app/*` | protected | Requires a Supabase session. Middleware gate. |
| `/app/onboarding` | protected | First-run household creation (D4). |
| `/app/meg` | protected | Houses the **only** logout action (D7). |
| `/dev/login` | dev only | Env-gated test bypass (D6). 404 in prod. |

`/app/*` is enforced by middleware (`src/middleware.ts`) AND by the
protected layout (`src/app/app/layout.tsx`) — defence in depth.

## Server actions

All auth mutations live under `src/server/auth/`, marked `"use server"`.
One action per file; the barrel `src/server/auth/index.ts` re-exports.

| Action | What it does |
| --- | --- |
| `registerWithPassword({ email, password, next })` | Calls `supabase.auth.signUp`. On success redirects to `safeNextParam(next) ?? "/app/onboarding"`. |
| `loginWithPassword({ email, password, next })` | Calls `supabase.auth.signInWithPassword`. On success redirects to `safeNextParam(next) ?? "/app"`. |
| `requestMagicLink({ email, next })` | Calls `supabase.auth.signInWithOtp` with `emailRedirectTo` carrying `next`. |
| `signOut()` | Calls `supabase.auth.signOut`, redirects to `/`. |

Errors are surfaced as `{ ok: false, error }` (Norwegian copy) and
rendered inline. The flow never leaks raw Supabase error strings.

## Redirect helpers

`src/lib/auth/redirects.ts` holds `safeNextParam(value)` — the same
helper used by middleware. Allowed targets:

- `/app` and `/app/...`
- `/invitasjon/...`

Anything else (external URLs, protocol-relative `//evil.example/...`,
`javascript:` URIs, paths outside the allowlist) returns `null`. The
caller falls back to a known-safe default (`/app` for login, `/app/onboarding`
for register).

This is the open-redirect mitigation listed in design.md (Risks).

## Dev login bypass

`/dev/login` is a route handler at `src/app/dev/login/route.ts`. It:

1. **Returns 404** unless `process.env.NEXT_PUBLIC_DEV_LOGIN_ENABLED === "1"`
   AND `process.env.DEV_LOGIN_FORCE === "1"`. Both must be set to opt
   in — ample paranoia for what is essentially a backdoor.
2. Reads `?as=alice|bob` (default `alice`).
3. Calls `signInWithPassword` with `alice@test.local` / `test1234`
   (or `bob@test.local`).
4. Redirects to `safeNextParam(next) ?? "/app"`.

A build-time guard in `next.config.mjs` aborts the build when
`VERCEL_ENV === "production"` AND `NEXT_PUBLIC_DEV_LOGIN_ENABLED === "1"`
are both set, so the route can never ship to prod by accident.

The seeded users (`alice@test.local`, `bob@test.local`, both with
password `test1234`) live in `supabase/seed.sql` for local Supabase.
For the **hosted** Supabase project, run `node scripts/seed-dev-users.mjs`
once — it uses the service-role key to create them via the admin API
(idempotent: existing users are skipped). See `scripts/seed-dev-users.mjs`.

## Supabase dashboard configuration

Because the project uses a hosted Supabase instance (not the local CLI),
auth provider settings live in the Supabase dashboard rather than
`supabase/config.toml`. Required configuration:

### Authentication → Providers

- **Email**: enabled. Both `Sign up` and `Sign in` enabled.
- **Confirm email**: **disabled in dev**, **enabled in prod** (D2).
  - Dev: users sign in immediately after registration.
  - Prod: users must click the confirmation link before login works.
- **Magic link**: enabled (built-in for the Email provider).

### Authentication → URL Configuration

- **Site URL**: `http://localhost:3000` for dev, `https://<prod-domain>`
  for prod.
- **Additional Redirect URLs** (allowlist):
  - `http://localhost:3000/**`
  - `https://*.vercel.app/**`
  - prod domain when known

### Authentication → Email Templates

Customize the Norwegian copy for:
- **Magic Link** — `Logg inn på Boligscore`
- **Confirm signup** — `Bekreft e-postadressen din`
- **Reset password** — `Tilbakestill passordet ditt`

### Email delivery

- **Magic link & password reset**: Supabase Auth's built-in transactional
  email (rate-limited, fine for MVP).
- **Custom invitation emails**: deferred to the `households-email-invitations`
  follow-up change. Will use Resend.

In **local dev** with `supabase start`, Mailpit at `http://localhost:54324`
captures every outbound email — magic links, confirmation links, etc.
The hosted project does not have Mailpit; emails route through whatever
is configured under SMTP / built-in Supabase Auth.

## Why no email work in this capability

`auth-onboarding` does not send custom emails. Magic-link and signup
confirmation are handled natively by Supabase Auth. The only outbound
email workflow we own (invitation emails to partners) is deferred to
`households-email-invitations`, which will add Resend wiring.

## Where to look

| Concern | File |
| --- | --- |
| Redirect validator | `src/lib/auth/redirects.ts` |
| Server actions | `src/server/auth/*.ts` |
| Public landing | `src/app/(public)/page.tsx` |
| Register form | `src/app/(public)/registrer/page.tsx` + `src/components/auth/RegisterForm.tsx` |
| Login form | `src/app/(public)/logg-inn/page.tsx` + `src/components/auth/LoginForm.tsx` |
| Logout button | `src/app/app/meg/page.tsx` + `src/components/auth/SignOutButton.tsx` |
| Dev bypass | `src/app/dev/login/route.ts` |
| Build-time prod guard | `next.config.mjs` |
| Middleware | `src/middleware.ts` |
| Seed dev users (hosted) | `scripts/seed-dev-users.mjs` |
| Tests — unit | `src/lib/auth/redirects.test.ts` |
| Tests — e2e | `tests/e2e/auth-*.spec.ts` |
