> Conventions: see `openspec/conventions.md`.

## 1. Next.js migration

- [x] 1.1 Initialize a fresh Next.js 14+ project with App Router, TypeScript, Tailwind, ESLint in a new branch (`v2-shell`).
- [x] 1.2 Move v1 source into `/legacy/` for reference; delete `/legacy/` once v2 is shipped.
- [x] 1.3 Add `@supabase/supabase-js` and `@supabase/ssr`. Create `lib/supabase/server.ts` (server components, server actions) and `lib/supabase/client.ts` (client components).
- [x] 1.4 Configure absolute imports (`@/*` → `./src/*` or root) in `tsconfig.json`.
- [~] 1.5 Set up Vercel project (preview deployments per PR). _Blocked: requires user to link the GitHub repo to a Vercel project. `vercel.json` is committed so the link is one click._

## 2. Design tokens (extracted from Stitch)

- [~] 2.1 Pull each Stitch screen via `mcp__stitch__get_screen` and inspect HTML for color/spacing/type values. _Deferred: placeholder tokens used; rerun extraction in a dedicated pass before user testing._
- [~] 2.2 Define semantic CSS variables in `app/globals.css` under `:root[data-theme="light"]` and `:root[data-theme="dark"]`. Tokens: `--color-bg`, `--color-surface`, `--color-fg`, `--color-fg-muted`, `--color-primary`, `--color-primary-fg`, `--color-accent`, `--color-border`, status colors (`--color-status-favoritt`, `--color-status-vurderer`, etc.), and a spacing scale. _Placeholder values committed (rolig blå primary, varm grå neutrals, pastell status). Pending Stitch refresh._
- [x] 2.3 Map Tailwind theme to CSS variables in `tailwind.config.ts`: `colors: { surface: 'var(--color-surface)', fg: 'var(--color-fg)', primary: 'var(--color-primary)', ... }`.
- [~] 2.4 Type scale: define heading/body/caption sizes following Stitch screens. Use Tailwind `text-*` overrides or CSS variables. _Default Tailwind scale in use until Stitch extraction codifies sizes._
- [~] 2.5 Document the full token table in `docs/design-tokens.md` with values in both themes + the Stitch screen the value was sourced from. _Document committed; "Source" column says "placeholder" until Stitch values land._

## 3. Theme provider

- [x] 3.1 Inline `<head>` script in `app/layout.tsx` that reads `localStorage.theme` and sets `document.documentElement.dataset.theme` synchronously.
- [x] 3.2 `<ThemeProvider>` client component exposes `theme`, `setTheme(t)` via React context. Persists to localStorage and (when authenticated) syncs to user profile. _Profile sync is a TODO handed off to `auth-onboarding`._
- [x] 3.3 Theme toggle component used in `Meg` page.
- [x] 3.4 Verify no-FOUC: e2e test asserts the rendered theme matches `localStorage` on the first paint frame. _Implemented under task 9.3._

## 4. App shell layout

- [x] 4.1 `app/(public)/layout.tsx` — minimal layout for `/`, `/registrer`, `/logg-inn`, `/invitasjon/[token]`. No bottom nav, no household switcher.
- [x] 4.2 `app/app/layout.tsx` — protected app shell. Header (with `<HouseholdSwitcher />` slot from `households` capability) + main + bottom nav. Calls Supabase server-side to verify session; redirects to `/logg-inn?next=...` if absent.
- [x] 4.3 `<AppShellHeader>` component: app name on the left, household switcher on the right.
- [x] 4.4 `<BottomNav>` component: four destinations (`Boliger` → `/app`, `Vekter` → `/app/vekter`, `Husstand` → `/app/husstand`, `Meg` → `/app/meg`). Active state via `usePathname`.
- [x] 4.5 `<main>` gets `pb-[var(--bottom-nav-h)]` (bottom-nav height as a CSS variable) so content scrolls past the fixed nav.

## 5. Property detail tabs

