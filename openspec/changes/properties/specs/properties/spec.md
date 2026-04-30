## ADDED Requirements

### Requirement: Property creation

The system SHALL allow an `owner` or `member` of a household to create a property with a non-empty address. Other fields SHALL be optional. The creator's user id SHALL be recorded in `added_by`. Default status SHALL be `vurderer`.

#### Scenario: Successful manual creation

- **WHEN** an `owner` or `member` submits a `Ny bolig` form with address `"Storgata 1, 0182 Oslo"` and no status selected
- **THEN** a `properties` row is inserted with `household_id` (active household), `address`, `status_id = vurderer`, `added_by = caller`, `created_at = now()`

#### Scenario: Empty address rejected

- **WHEN** the form is submitted with an empty or whitespace-only address
- **THEN** an inline validation error displays and no row is inserted

#### Scenario: Viewer cannot create

- **WHEN** a `viewer` attempts to create a property (via UI or direct API)
- **THEN** RLS denies the insert and the UI shows "Du har ikke tilgang til å legge til boliger"

#### Scenario: Year built out of range rejected

- **WHEN** `year_built` is set to `1500` or `next year + 6`
- **THEN** the database CHECK constraint rejects the insert

### Requirement: Property update

The system SHALL allow `owner` and `member` roles to update any field of a property in their household. The `household_id`, `added_by`, and `created_at` fields SHALL be immutable.

#### Scenario: Member updates property fields

- **WHEN** a `member` updates the `price` and `status_id` of a property in their household
- **THEN** the update succeeds

#### Scenario: Viewer cannot update

- **WHEN** a `viewer` attempts to update a property
- **THEN** RLS denies the operation

#### Scenario: Immutable fields cannot be changed

- **WHEN** any user attempts to update `household_id`, `added_by`, or `created_at`
- **THEN** the operation is denied (RLS or trigger)

### Requirement: Property deletion

The system SHALL allow `owner` and `member` roles to delete a property after typed-keyword confirmation. Deletion SHALL cascade to all dependent rows (scores, felles-scores, notes) for that property.

#### Scenario: Successful deletion

- **WHEN** an `owner` or `member` deletes a property after typing the confirmation keyword
- **THEN** the `properties` row and all dependent rows are removed via FK cascade

#### Scenario: Viewer cannot delete

- **WHEN** a `viewer` attempts to delete a property
- **THEN** RLS denies the operation

### Requirement: Status workflow

The system SHALL maintain an extensible `property_statuses` lookup table seeded with seven defaults: `favoritt`, `vurderer`, `på visning`, `i budrunde`, `bud inne`, `kjøpt`, `ikke aktuell`. Households MAY add custom statuses. Global (built-in) statuses SHALL NOT be deletable or modifiable.

#### Scenario: Default statuses available

- **WHEN** a new household is created
- **THEN** all seven default statuses are immediately usable when creating a property (they are global rows visible to every household)

#### Scenario: Household adds custom status

- **WHEN** an `owner` adds a status `"Reservert"` for their household
- **THEN** the new status is available for properties in that household only

#### Scenario: Global status cannot be deleted

- **WHEN** any user attempts to delete a global status (one with `household_id IS NULL`)
- **THEN** RLS or a trigger denies the operation

#### Scenario: Status with references cannot be deleted

- **WHEN** a user tries to delete a custom status that is referenced by at least one property
- **THEN** the database FK with `ON DELETE RESTRICT` blocks the deletion
- **AND** the UI displays "Du må flytte boligene til en annen status før du sletter denne"

### Requirement: Property listing

The system SHALL display all properties in the active household on `/app`, with default sort by `felles_total DESC NULLS LAST`. Each card SHALL display: address, price summary, BRA, year built, status badge (icon + text + color), `added_by` attribution, the user's own total, and the felles total.

#### Scenario: Default list view

- **WHEN** an authenticated user with an active household visits `/app`
- **THEN** the list renders properties in the active household
- **AND** sorted by `felles_total DESC NULLS LAST`

#### Scenario: Card content

- **WHEN** the list renders a property
- **THEN** the card includes address, price/BRA/byggeår summary, status badge, "Lagt til av X", `Felles: 78 • Din: 76` (or `— ` if no scores yet)

#### Scenario: Other-household properties not visible

