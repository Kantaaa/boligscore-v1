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
with `supabase start`, captures dev emails on its built-in HTTP UI.

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
