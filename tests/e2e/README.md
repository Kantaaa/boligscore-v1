# End-to-end tests (Playwright)

These specs cover the navigation-shell capability acceptance criteria.

## Running

```bash
# 1. Boot Supabase locally (provides auth + DB)
supabase start

# 2. Configure .env.local to point at the local Supabase
cp .env.example .env.local
# Edit NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Run the suite (it builds + starts the prod server itself)
npm run test:e2e
```

## Auth bypass

Tests that need an authenticated session use the `/dev/login` route
(env-gated). Until `auth-onboarding` ships the dev-login form, those
tests are skipped via `test.fixme` markers — the test ids are
preserved so they unfreeze automatically once the form lands.