- **WHEN** a user has multiple households and the active household is A
- **THEN** properties belonging to household B are NOT in the list

### Requirement: Property sorting

The system SHALL allow sorting the property list by: `Felles total`, `Pris`, `Nyeste først` (created_at desc), `Din score`. The selected sort SHALL persist for the user (per active household) across sessions.

#### Scenario: Sort by price

- **WHEN** the user selects sort `Pris`
- **THEN** the list re-renders sorted by `price ASC NULLS LAST`

#### Scenario: Sort persists

- **WHEN** the user picks a non-default sort and reloads or returns later
- **THEN** the previously selected sort is applied (stored in `localStorage` keyed by `household_id`)

### Requirement: Property filtering

The system SHALL allow filtering by: status (multi-select), price range, BRA range, and område (text match against address). The filter UI SHALL render as a bottom sheet on mobile and a popover on desktop. Active filters SHALL be visible as removable chips above the list.

#### Scenario: Filter by status

- **WHEN** the user selects only `på visning` and `i budrunde` statuses
- **THEN** only properties with those statuses appear in the list

#### Scenario: Filter by price range

- **WHEN** the user sets price range to 4M-6M NOK
- **THEN** only properties with `price BETWEEN 4_000_000 AND 6_000_000` appear

#### Scenario: Filter chips

- **WHEN** any filter is active
- **THEN** an "active filter" chip appears above the list for each filter, each with a remove button

#### Scenario: Clear all filters

- **WHEN** the user clicks `Fjern filtre`
- **THEN** all filters are cleared and the full list re-renders

### Requirement: Property search

The system SHALL provide a text search field above the list that matches against `address` (case-insensitive substring). Search SHALL combine with active filters (intersection).

#### Scenario: Search match

- **WHEN** the user types `storgata` in the search field
- **THEN** the list shows only properties whose address contains `storgata` (case-insensitive)

#### Scenario: Search debounced

- **WHEN** the user is typing rapidly
- **THEN** the query fires after a brief debounce (~250ms idle), not on every keystroke

#### Scenario: No results

- **WHEN** the search yields zero matches
- **THEN** an empty-search state displays "Ingen boliger matcher søket" with a `Fjern søk` button

### Requirement: Property detail Oversikt tab

The system SHALL render the `Oversikt` tab at `/app/bolig/[id]/oversikt` showing: address, status (with badge + change action), price/BRA/year built/property type/floor/bedrooms/bathrooms, FINN-link (clickable, external), `added_by` attribution, created/updated timestamps.

#### Scenario: Oversikt content

- **WHEN** a user visits the Oversikt tab for a property
- **THEN** all fields above are rendered (with `—` placeholder for unset optional fields)

#### Scenario: Status change inline

- **WHEN** a user with role `owner` or `member` taps the status badge
- **THEN** a status picker opens with all available statuses (global + this household's custom)
- **AND** selecting a new status updates the property and the badge re-renders

#### Scenario: Viewer cannot change status

- **WHEN** a `viewer` taps the status badge
- **THEN** the picker does not open (or opens read-only)

### Requirement: Empty state

The system SHALL show an empty state on `/app` when the active household has zero properties. The empty state SHALL include an illustration, the heading "Ingen boliger ennå", supporting text, and a primary CTA `+ Legg til bolig`.

#### Scenario: Zero properties

- **WHEN** a user with an active household containing no properties visits `/app`
- **THEN** the empty state renders instead of an empty list

#### Scenario: Filtered to zero

- **WHEN** the household has properties but the active filters/search match none
- **THEN** a different state renders ("Ingen boliger matcher filtrene") with a `Fjern filtre` action — this is distinct from the "no properties" empty state

### Requirement: Floating action button

The system SHALL render a floating action button on `/app` for `+ Ny bolig` that is reachable with one thumb on mobile (anchored above the bottom nav, lower-right corner).

#### Scenario: FAB visible on list

- **WHEN** an `owner` or `member` views `/app`
- **THEN** the FAB is rendered

#### Scenario: FAB hidden for viewer

- **WHEN** a `viewer` views `/app`
- **THEN** the FAB is hidden (consistent with role permissions)

#### Scenario: FAB navigates to create

- **WHEN** the FAB is tapped
- **THEN** the user is routed to `/app/bolig/ny`
