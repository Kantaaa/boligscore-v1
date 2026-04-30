## ADDED Requirements

### Requirement: Household creation

The system SHALL allow an authenticated user to create a household by providing a non-empty name. On creation, the creating user SHALL automatically become a member with role `owner`.

#### Scenario: Successful creation

- **WHEN** an authenticated user submits a household-create request with `name = "Ine & Kanta"`
- **THEN** a `households` row is inserted with `name = "Ine & Kanta"`, `created_by = <user-id>`, and `created_at = now()`
- **AND** a `household_members` row is inserted with `household_id = <new household>`, `user_id = <user-id>`, `role = 'owner'`, `joined_at = now()`
- **AND** the response returns the new household's id

#### Scenario: Empty name rejected

- **WHEN** an authenticated user submits a household-create request with `name = ""` or only whitespace
- **THEN** the system rejects the request with a validation error
- **AND** no `households` or `household_members` row is inserted

#### Scenario: Unauthenticated request rejected

- **WHEN** an unauthenticated request attempts to create a household
- **THEN** the system rejects with an auth error and no rows are inserted

### Requirement: Household membership roles

Every `household_members` row SHALL have exactly one of three roles: `owner`, `member`, or `viewer`. A household MAY have multiple owners. A user MAY belong to multiple households simultaneously.

#### Scenario: Allowed role values

- **WHEN** a `household_members` row is inserted with `role = 'owner' | 'member' | 'viewer'`
- **THEN** the insert succeeds

#### Scenario: Invalid role rejected

- **WHEN** a `household_members` row is inserted with `role = 'admin'` or any value outside the allowed set
- **THEN** the database CHECK constraint rejects the insert

#### Scenario: User can belong to multiple households

- **WHEN** user U is already a member of household A
- **AND** U accepts an invitation to household B
- **THEN** U is a member of both A and B
- **AND** queries scoped to A return only A's data

### Requirement: Role-based access control

Reads on tables with `household_id` SHALL be permitted to any role of a member of that household. Writes SHALL be restricted to `owner` and `member` only; `viewer` writes MUST be denied at the database (RLS) layer regardless of UI.

#### Scenario: Owner can write

- **WHEN** a user with `role = 'owner'` attempts to insert/update/delete a row in a household-scoped table for their household
- **THEN** the operation succeeds

#### Scenario: Member can write

- **WHEN** a user with `role = 'member'` attempts to insert/update/delete a row in a household-scoped table for their household
- **THEN** the operation succeeds

#### Scenario: Viewer write denied at RLS

- **WHEN** a user with `role = 'viewer'` attempts to insert/update/delete a row in a household-scoped table for their household
- **THEN** the database returns an RLS policy violation error
- **AND** no row is created/modified/removed

#### Scenario: Non-member read denied

- **WHEN** a user who is not a member of household H attempts to read a row in a household-scoped table where `household_id = H`
- **THEN** the database returns no rows

### Requirement: Household name and metadata management

An `owner` SHALL be able to update the household's `name`. The `created_by` field MUST be immutable after insert.

#### Scenario: Owner renames household

- **WHEN** an `owner` updates `households.name` to a non-empty value
- **THEN** the update succeeds

#### Scenario: Member cannot rename

- **WHEN** a `member` or `viewer` attempts to update `households.name`
- **THEN** the operation is denied by RLS

#### Scenario: created_by is immutable

- **WHEN** any user attempts to update `households.created_by`
- **THEN** the operation is denied (database trigger or column-level RLS)

### Requirement: Invitation creation

An `owner` or `member` SHALL be able to create an invitation that produces a unique token and an `expires_at` of 7 days from creation. The role granted on acceptance SHALL be configurable at invitation time and default to `member`.

#### Scenario: Owner creates an invitation with default role

- **WHEN** an `owner` creates an invitation for their household without specifying a role
- **THEN** a `household_invitations` row is inserted with a fresh UUID `token`, `expires_at = now() + interval '7 days'`, `accepted_by = null`, `role = 'member'`

#### Scenario: Inviter selects role explicitly

- **WHEN** an `owner` or `member` creates an invitation and selects role `viewer` (or `owner`)
- **THEN** the row is inserted with the selected role
- **AND** acceptance grants the invitee that role

#### Scenario: Member creates an invitation

- **WHEN** a `member` creates an invitation for their household
- **THEN** the row is inserted with default role `member` (or the explicitly selected role)

#### Scenario: Viewer cannot create invitation

- **WHEN** a `viewer` attempts to create an invitation
- **THEN** RLS denies the insert

#### Scenario: Copy-link is the only delivery mechanism in MVP

- **WHEN** an invitation is created
- **THEN** the system surfaces the link `${origin}/invitasjon/<token>` for the inviter to copy
- **AND** no email is sent (email-send is deferred to a follow-up change)

