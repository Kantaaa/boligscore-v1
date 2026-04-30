## ADDED Requirements

### Requirement: Public landing page

The system SHALL render a public landing page at `/` that requires no authentication. The page SHALL contain a headline, supporting text, a primary CTA labeled "Registrer", and a secondary CTA labeled "Logg inn".

#### Scenario: Anonymous visit to landing

- **WHEN** an unauthenticated user visits `/`
- **THEN** the landing page renders without redirect
- **AND** displays headline `Score boliger sammen. Bli enige raskere.`, primary CTA `Registrer`, secondary CTA `Logg inn`

#### Scenario: Authenticated visit to landing

- **WHEN** an authenticated user visits `/`
- **THEN** the landing page still renders (it is not auto-redirecting), with the option for the user to continue to `/app` via a header link or by clicking either CTA

### Requirement: Email/password registration

The system SHALL allow new users to register with an email and password via Supabase Auth. After successful registration, the user SHALL be routed to the post-auth destination — `next` param if same-origin and present, otherwise `/app/onboarding`.

#### Scenario: Successful registration

- **WHEN** a new user submits valid email + password (≥ 8 chars) on `/registrer`
- **THEN** Supabase creates an account
- **AND** the user is signed in (in dev) or shown a "kontroller e-post" notice (in prod, awaiting confirmation)
- **AND** in dev, the user is routed to `/app/onboarding`

#### Scenario: Registration with invalid email

- **WHEN** a user submits a malformed email
- **THEN** an inline validation error displays and no Supabase request is made

#### Scenario: Registration with weak password

- **WHEN** a user submits a password shorter than 8 characters
- **THEN** an inline validation error displays and no Supabase request is made

#### Scenario: Email already registered

- **WHEN** a user submits an email that already has an account
- **THEN** Supabase returns an error and the form displays "En konto med denne e-posten finnes allerede. Logg inn i stedet."

#### Scenario: Registration with `next` param

- **WHEN** a user registers via `/registrer?next=/invitasjon/abc123`
- **AND** the registration succeeds (and email confirmation is satisfied if in prod)
- **THEN** the user is routed to `/invitasjon/abc123`

### Requirement: Email/password login

The system SHALL allow existing users to log in with email + password via Supabase Auth.

#### Scenario: Successful login

- **WHEN** a user submits valid credentials on `/logg-inn`
- **THEN** Supabase creates a session
- **AND** the user is routed to the `next` param destination (if same-origin) or `/app`

#### Scenario: Wrong password

- **WHEN** a user submits an email that exists but the wrong password
- **THEN** the form displays "Feil e-post eller passord."

#### Scenario: Unconfirmed email (prod only)

- **WHEN** a user submits credentials but their email is not yet confirmed
- **THEN** the form displays "Kontroller e-post — vi har sendt en bekreftelseslenke"
- **AND** offers a "send på nytt" action

### Requirement: Magic link authentication (alternate)

The system SHALL offer magic-link login as an alternative on both `/registrer` and `/logg-inn`. The user enters their email; a one-time-link is sent via Supabase email; clicking it logs them in.

#### Scenario: Magic link request

- **WHEN** a user enters their email and submits the magic-link form
- **THEN** Supabase sends a magic-link email
- **AND** the page displays "Sjekk e-posten din for å logge inn."

#### Scenario: Magic link in dev

- **WHEN** a magic link is sent in dev
- **THEN** the email is captured by Mailpit at `http://localhost:54324`
- **AND** clicking the link in Mailpit signs the user in and routes them per the `next` param or to `/app`

### Requirement: First-run onboarding

After registration (or first login if no household exists), the system SHALL route the user to `/app/onboarding`. The onboarding page SHALL ask for a household name and create the household on submit. After creation, the user SHALL be offered a copyable invitation link, with a `Hopp over` option.

#### Scenario: First-run onboarding redirect

- **WHEN** an authenticated user with zero households visits any `/app/*` route
- **THEN** they are redirected to `/app/onboarding`

#### Scenario: Create household

