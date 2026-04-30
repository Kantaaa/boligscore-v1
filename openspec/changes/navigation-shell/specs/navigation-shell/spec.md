## ADDED Requirements

### Requirement: Application shell layout

The system SHALL render an application shell that wraps all `/app/*` routes with: a header containing the household switcher, a main content area, and a bottom navigation bar with four destinations.

#### Scenario: Shell renders on app routes

- **WHEN** an authenticated user visits any `/app/*` route
- **THEN** the page renders the shell: header (with household switcher), main content area, bottom nav with `Boliger`, `Vekter`, `Husstand`, `Meg`

#### Scenario: Shell does not render on public routes

- **WHEN** a user visits `/`, `/registrer`, `/logg-inn`, or `/invitasjon/[token]`
- **THEN** the public layout is used (no household switcher, no bottom nav)

### Requirement: Bottom navigation

The bottom navigation SHALL be fixed to the viewport bottom on both mobile and desktop, contain four equal-width destinations, and indicate the active destination visually (filled icon + accent color).

#### Scenario: Active destination is highlighted

- **WHEN** the user is on `/app/vekter`
- **THEN** the `Vekter` nav item displays its filled-icon variant and an accent-colored label

#### Scenario: Tap navigates without full reload

- **WHEN** the user taps another nav destination
- **THEN** the route changes via client-side navigation (no full page reload)

#### Scenario: Main content has bottom padding equal to nav height

- **WHEN** the user scrolls main content to the very bottom
- **THEN** the last item is fully visible (not occluded by the bottom nav)

### Requirement: Property detail tab system

The property detail page SHALL render a tab strip with five tabs: `Oversikt`, `Min vurdering`, `Sammenligning`, `Kommentarer`, `Notater`. Each tab SHALL be a distinct route. Visiting `/app/bolig/[id]` without a tab segment SHALL redirect to `/app/bolig/[id]/oversikt`.

#### Scenario: Default redirect to Oversikt

- **WHEN** a user visits `/app/bolig/123`
- **THEN** they are redirected to `/app/bolig/123/oversikt`

#### Scenario: Tab switch updates URL

- **WHEN** a user is on `/app/bolig/123/oversikt` and taps the `Min vurdering` tab
- **THEN** the URL becomes `/app/bolig/123/min-vurdering` and the tab content swaps

#### Scenario: Browser back returns to previous tab

- **WHEN** a user navigates from `Oversikt` to `Min vurdering` and presses browser back
- **THEN** they return to `Oversikt`

#### Scenario: Direct deep link to a tab

- **WHEN** a user opens `/app/bolig/123/sammenligning` directly (cold load)
- **THEN** the page renders with the `Sammenligning` tab active

### Requirement: Light/dark theme

The system SHALL support exactly two themes (`light`, `dark`). The active theme SHALL be persisted in `localStorage.theme` and applied via the `data-theme` attribute on `<html>` before first paint, eliminating any flash of incorrect theme.

#### Scenario: Default theme on first visit

- **WHEN** a user has no `localStorage.theme` value and visits the site
- **THEN** the page renders with `data-theme="light"`

#### Scenario: Theme toggle persists

- **WHEN** the user toggles to dark mode in `Meg`
- **THEN** `localStorage.theme = "dark"` is set
- **AND** `<html>` gains `data-theme="dark"`

#### Scenario: Theme survives reload without flash

- **WHEN** a user with `localStorage.theme = "dark"` reloads any page
- **THEN** the page paints in dark theme with no observable flash to light theme during load

### Requirement: PWA installability

The site SHALL ship a web app manifest, two icon sizes (192px and 512px), and a service worker that caches the application shell for offline navigation. The site SHALL satisfy browser-level installability criteria.

#### Scenario: Manifest is served

- **WHEN** the browser requests `/manifest.webmanifest`
- **THEN** the response is a valid manifest with `name`, `short_name`, `icons` (192 + 512), `display: standalone`, `start_url: /app`, `theme_color`, `background_color`

#### Scenario: Service worker registers

- **WHEN** a user visits the site for the first time
- **THEN** the service worker is registered and caches the application shell

#### Scenario: Install action available in Meg

- **WHEN** the browser fires `beforeinstallprompt` and the user later visits `/app/meg`
- **THEN** an "Installer som app" button is shown
- **AND** clicking it triggers the saved install prompt

#### Scenario: Offline shell loads

- **WHEN** a user is offline and navigates to a previously visited `/app/*` route
- **THEN** the shell renders from cache and a top banner displays "Du er offline — endringer lagres ikke"

### Requirement: Route protection

All `/app/*` routes SHALL require an authenticated session. Unauthenticated requests SHALL redirect to `/logg-inn` with a `?next=` parameter capturing the intended destination.

#### Scenario: Unauthenticated visit to protected route

- **WHEN** an unauthenticated user visits `/app/vekter`
- **THEN** the user is redirected to `/logg-inn?next=%2Fapp%2Fvekter`

#### Scenario: Post-login redirect

- **WHEN** a user logs in via `/logg-inn?next=%2Fapp%2Fvekter`
- **THEN** after authentication they are routed to `/app/vekter`

#### Scenario: Authenticated user keeps access

- **WHEN** an authenticated user visits any `/app/*` route
- **THEN** the page renders without redirect

### Requirement: Mobile-first responsive layout

All UI components SHALL be designed for mobile (width ≥ 320px) first and SHALL scale to desktop with a single responsive layout (same component tree, Tailwind `md:` breakpoint at 768px). Touch targets SHALL be ≥ 44×44 CSS pixels and no interaction SHALL be hover-dependent.

#### Scenario: Touch target audit

- **WHEN** any interactive element is rendered (button, nav item, chip)
- **THEN** its rendered hit area is ≥ 44×44 CSS pixels

#### Scenario: No hover-only interaction

- **WHEN** a user with a touchscreen taps any control
- **THEN** the same outcome occurs as on desktop hover-equivalent
- **AND** no functionality is gated behind `:hover`

#### Scenario: Desktop layout uses single column with max width

- **WHEN** the viewport is ≥ 768px wide
- **THEN** the main content area is centered with a `max-width` of approximately 768–960px

### Requirement: Design tokens sourced from Stitch

The application SHALL expose semantic design tokens — color (surface, fg, primary, accent, status colors), spacing scale, type scale — as CSS variables, and Tailwind config SHALL map utility classes to those variables. Token values SHALL be extracted from the Stitch design "Boligscore v2".

#### Scenario: Semantic color tokens exist

- **WHEN** a developer uses the class `bg-surface` or `text-fg`
- **THEN** the value resolves to a CSS variable that switches between light and dark theme

#### Scenario: Tokens documented

- **WHEN** a contributor reads `docs/design-tokens.md`
- **THEN** every token is listed with its value in both themes and the Stitch screen it was sourced from

### Requirement: Accessibility floor

The shell SHALL meet WCAG AA contrast in both themes, render visible focus rings on all interactive elements when navigated by keyboard, and never communicate status by color alone (icon + text + color).

#### Scenario: Contrast meets AA

- **WHEN** any text or interactive element is rendered in light or dark theme
- **THEN** the contrast ratio against its background is ≥ 4.5:1 for body text and ≥ 3:1 for large text and UI components

#### Scenario: Focus ring visible on keyboard navigation

- **WHEN** a user tabs to an interactive element
- **THEN** the element shows a visible focus indicator (outline or ring) distinguishable from the surrounding UI

#### Scenario: Status uses icon + text not just color

- **WHEN** any status badge is rendered (e.g. property status)
- **THEN** it includes an icon AND a text label AND a color — never just color
