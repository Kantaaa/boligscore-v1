# Navigation shell architecture

This is a short reference for the chassis other capabilities mount into.
For the full reasoning behind every choice, read
`openspec/changes/navigation-shell/design.md` (decisions D1–D10).

## Route layout

```
src/app/
├── layout.tsx              Root layout. <html data-theme="...">, theme bootstrap
│                            script, <ThemeProvider>, <InstallPromptProvider>.
├── globals.css             Semantic CSS variable tokens (light/dark).
│
├── (public)/               Route group. Minimal layout, no shell chrome.
│   ├── layout.tsx
│   ├── page.tsx            "/"
│   ├── registrer/          "/registrer"
│   ├── logg-inn/           "/logg-inn"
│   └── invitasjon/[token]/ "/invitasjon/:token"
│
├── app/                    Protected app surface. Uses the AppShell.
│   ├── layout.tsx          Server-side auth check; renders header + main + nav.
│   ├── page.tsx            "/app"            (Boliger forsiden)
│   ├── vekter/             "/app/vekter"
│   ├── husstand/           "/app/husstand"
│   ├── meg/                "/app/meg"        (theme toggle, install button)
│   └── bolig/[id]/
│       ├── layout.tsx      Renders the <PropertyTabs> strip.
│       ├── page.tsx        Redirects -> ./oversikt
│       ├── oversikt/
│       ├── min-vurdering/
│       ├── sammenligning/
│       ├── kommentarer/
│       └── notater/
│
└── dev/login/              "/dev/login"  Env-gated test bypass (404 in prod).
```

## Route protection

Two layers, defence in depth:

1. **`src/middleware.ts`** runs on every request, recognises `/app/*`
   as protected, and redirects to `/logg-inn?next=<safe-path>` when no
   Supabase session is present. The `next` value is validated by
   `src/lib/auth/redirects.ts` — only same-origin paths under `/app`
   pass.
2. **`src/app/app/layout.tsx`** also calls `supabase.auth.getUser()`
   server-side and redirects on miss. This protects against the rare
   case where middleware is bypassed (e.g. test harness, edge runtime
   misconfiguration).

## Theme handling

- Tokens live as CSS variables in `globals.css`, scoped to
  `:root[data-theme="light"]` and `:root[data-theme="dark"]`.
- `tailwind.config.ts` maps semantic class names (`bg-surface`,
  `text-fg`, `text-primary`, ...) to those variables.
- An inline `<script>` in the root layout reads `localStorage.theme` and
  sets `<html data-theme="...">` synchronously, **before paint**, so
  there is no FOUC.
- The `ThemeProvider` client component reads the attribute that the
  bootstrap script already set, so React hydration matches the DOM.
- Toggling the theme on `/app/meg` calls `setTheme(...)`, which:
  1. updates state,
  2. sets the attribute on `<html>`,
  3. writes to `localStorage`,
  4. (TODO, owned by `auth-onboarding`) syncs to `user_profiles.theme`.

## Bottom navigation

`src/components/shell/BottomNav.tsx`. `position: fixed` to the viewport
bottom on every breakpoint (design D5). `<main>` gets
`pb-bottom-nav` (a Tailwind utility wired to the `--bottom-nav-h` CSS
variable) so content always scrolls clear of the nav. Active state is
derived from `usePathname()` — there is no separate "current route"
state to keep in sync.

## Property tabs

Each tab is its own route segment. `src/app/app/bolig/[id]/page.tsx`
redirects to `./oversikt` when no tab is specified. Tab slugs are
**part of the public URL contract** — renaming any of them is a
breaking change.

## PWA

- `public/manifest.webmanifest` declares the app name, icons (192/512),
  `start_url: /app`, and `display: standalone`.
- `@ducanh2912/next-pwa` (`next.config.mjs`) generates the service
  worker for production builds. Disabled in `next dev` to avoid
  caching during iteration.
- The browser's `beforeinstallprompt` is captured by
  `InstallPromptProvider` and replayed by the `Installer som app`
  button on `/app/meg` (design D8 — passive, never auto-prompted).
- `OfflineBanner` watches `navigator.onLine` and renders the offline
  notice. MVP does not queue offline mutations.

## Tests

- **Unit (Vitest)**: `src/lib/auth/redirects.test.ts` — open-redirect
  guard. Add new unit tests next to the code they cover.
- **E2E (Playwright)**: `tests/e2e/*.spec.ts` — every requirement in
  `openspec/changes/navigation-shell/specs/navigation-shell/spec.md`
  has a matching describe block. Specs that need an authenticated
  session are `test.fixme`-marked with a pointer to the
  `auth-onboarding` capability that owns the dev-login form.
