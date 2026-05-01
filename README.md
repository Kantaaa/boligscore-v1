# Boligscore

Mobile-first PWA for scoring properties together with your household.
This repository is in the middle of the **v2 rebuild** — see
`openspec/changes/` for the planned capability work.

> The previous Vite + React SPA lives unchanged in `legacy/` for reference
> while the v2 capabilities are ported. It will be deleted once v2 ships.

## Tech stack (v2)

- Next.js 14 (App Router) + TypeScript
- Tailwind v3 with semantic CSS variables for theming
- Supabase (Postgres + Auth + RLS) via `@supabase/ssr`
- `@ducanh2912/next-pwa` for manifest + service worker
- Vitest (unit + integration) and Playwright (e2e)

## Local development

```bash
# 1. Install deps (npm or pnpm)
npm install

# 2. Copy env template and fill in Supabase project values
cp .env.example .env.local

# 3. Run the dev server
npm run dev
# → http://localhost:3000
```

The app expects Supabase to be reachable. For fully local development run
`supabase start` (Supabase CLI) and point `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` at the local instance. Mailpit, bundled
with `supabase start`, captures dev emails on its built-in HTTP UI at
`http://localhost:54324`.

### Database migrations

SQL migrations live under `supabase/migrations/` (numbered timestamp
prefix) and a seed file at `supabase/seed.sql` provisions two test
users. With the Supabase CLI:

```bash
supabase start             # boots local Postgres + Mailpit + Studio
supabase db reset          # applies migrations + seed (destroys local data)
```

Without the CLI (e.g. against a hosted Supabase project) paste each
migration into the dashboard SQL Editor in numeric order. Full
instructions in `supabase/README.md`.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run build` | Production build (also generates the PWA service worker) |
| `npm run start` | Run the production build locally |
| `npm run lint` | ESLint via `next lint` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit + integration suites |
| `npm run test:e2e` | Playwright end-to-end tests |

### Theme toggle while developing

Themes are switched at runtime by the toggle on the **Meg** page; the
choice is stored in `localStorage.theme` (`"light"` or `"dark"`). To
preview a theme without going through the UI, set the value directly in
DevTools and reload — the inline boot script applies it before paint, so
there is no flash.

### PWA service worker

The service worker is generated only for production builds. After
`npm run build` you may need a hard refresh (`Ctrl+F5`) in dev to escape
a stale cache when switching between dev and production locally.

## Deployment

Deployment target is **Vercel** (per `openspec/changes/navigation-shell/design.md`
D9). Each PR gets a preview deployment; `main` deploys to production.

## Authentication & local testing

Auth is handled by Supabase Auth. Email + password is the **primary**
sign-in path; magic link is offered as a one-click alternative on both
`/registrer` and `/logg-inn`. Logout is exposed only on `/app/meg`
(design D7).

### Routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `/` | public | Minimal landing (Registrer / Logg inn CTAs). |
| `/registrer` | public | Email+password registration; magic-link variant. |
| `/logg-inn` | public | Email+password login; magic-link variant. |
| `/invitasjon/[token]` | public | Invitation acceptance; redirects to `/registrer?next=…` when anon. |
| `/app/*` | protected | Requires a Supabase session (middleware-gated). |
| `/app/onboarding` | protected | First-run household creation; auto-redirect from `/app/*` when memberships=0. |
| `/dev/login` | dev only | Test bypass — `?as=alice\|bob` signs the user in instantly. 404 in prod. |

See `docs/architecture/auth.md` for the dashboard configuration this
capability assumes (Supabase providers, redirect allowlist, email
templates).

### `/dev/login` (test bypass)

`/dev/login` only responds when **both** env vars are `1`:
`NEXT_PUBLIC_DEV_LOGIN_ENABLED` and `DEV_LOGIN_FORCE`. With them set,
visiting `/dev/login?as=alice` (or `?as=bob`) signs the seeded test
user in with one HTTP redirect — perfect for Playwright fixtures.

A build-time guard in `next.config.mjs` aborts the build if the route
is ever enabled in a `VERCEL_ENV=production` deploy, so it cannot ship
to prod by accident.

### Seeding the dev users

Local Supabase CLI: `supabase db reset` runs `supabase/seed.sql`
(creates alice + bob).

Hosted Supabase (default for this repo): run the admin-API script
once, idempotently:

```bash
node scripts/seed-dev-users.mjs
```

It creates `alice@test.local` and `bob@test.local` (password
`test1234`) via the service-role key in `.env.local`.

### Magic link in dev

With local Supabase (`supabase start`), Mailpit at
`http://localhost:54324` captures every magic-link / confirmation
email. Click the link in Mailpit's web UI to complete the sign-in.

The hosted project does not have Mailpit; emails route through
whatever SMTP is configured in the Supabase dashboard (or the built-in
free tier).

## Households & roles

Every property, score, and weight in v2 belongs to a **household**
(`openspec/changes/households/`). A user can join multiple households
via copy-link invitations. Each membership has one of three roles:

| Role | Read | Write (score / edit / add) | Manage (rename, delete, change roles) |
| --- | --- | --- | --- |
| `owner` | yes | yes | yes |
| `member` | yes | yes | no |
| `viewer` | yes | no | no |

The role is enforced both in the UI (controls hide for `viewer`) and in
the database via Row Level Security policies (see
`docs/architecture/households.md`).

## Repo layout

```
src/
  app/              Next.js App Router routes + layouts
  components/       Shared UI components (AppShell, BottomNav, ...)
  lib/              Helpers (Supabase clients, env, theme, ...)
public/             Static assets (manifest, icons, ...)
docs/               Architecture + design-token reference
openspec/           Spec-driven change proposals (process source of truth)
legacy/             Frozen v1 Vite SPA, deleted once v2 ships
```

## OpenSpec process

The v2 rebuild is driven by `openspec/`. Read
`openspec/conventions.md` and `openspec/changes/<capability>/{proposal,design,tasks}.md`
before changing structural pieces of the app.
