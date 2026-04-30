## ADDED Requirements

### Requirement: Criteria and section seed data

The system SHALL provide a seeded list of 22 scoring criteria grouped into 3 sections: `Bolig innvendig` (7 criteria), `Beliggenhet & område` (4 criteria), `Helhet` (2 criteria), plus a virtual `Fakta` section (3 derived facts that are NOT scored: pris/kvm, størrelse, alder). Wait — the brief lists 22 scored criteria; the section count totals to 13 explicit + 9 implicit. The seed list is authoritative; see tasks for the exact 22.

#### Scenario: Criteria available

- **WHEN** the database is migrated to v2
- **THEN** `criterion_sections` contains the three scored sections
- **AND** `criteria` contains exactly 22 rows linked to those sections

#### Scenario: Criteria are read-only via API

- **WHEN** any user attempts to insert/update/delete a `criteria` row
- **THEN** the operation is denied (RLS denies non-service-role writes)

### Requirement: Felles weights

The system SHALL maintain a felles weight per (household × criterion). Every household SHALL have exactly 22 felles weight rows (one per criterion). All weights SHALL be integers in `[0, 10]`. Default value at seeding is `5`.

#### Scenario: Household creation seeds felles weights

- **WHEN** a new household is created
- **THEN** the after-insert trigger inserts 22 rows into `household_weights` (one per criterion) with `weight = 5`

#### Scenario: Owner edits felles weight

- **WHEN** an `owner` updates a `household_weights` row to `weight = 8`
- **THEN** the update succeeds and `updated_at` and `updated_by` are recorded

#### Scenario: Member edits felles weight

- **WHEN** a `member` updates a `household_weights` row
- **THEN** the update succeeds

#### Scenario: Viewer cannot edit felles weight

- **WHEN** a `viewer` attempts to update `household_weights`
- **THEN** RLS denies the operation

#### Scenario: Weight out of range rejected

- **WHEN** any user attempts to set `weight = 11` or `weight = -1`
- **THEN** the database CHECK constraint rejects the update

### Requirement: Personal weights

The system SHALL maintain a personal weight per (user × household × criterion). Every member of a household SHALL have exactly 22 personal weight rows for that household (one per criterion). All weights SHALL be integers in `[0, 10]`. Default value at seeding is `5`.

#### Scenario: Member join seeds personal weights

- **WHEN** a user is added to a household (via invitation accept or owner-add)
- **THEN** the after-insert trigger inserts 22 rows into `user_weights` for that user × household with `weight = 5`

#### Scenario: User edits own personal weight

- **WHEN** any role (`owner`/`member`/`viewer`) updates one of their own `user_weights` rows... wait — viewer is read-only EVERYWHERE. Re-state:

#### Scenario: Owner/member edits own personal weight

- **WHEN** an `owner` or `member` updates their own `user_weights` row
- **THEN** the update succeeds

#### Scenario: Viewer cannot edit personal weight

- **WHEN** a `viewer` attempts to update their own `user_weights` (or anyone else's)
- **THEN** RLS denies the operation
- **AND** the UI does not render editable sliders for viewers

#### Scenario: User cannot edit another user's personal weights

- **WHEN** any user attempts to update a `user_weights` row where `user_id != auth.uid()`
- **THEN** RLS denies the operation

#### Scenario: Member leaving household deletes their personal weights

- **WHEN** a `household_members` row is deleted
- **THEN** all `user_weights` rows for that user × household are deleted via FK cascade

### Requirement: Weight reset

Every member with `owner` or `member` role SHALL be able to reset their personal weights to `5` across all 22 criteria in a single action. `owner` SHALL be able to reset the household's felles weights to `5` (members can reset felles weights too — D6 of design.md allows; restricting to owner is over-tight).

#### Scenario: Personal reset

- **WHEN** an `owner` or `member` confirms `Tilbakestill mine vekter til 5`
- **THEN** all 22 of their `user_weights` rows in the active household are updated to `weight = 5`

#### Scenario: Felles reset

- **WHEN** an `owner` or `member` confirms `Tilbakestill felles vekter til 5`
- **THEN** all 22 of `household_weights` rows for the active household are updated to `weight = 5`

#### Scenario: Viewer cannot reset

- **WHEN** a `viewer` attempts either reset
- **THEN** RLS denies the operation and the UI hides the reset buttons

### Requirement: Vekter page UI

The system SHALL render `/app/vekter` with a segmented control (`Felles vekter` / `Mine personlige vekter`). Each view SHALL group the 22 criteria by their three sections and render a labeled slider 0–10 per criterion.

#### Scenario: Default view is felles

- **WHEN** an authenticated user with an active household navigates to `/app/vekter`
- **THEN** the page renders with `Felles vekter` selected by default

#### Scenario: Switch to personal

- **WHEN** the user taps `Mine personlige vekter` on the segmented control
- **THEN** the personal weights view renders
- **AND** each row shows the felles weight as a small reference label (e.g. `Felles: 7`)

#### Scenario: Slider edits autosave

- **WHEN** the user releases a slider after dragging
- **THEN** the new value is sent to the server via the corresponding update action
- **AND** a subtle "lagret" indicator appears briefly

#### Scenario: Sections render with headers

- **WHEN** the page is rendered
- **THEN** each section's heading + description appears above its 22-criteria sliders, in the canonical section order

#### Scenario: Viewer sees read-only sliders

- **WHEN** a `viewer` visits `/app/vekter`
- **THEN** sliders render in disabled state with no thumb-drag interaction
- **AND** reset buttons are hidden

### Requirement: Weight retrieval API

The system SHALL provide a function `getHouseholdWeights(household_id)` returning all 22 felles weights and a function `getUserWeights(household_id, user_id)` returning all 22 personal weights for the given user. Both SHALL respect RLS.

#### Scenario: Get felles weights as member

- **WHEN** a household member calls `getHouseholdWeights`
- **THEN** all 22 rows are returned

#### Scenario: Get felles weights as non-member

- **WHEN** a non-member calls `getHouseholdWeights` for a household they don't belong to
- **THEN** no rows are returned (RLS filters)

#### Scenario: Get my own personal weights

- **WHEN** a member calls `getUserWeights` for their own `user_id`
- **THEN** all 22 rows are returned

#### Scenario: Cannot read other user's personal weights

- **WHEN** a member calls `getUserWeights` for another user
- **THEN** no rows are returned (RLS filters at SELECT time)

### Requirement: All-zero weights graceful handling

When a weight set sums to `0`, the system SHALL display "Ikke nok data" (or equivalent) where a totalscore would normally be shown, instead of dividing by zero.

#### Scenario: Felles total with all-zero felles weights

- **WHEN** a household has all `household_weights.weight = 0`
- **THEN** any UI that displays `felles_total` shows "Ikke nok data" in place of a number

#### Scenario: Din total with all-zero personal weights

- **WHEN** a user has all their `user_weights.weight = 0` for the active household
- **THEN** any UI that displays `din_total` shows "Ikke nok data" in place of a number