### Requirement: Invitation acceptance

A user SHALL be able to accept an invitation by visiting `/invitasjon/[token]` while authenticated. Acceptance SHALL be atomic and single-use — the row's `accepted_by` is set in a single update that fails if already accepted.

#### Scenario: Successful acceptance

- **WHEN** an authenticated user U visits `/invitasjon/<token>` for an invitation that is unexpired and unaccepted
- **AND** U confirms with the "Bli med" button
- **THEN** `household_invitations.accepted_by = U` is set
- **AND** a `household_members` row is inserted with `household_id`, `user_id = U`, `role = <invitation.role>`, `joined_at = now()`
- **AND** U is redirected to `/app` with the new household active

#### Scenario: Expired invitation

- **WHEN** an authenticated user visits `/invitasjon/<token>` for an invitation where `expires_at < now()`
- **THEN** the system displays "Denne lenken har utløpt. Be om en ny."
- **AND** no `household_members` row is created

#### Scenario: Already accepted invitation

- **WHEN** a user visits `/invitasjon/<token>` for an invitation where `accepted_by IS NOT NULL`
- **THEN** the system displays a message that the invitation has already been used
- **AND** no `household_members` row is created

#### Scenario: User already a member

- **WHEN** an authenticated user visits a valid `/invitasjon/<token>` for a household they are already a member of
- **THEN** the system displays "Du er allerede medlem av denne husholdningen"
- **AND** the invitation is **not** marked accepted (so the inviter can still use it for someone else)

#### Scenario: Unauthenticated user redirected

- **WHEN** an unauthenticated user visits `/invitasjon/<token>`
- **THEN** the system redirects to `/registrer` (or `/logg-inn`) with the invitation URL stored as the post-login destination
- **AND** after authentication the user is returned to the invitation acceptance screen

#### Scenario: Race — concurrent acceptance

- **WHEN** two users simultaneously attempt to accept the same invitation
- **THEN** at most one acceptance succeeds (atomic `UPDATE ... WHERE accepted_by IS NULL`)
- **AND** the other user receives the "already accepted" message

### Requirement: Membership management

An `owner` SHALL be able to remove members and change member roles (subject to the "must keep at least one owner" constraint). Members SHALL be able to leave the household themselves.

#### Scenario: Owner removes a member

- **WHEN** an `owner` removes a `member` or `viewer` from their household
- **THEN** the `household_members` row is deleted

#### Scenario: Owner changes a member's role

- **WHEN** an `owner` updates another member's `role` to one of the allowed values
- **THEN** the update succeeds

#### Scenario: Member leaves household

- **WHEN** a `member` or `viewer` deletes their own `household_members` row
- **THEN** the operation succeeds and they no longer have access

#### Scenario: Owner attempts to leave when sole owner

- **WHEN** an `owner` attempts to delete their own membership
- **AND** they are the only `owner` of the household
- **THEN** the operation is denied with the message "Du må først gjøre noen andre til eier før du kan forlate husholdningen"

#### Scenario: Owner leaves when other owners exist

- **WHEN** an `owner` deletes their own membership
- **AND** at least one other member has `role = 'owner'`
- **THEN** the operation succeeds

### Requirement: Household deletion

An `owner` SHALL be able to delete their household. Deletion SHALL cascade to remove all `household_members`, `household_invitations`, and any household-scoped data (`properties`, `property_scores`, `weights`, etc.) defined by other capabilities.

#### Scenario: Owner deletes household

- **WHEN** an `owner` deletes their household after typed-name confirmation
- **THEN** the `households` row is deleted
- **AND** all dependent rows in `household_members`, `household_invitations`, and household-scoped tables from other capabilities are deleted via foreign key cascade

#### Scenario: Member cannot delete household

- **WHEN** a `member` or `viewer` attempts to delete the household
- **THEN** RLS denies the operation

### Requirement: Active household selection

The client SHALL maintain an "active household" id and pass it explicitly with each scoped query. The active household SHALL be persisted in `localStorage`. On first login the most recently joined household SHALL be active.

#### Scenario: First login defaults to most recent membership

- **WHEN** a user logs in and `localStorage.activeHouseholdId` is not set
- **THEN** the client picks the household with the most recent `household_members.joined_at`

#### Scenario: User switches active household

- **WHEN** a user selects a different household from the switcher chip
- **THEN** `localStorage.activeHouseholdId` is updated to the selected id
- **AND** all subsequent scoped queries use the new id

#### Scenario: Active household no longer accessible

- **WHEN** a user attempts to use an `activeHouseholdId` they are no longer a member of (e.g. removed by an owner in another tab)
- **THEN** the next scoped query returns no rows
- **AND** the client falls back to the most recent remaining membership, or routes to onboarding if the user has zero memberships