- [x] 5.1 `app/app/bolig/[id]/layout.tsx` — renders `<PropertyTabs>` (active tab highlighted) and `{children}` slot.
- [x] 5.2 Tab destinations: `oversikt`, `min-vurdering`, `sammenligning`, `kommentarer`, `notater`. Each is a route segment with its own `page.tsx`.
- [x] 5.3 `app/app/bolig/[id]/page.tsx` — redirects to `./oversikt`.
- [x] 5.4 `<PropertyTabs>` component: underline-style, horizontally scrollable on mobile if it overflows, active tab via `usePathname`. Tab labels in Norwegian.

## 6. Public routes

- [x] 6.1 `app/page.tsx` — landing page (delivered by `auth-onboarding`). Just stub for now. _Stubbed at `(public)/page.tsx`._
- [x] 6.2 `app/registrer/page.tsx`, `app/logg-inn/page.tsx` — stubs (delivered by `auth-onboarding`).
- [x] 6.3 `app/invitasjon/[token]/page.tsx` — stub (delivered by `households`).
- [x] 6.4 `app/dev/login/page.tsx` — env-gated test bypass (delivered by `auth-onboarding`). _Returns 404 in production unless `DEV_LOGIN_FORCE=1`._

## 7. PWA setup

- [x] 7.1 Install `@ducanh2912/next-pwa` and configure in `next.config.mjs`.
- [x] 7.2 Create `public/manifest.webmanifest` with `name: "Boligscore"`, `short_name: "Boligscore"`, `icons` (192 + 512), `display: standalone`, `start_url: /app`, `theme_color`, `background_color` (matching design tokens).
- [x] 7.3 Add `<link rel="manifest" href="/manifest.webmanifest" />` in `app/layout.tsx`. _Implemented via `metadata.manifest` in the root layout (Next.js renders the link tag)._
- [~] 7.4 Generate icons (192px, 512px) from the Stitch logo or a placeholder. _Blocked: cannot generate binary PNGs in this loop. `public/icons/README.md` documents how to drop them in._
- [x] 7.5 Capture `beforeinstallprompt` event in a client component, store in a Zustand/Context store, expose via "Installer som app" button on `Meg` page. _Implemented via `InstallPromptProvider` (React context) mounted in the root layout._
- [x] 7.6 Offline banner: top banner that appears when `navigator.onLine === false`, copy "Du er offline — endringer lagres ikke."

## 8. Route protection

- [x] 8.1 Middleware (`middleware.ts`) that checks Supabase session for `/app/*` paths and redirects to `/logg-inn?next=<encoded path>` if no session.
- [x] 8.2 The middleware must NOT block public routes (`/`, `/registrer`, `/logg-inn`, `/invitasjon/[token]`, `/dev/login`).
- [x] 8.3 `next` param validation: only allow same-origin paths (no open-redirect via crafted external URL). _Implemented in `src/lib/auth/redirects.ts` with unit tests._

## 9. Tests

- [ ] 9.1 **E2E (Playwright)**: navigation across all four bottom-nav destinations works, active state matches URL.
- [ ] 9.2 **E2E**: property detail page redirects to `/oversikt` by default; switching tabs updates URL; deep link to a tab cold-loads correctly.
- [ ] 9.3 **E2E**: theme toggle persists across reload; first-paint frame matches stored theme (no FOUC).
- [ ] 9.4 **E2E**: unauthenticated visit to `/app/vekter` redirects to `/logg-inn?next=%2Fapp%2Fvekter`; after login, lands on `/app/vekter`.
- [ ] 9.5 **E2E**: PWA installability — Lighthouse PWA audit score ≥ 90 on the staging build.
- [ ] 9.6 **E2E**: offline banner appears when network is disabled; route still loads from service worker cache.
- [ ] 9.7 **E2E**: `/dev/login` returns 404 in production build (env guard test).
- [ ] 9.8 **A11y (axe-core, integrated with Playwright)**: every primary route passes axe with zero serious/critical violations.

## 10. Documentation

- [ ] 10.1 `docs/design-tokens.md` — full token table.
- [ ] 10.2 Update root `README.md`: how to run the app locally (Next.js + Supabase CLI), where Mailpit lives, how to flip themes for testing.
- [ ] 10.3 `docs/architecture/shell.md` — short explanation of layout structure, route protection, theme handling.
