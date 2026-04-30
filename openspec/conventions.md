# Boligscore v2 — Conventions

Cross-cutting rules that apply to all 7 v2 capabilities. When a capability proposal contradicts something here, the proposal wins (and this file gets updated).

## Language

- **UI strings**: Norwegian bokmål, hardcoded as JSX literals. No i18n layer in MVP.
  - Example: `<button>Bli med</button>`, `<h1>Score boliger sammen</h1>`.
- **Code, identifiers, comments, route paths, database columns/tables**: English.
  - Examples: `property`, `householdMembers`, `getCriteria()`, `/app/bolig/[id]`, `property_scores`, `created_at`.
- Tables and columns: snake_case. TypeScript types and React components: PascalCase. Functions and variables: camelCase.
- Future EN support: extract NO literals to `next-intl` JSON. Mechanical, deferrable.

## Tech stack (locked for v2)

- **Framework**: Next.js (App Router).
- **Database & auth**: Supabase (Postgres + Auth + RLS + Storage).
- **Styling**: Tailwind + CSS variables for theme tokens.
- **PWA**: `next-pwa` or App-Router-compatible alternative.
- **Email (local/dev)**: Mailpit (bundled with Supabase CLI local).
- **Email (prod)**: Resend for invitations; Supabase built-in for magic link / password reset.
- **Hosting**: Vercel (assumed).

## Testing

A capability is **done** only when:
1. All unit tests pass.
2. All integration tests pass against a Supabase CLI local instance.
3. The listed e2e flows pass on a staging build.
4. No new TypeScript or ESLint errors.

### Test categories

| Category | Tool | Scope |
|---|---|---|
| **Unit** | Vitest | Pure logic: math, role checks, validators, transforms. No external deps. Co-located as `*.test.ts`. |
| **Integration** | Vitest + Supabase test client | Anything that touches the DB or RLS. Runs against Supabase CLI local. DB reset between tests via seed fixture. |
| **E2E** | Playwright | Full user flows in a real browser. Auth bypass via `/dev/login` (env-gated). Email flows read captured messages from Mailpit's HTTP API. |

### Minimum test floor per capability

- `households`: unit (role helpers), integration (RLS for owner/member/viewer), e2e (invite → accept → switch household).
- `properties`: unit (status helpers, validators), integration (CRUD with RLS, filter/sort SQL), e2e (add manually → list shows it → status change).
- `scoring`: unit (counter, criteria grouping), integration (per-user isolation + history trigger writes), e2e (score 22 → counter updates → reload persists).
- `comparison`: unit (`felles_total`, `din_total`, threshold detection math), integration (felles-score writes with role check), e2e (two users score → see |Δ| highlight → edit felles).
- `weights`: unit (which weight set applies where), integration (seed-on-create trigger), e2e (drag slider → reload persists → felles & personal both render).
- `navigation-shell`: e2e (routing across top-level pages, theme toggle persists, PWA installable, household switcher works).
- `auth-onboarding`: e2e (landing → register → onboarding → invite via Mailpit → second account accepts → both see same household).

### Test data

- Seeded via `supabase/seed.sql` for local + e2e environments.
- Default seed: 2 users (`alice@test.local`, `bob@test.local`, password `test1234`), 1 shared household, 3 properties at varied statuses.

## Accessibility (floor — required across the app)

- WCAG AA contrast minimum in both light and dark themes.
- Status communicated by **icon + text + color** — never color alone.
- Touch targets ≥ 44×44px on mobile.
- Visible focus ring on interactive elements.
- No hover-only interactions.

## Mobile-first design rules

- One-handed reach for primary CTAs (bottom nav, FAB).
- Bottom sheets for filters; modals only for destructive confirmations.
- Tabs horizontally scrollable on mobile when overflowing.
- Desktop = responsive single-column with a max content width centered. No separate desktop layout.

## Error and empty states

Every screen needs both. Use shared components:
- **Empty**: illustration + headline + supporting text + primary CTA.
- **Error**: inline message preferred over modal, except destructive confirmations.
- **Offline**: top banner "Du er offline — endringer lagres ikke" (no offline mutations in MVP).

## OpenSpec process

- Every capability proposal in `openspec/changes/<name>/proposal.md` includes a top reference: `> Conventions: see openspec/conventions.md`.
- Deviations from this file must be called out explicitly in the proposal (in `Why` or a dedicated `## Deviations` section).
- This file is updated whenever a deviation becomes the new norm.