- **WHEN** the user submits a household name on `/app/onboarding`
- **THEN** a household is created (per `households` capability) and the user is its owner
- **AND** the page advances to the invitation-link step

#### Scenario: Skip invitation

- **WHEN** the user clicks `Hopp over — legg til senere` on the invitation step
- **THEN** they are routed to `/app` (with empty property list)

#### Scenario: Copy invitation link

- **WHEN** the user clicks `Kopier invitasjonslenke`
- **THEN** the invitation URL is written to the clipboard
- **AND** a confirmation toast displays "Lenke kopiert"

#### Scenario: Onboarding only runs once

- **WHEN** an authenticated user already in at least one household visits `/app/onboarding`
- **THEN** they are redirected to `/app` (they can create more households via the switcher's "Opprett ny husholdning" entry)

### Requirement: Invitation acceptance entry point for unauthenticated users

The system SHALL allow `/invitasjon/[token]` to be visited by unauthenticated users. When unauthenticated, the system SHALL redirect to `/registrer?next=/invitasjon/[token]` (or to `/logg-inn?next=...` if the user clicks the login link).

#### Scenario: Unauthenticated invitation visit

- **WHEN** an unauthenticated user visits `/invitasjon/abc123`
- **THEN** they are redirected to `/registrer?next=%2Finvitasjon%2Fabc123`

#### Scenario: Authenticated invitation visit

- **WHEN** an authenticated user visits `/invitasjon/abc123`
- **THEN** the invitation acceptance UI renders (delegated to `households` capability)

### Requirement: Logout

The system SHALL expose a logout action only on `/app/meg`. Logout SHALL terminate the Supabase session and redirect to `/`.

#### Scenario: Logout from Meg

- **WHEN** an authenticated user clicks "Logg ut" on `/app/meg`
- **THEN** the Supabase session is terminated
- **AND** the user is redirected to `/`
- **AND** subsequent visits to `/app/*` redirect them to `/logg-inn`

#### Scenario: No logout in header or nav

- **WHEN** a user inspects the header, household switcher, or bottom nav
- **THEN** no logout action is present anywhere except on `/app/meg`

### Requirement: Dev test bypass route

The system SHALL provide `/dev/login` only when `NEXT_PUBLIC_DEV_LOGIN_ENABLED === '1'`. The route SHALL sign in a seeded test user (`alice@test.local` or `bob@test.local`, password `test1234`) selected via a query param `?as=alice|bob` and redirect to `/app`.

#### Scenario: Dev login enabled

- **WHEN** `NEXT_PUBLIC_DEV_LOGIN_ENABLED=1` and a request is made to `/dev/login?as=alice`
- **THEN** the user is signed in as `alice@test.local` and redirected to `/app`

#### Scenario: Dev login disabled (prod build)

- **WHEN** the production build is deployed (no `NEXT_PUBLIC_DEV_LOGIN_ENABLED` or set to `0`)
- **THEN** any request to `/dev/login` returns 404

#### Scenario: Build-time prod guard

- **WHEN** `NEXT_PUBLIC_DEV_LOGIN_ENABLED=1` is set during a prod build (`VERCEL_ENV=production`)
- **THEN** the build fails with an error preventing deploy

### Requirement: Open-redirect protection on `next` param

The system SHALL validate that the `next` query parameter is a same-origin path before redirecting to it. Off-origin or absolute external URLs SHALL be ignored, and the user SHALL be sent to `/app` instead.

#### Scenario: Same-origin `next` accepted

- **WHEN** a user logs in via `/logg-inn?next=%2Fapp%2Fvekter`
- **THEN** they are redirected to `/app/vekter`

#### Scenario: External `next` rejected

- **WHEN** a user logs in via `/logg-inn?next=https%3A%2F%2Fevil.com%2Fphish`
- **THEN** the external URL is ignored and the user is redirected to `/app`

#### Scenario: Malformed `next` rejected

- **WHEN** the `next` param is not a valid URL or path
- **THEN** the param is ignored and the user is redirected to `/app`
