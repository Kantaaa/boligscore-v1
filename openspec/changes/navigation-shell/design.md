> Conventions: see `openspec/conventions.md`.

## Context

v1 is a single Vite SPA with one root component. v2 needs **routes** (per-property tabs, top-level pages, public marketing route, invitation acceptance), **PWA installability**, **light/dark theme**, and a **design system** that aligns with Stitch screens. The shell is the chassis every other capability hangs on — its decisions are reused everywhere, so picking the right framework and tokens here matters more than any single feature decision.

## Goals / Non-Goals

**Goals:**
- Migrate to Next.js (App Router) and replace `App.tsx` with a routed layout.
- Provide a single responsive layout: same component tree on mobile and desktop, scaling via Tailwind breakpoints. Mobile-first, desktop = single column with max width.
- Bottom navigation on mobile (Boliger / Vekter / Husstand / Meg) anchored to viewport bottom.
- Per-property tab system (`Oversikt | Min vurdering | Sammenligning | Kommentarer | Notater`) using nested routes.
- PWA: manifest + icons + offline shell via service worker. Installable on mobile.
- Theme: light (default) + dark, explicit toggle, persisted, no flash on reload.
- Design tokens (spacing, type, color) extracted from Stitch screens and codified as Tailwind config + CSS variables.
- Route guards that redirect unauthenticated users to `/logg-inn` for `/app/*` paths.

**Non-Goals:**
- Auto theme following `prefers-color-scheme`. Explicit toggle only.
- Separate desktop nav (sidebar). One nav, both viewports.
- Offline write queueing — show banner when offline, disable writes, sync on reconnect is a future change.
- Server-side data fetching for every page — most pages remain client-rendered with Supabase JS. SSR is reserved for SEO-relevant public pages (`/`, `/invitasjon/[token]`).

## Decisions

### D1. Next.js App Router

**Choice**: Next.js 14+ with App Router (`app/` directory).

**Alternative considered**: Next.js Pages Router; React Router on existing Vite.

**Rationale**: App Router gives us server components (cleaner SSR for landing/invitation pages), nested layouts (perfect for `/app/bolig/[id]/<tab>`), file-based routing, and Vercel-native deploy. Pages Router is older and less aligned with where Next.js is going. React Router on Vite would work but we'd reimplement layouts/data-loading patterns Next.js already solves.

### D2. PWA via `@ducanh2912/next-pwa`

**Choice**: `@ducanh2912/next-pwa` (App Router-compatible fork of `next-pwa`).

**Alternative considered**: hand-rolled service worker via `next/cache` and Workbox directly.

**Rationale**: battle-tested, generates manifest registration + service worker, handles versioning. App Router compatibility via the maintained fork. Hand-rolling is unjustified complexity for an MVP.

### D3. Theme: CSS variables in `:root[data-theme=...]`, Tailwind reads via config

**Choice**: define color tokens as CSS variables (`--color-bg`, `--color-fg`, `--color-primary`, etc.) under `:root[data-theme="light"]` and `:root[data-theme="dark"]`. Tailwind config maps semantic class names (`bg-surface`, `text-fg`, `border-muted`) to those variables. Theme switch toggles `data-theme` attribute on `<html>`.

**Alternative considered**: Tailwind `dark:` variant prefix everywhere.

**Rationale**: semantic class names (`bg-surface` not `bg-white dark:bg-slate-900`) keep components theme-agnostic. Easier to add a third theme later. CSS variables are also consumable by inline styles when needed.

### D4. No-FOUC theme: inline script in `<head>`

**Choice**: a tiny script in the root layout's `<head>` reads `localStorage.theme` and sets `data-theme` on `<html>` before React hydrates. Falls back to `light` if unset.

**Rationale**: any theme logic that runs after hydration causes a flash of unstyled content (white flash → dark theme paint). Inline script is the standard fix and runs before paint.

### D5. Bottom nav is `position: fixed` with `padding-bottom` on `<main>`

**Choice**: bottom nav fixed to viewport bottom on all viewports. Main content gets `pb-[<nav-height>]` so the nav doesn't overlap. On desktop the same nav stays at the bottom — keeps one component, one mental model.

**Alternative considered**: top tab bar on desktop.

**Rationale**: brief says desktop is secondary. Single nav is less code, less drift, fewer bugs. If it ever feels wrong on desktop we can revisit.

### D6. Property detail tabs via nested routes

**Choice**: `/app/bolig/[id]/oversikt`, `/app/bolig/[id]/min-vurdering`, etc. Each tab is its own route segment. Default redirect from `/app/bolig/[id]` to `/oversikt`. The `[id]` layout renders the tab strip and the slot for the active tab.

**Alternative considered**: query string state (`/app/bolig/[id]?tab=oversikt`); parallel routes.

**Rationale**: real routes mean back-button works per tab, deep links work, and SSR can prefetch only the active tab's data. Parallel routes are overkill for "show one of N panes". Query strings make analytics and bookmarks fuzzy.

### D7. Breakpoint at 768px (Tailwind `md:`)

**Choice**: mobile = `< 768px`, desktop = `≥ 768px`. Use Tailwind's `md:` prefix for desktop adjustments.

**Rationale**: matches Tailwind defaults, matches typical tablet-portrait threshold, keeps mental model simple. Brief describes "mobil" and "desktop" — no tablet-specific layout.

### D8. PWA install: passive, surfaced only in Meg page

**Choice**: capture the `beforeinstallprompt` event but **don't** show a custom prompt automatically. Add an "Installer som app" button on the `Meg` page that fires the saved event when clicked.

**Rationale**: aggressive install prompts annoy users. Brief says "tone: rolig, ryddig, trygg" — pushing install fights that. Surface it where users go to configure things.

### D9. Deployment target: Vercel

**Choice**: Vercel for staging + production.

**Rationale**: Next.js native deploy, free hobby tier covers MVP, preview deployments per PR are useful for agent-loop reviews. Can move later if needed.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Migrating Vite → Next.js touches every file | Do it on a fresh branch, port file-by-file, keep v1 in `/legacy/` for reference until v2 ships, then delete. |
| Service worker caches stale assets after deploy | `next-pwa` handles versioning via build hash; document `Ctrl+F5` workaround for dev confusion in `README`. |
| Theme FOUC despite the inline script | Inline script runs synchronously before paint — verified by Chrome DevTools Performance trace as part of e2e. |
| Tab routing breaks deep links if a tab is renamed | Tab slugs are stable and listed in conventions.md. Renaming requires a migration note. |
| Bottom nav covers content on small viewports | `pb-20` (or similar) on `<main>`; integration test scrolls to bottom and asserts last item is fully visible. |
| Stitch design tokens drift from implementation | Document the token-extraction process in `tasks.md` step 2; rerun extraction whenever Stitch screens are updated. |
| `/dev/login` ships to prod | Build guard: `if (process.env.NODE_ENV === 'production' && !process.env.DEV_LOGIN_FORCE) throw new Error('dev/login disabled')`. CI test asserts route returns 404 in prod build. |

## Resolved Decisions

### D10. Tailwind version

**Choice**: Tailwind v3 (stable). Defer Tailwind v4 until it's out of preview.

**Rationale**: stability over freshness. Tooling around v3 is mature.
