> Conventions: see `openspec/conventions.md`.

## Why

v1 is a single-page app where every action opens a modal — fine on desktop, miserable on mobile, and impossible to grow into the multi-page v2 flows (per-property tabs, Vekter/Husstand/Meg pages, household switcher). v2 is **mobile-first as a PWA** because the primary use-case is "I'm standing in someone's kitchen at a viewing." This capability provides the navigation chassis everything else hangs on: bottom nav, per-property tabs, household switcher, theme, and PWA installability. **The repo migrates from Vite/React-only to Next.js (App Router)** to get routing, server components, API routes (needed later for FINN-import), and PWA tooling in one stack.

## What Changes

- **BREAKING — framework migration**: replace the current Vite + React single-page app with **Next.js (App Router)**. All existing components are ported into `/app/*` route segments.
- **Mobile-first design**, with desktop = responsive single-column with a max-width centered layout. **Same navigation on both** (bottom nav on mobile, same nav stretched/anchored on desktop). No separate side-nav variant — keeps things simple and the brief says desktop is secondary.
- **Bottom nav** (mobile) / equivalent at-the-bottom or top nav on desktop, four items:
  - `Boliger` (forsiden, list of household properties)
  - `Vekter`
  - `Husstand`
  - `Meg`
- **Household switcher** at the top of every page: chip showing active household name (e.g. `🏠 Ine & Kanta ▾`). Dropdown lists all households the user belongs to + "Opprett ny husholdning".
- **Property detail tabs**: `Oversikt` | `Min vurdering` | `Sammenligning` | `Kommentarer` | `Notater`. Underline-style, horizontally scrollable on mobile if overflow.
- **PWA**:
  - Manifest with name, icons (192/512), theme colors, `display: standalone`, `start_url: /app`.
  - Service worker for offline shell + asset caching (no offline mutations in MVP — show "du er offline" banner).
  - Installable on mobile home screen.
  - Implementation: `next-pwa` or equivalent App-Router-compatible PWA plugin.
- **Theming**: **light** (default) and **dark** — explicit toggle, no auto/system mode in MVP. Stored in `Meg` page, persisted to localStorage + user profile (when logged in). CSS variables, no flash on reload (handled by SSR/server component).
- **Mobile-first principles** (enforced via design tokens / lint):
  - Touch targets ≥ 44×44px.
  - No hover-only interactions.
  - One-handed reach: primary CTAs in bottom half / FAB.
  - FAB on `Boliger` page for `+ Ny bolig`.
- **Accessibility floors**:
  - Contrast AA minimum.
  - Status never communicated by color alone — always icon + text.
  - Visible focus ring on tab navigation.
- **Design tokens** (spacing, type, color palette) are sourced from the **Stitch** designs. Each Stitch screen will be pulled, palette/typography extracted, and codified as CSS variables / Tailwind config. This is part of the implementation tasks for this capability.

## Capabilities

### New Capabilities
- `navigation-shell`: Next.js app shell, bottom/top nav, household switcher, per-property tab system, PWA setup, light/dark theme toggle, design tokens extracted from Stitch, accessibility floor.

### Modified Capabilities
<!-- None - this is new chassis, not a modification of existing nav. -->

## Out of MVP scope (future)

- **Auto theme** following `prefers-color-scheme`. MVP is explicit toggle only.
- **Offline mutations** — write queueing while offline, sync on reconnect. MVP shows a banner and disables writes when offline.
- **Per-device theme override** distinct from profile preference.

## Impact

- **Framework migration**: Vite → Next.js (App Router). Significant restructure: `App.tsx` → `app/layout.tsx` + route segments. All existing components keep their shape but lose modal-based composition.
- **Layout**: new `<AppShell>` wrapping all `/app/*` routes; `<PropertyTabs>` wrapping `/app/bolig/[id]/*` routes.
- **PWA tooling**: add `next-pwa` (or App-Router-compatible alternative), generate manifest + icons, register service worker.
- **Theme**: theme provider with two themes (light/dark), CSS variables for colors, persist preference in localStorage (anonymous) + sync to user profile when logged in.
- **Design tokens**: spacing scale, type scale, color palette aligned with brief (rolig blå/dempet grønn primary, varm grå nøytral, pastell statusfarger). Extracted from Stitch via the `mcp__stitch__get_screen` tool during implementation.
- **Routes added**: `/`, `/registrer`, `/logg-inn`, `/app/onboarding`, `/app`, `/app/vekter`, `/app/husstand`, `/app/meg`, `/app/bolig/ny`, `/app/bolig/[id]/{oversikt,min-vurdering,sammenligning,kommentarer,notater}`, `/invitasjon/[token]`.
- **Build/deploy**: existing Vite build pipeline replaced. Deploy target likely Vercel (Next.js native) or Netlify.
- **Dependencies**: should be done early (alongside `households` + `auth-onboarding`) since every other capability mounts inside this shell. Doesn't block scoring/weights logic, but blocks their *UI delivery*.
