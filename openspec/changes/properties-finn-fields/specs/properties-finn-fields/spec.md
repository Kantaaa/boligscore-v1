## ADDED Requirements

### Requirement: Schema gains budget and metadata fields

The `properties` table SHALL gain eight nullable columns: `felleskostnader` (int, NOK/month), `omkostninger` (int, NOK), `fellesgjeld` (int, NOK), `tomteareal` (int, m²), `etasje` (text, ≤ 20 chars), `energimerke_letter` (char(1), values `A`..`G` only when not null), `energimerke_color` (text, one of `dark_green`/`light_green`/`yellow`/`orange`/`red` when not null), and `finnkode` (int). Existing rows SHALL remain valid with all eight columns null.

#### Scenario: New columns nullable

- **WHEN** the migration applies against a database that already has property rows
- **THEN** every existing row continues to satisfy the table constraints
- **AND** all eight new columns are null on every existing row

#### Scenario: CHECK on energimerke_letter

- **WHEN** an insert or update sets `energimerke_letter` to any value other than null or one of `A`..`G`
- **THEN** the database SHALL reject the write

#### Scenario: CHECK on energimerke_color

- **WHEN** an insert or update sets `energimerke_color` to any value other than null or one of `dark_green`/`light_green`/`yellow`/`orange`/`red`
- **THEN** the database SHALL reject the write

### Requirement: Per-household uniqueness on finnkode

The `properties` table SHALL enforce a partial unique index on `(household_id, finnkode)` where `finnkode IS NOT NULL`. The same listing SHALL NOT be added twice to the same household.

#### Scenario: Duplicate finnkode in same household rejected

- **WHEN** a household already has a property with `finnkode = 123456789`
- **AND** a member tries to insert another property with the same `finnkode` and same `household_id`
- **THEN** the database SHALL reject the insert with a unique-violation error

#### Scenario: Same finnkode allowed across households

- **WHEN** household A has a property with `finnkode = 123456789`
- **AND** household B inserts a property with `finnkode = 123456789`
- **THEN** the insert succeeds — uniqueness is per-household

#### Scenario: Multiple null finnkode allowed in same household

- **WHEN** a household has 5 manually-entered properties with `finnkode = NULL`
- **THEN** all 5 rows coexist — the partial-WHERE excludes nulls from the unique constraint

### Requirement: Pre-parse dedupe check in import flow

`POST /api/properties/parse-finn` SHALL look up the user's household for an existing property whose `finn_link` matches the input URL or whose `finnkode` matches the URL's extracted finnkode, before fetching FINN. If a match is found, the response SHALL be `{ ok: false, error: "Du har allerede denne boligen", existing_id: <uuid> }` with status 409, and no outbound fetch SHALL occur.

#### Scenario: Existing property by finnkode

- **WHEN** the user POSTs a FINN URL whose finnkode matches an existing property in their household
- **THEN** the response is 409 with `{ ok: false, error: "Du har allerede denne boligen", existing_id }`
- **AND** no outbound fetch to FINN was made

#### Scenario: Existing property by exact finn_link

- **WHEN** the user POSTs a FINN URL whose `finn_link` is byte-exact-equal to an existing property's `finn_link` in their household
- **THEN** the response is 409 with `{ ok: false, error: "Du har allerede denne boligen", existing_id }`

#### Scenario: No existing match — proceeds to fetch

- **WHEN** the URL has no matching `finnkode` and no matching `finn_link` in the household
- **THEN** the route handler proceeds to fetch and parse as before

### Requirement: Parser populates new fields

`parseFinnHtml` SHALL attempt to extract `felleskostnader`, `omkostninger`, `fellesgjeld`, `tomteareal`, `etasje`, `energimerke_letter`, `energimerke_color`, and `finnkode`, and SHALL include each successfully populated key in `extracted_fields`. Failure to extract any one field SHALL NOT prevent extraction of the others.

#### Scenario: Full extraction

- **WHEN** the parser is given a FINN HTML fixture that contains all key labels and an energimerke badge
- **THEN** the returned `ParsedListing` populates all eight new fields
- **AND** `extracted_fields` includes all eight new keys

#### Scenario: Partial extraction — only costs

- **WHEN** the parser sees `Felleskost/mnd.`, `Omkostninger`, and `Fellesgjeld` rows but no energimerke widget
- **THEN** the three cost fields are populated
- **AND** `energimerke_letter` and `energimerke_color` are null
- **AND** `extracted_fields` includes the three populated keys but not the energi keys

#### Scenario: finnkode extracted from URL when label missing

- **WHEN** the parser sees a FINN URL containing `?finnkode=123456789` and no `finnkode` row in the page
- **THEN** `finnkode` is populated from the URL parameter

#### Scenario: etasje preserved as verbatim text

- **WHEN** the FINN page renders `Etasje: U. etasje`
- **THEN** `etasje` equals exactly `"U. etasje"` (no parsing into int)

### Requirement: Manual entry supports new fields

`NyBoligForm` SHALL render input controls for all eight new fields. Owner and member SHALL be able to fill, edit, and submit these fields. Viewers SHALL see the controls disabled or absent. All eight fields SHALL be optional — submitting with all eight empty SHALL succeed (subject to the existing required-fields contract for `address`, etc.).

#### Scenario: Owner fills cost fields

- **WHEN** an `owner` enters values for `felleskostnader`, `omkostninger`, and `fellesgjeld` and submits
- **THEN** the new property row contains those three values, and the other five new fields are null

#### Scenario: All new fields optional

- **WHEN** an `owner` submits the form filling only the previously-required fields and leaving all eight new fields empty
- **THEN** the insert succeeds and the row has null in all eight new columns

#### Scenario: energimerke as paired dropdowns

- **WHEN** the user picks a letter `A`..`G` for energimerke
- **THEN** the form renders a paired color dropdown with values `dark_green`/`light_green`/`yellow`/`orange`/`red`
- **AND** picking a letter without a color (or vice versa) is allowed — both are independently nullable

### Requirement: Oversikt renders Kostnader card when any field is set

The Oversikt tab SHALL render a Kostnader card containing felleskostnader, omkostninger, fellesgjeld, energimerke (letter + color), tomteareal, and etasje, in that order. Lines whose underlying field is null SHALL NOT render. The card itself SHALL NOT render when all six underlying fields are null.

#### Scenario: All fields filled

- **WHEN** a property has values for all six display fields
- **THEN** the Kostnader card renders all six lines in the spec order

#### Scenario: Only felleskostnader filled

- **WHEN** a property has only `felleskostnader` set
- **THEN** the Kostnader card renders one line for felleskostnader and no other lines

#### Scenario: All fields null — card hidden

- **WHEN** a property has null in all six display fields
- **THEN** the Kostnader card does not render at all (not even a heading)

### Requirement: PropertyCard shows felleskostnader when set

`PropertyCard` SHALL render a felleskostnader line under the price line when `felleskostnader` is not null. The line SHALL show `+ kr {value} / mnd` formatted with Norwegian thousand separators. When `felleskostnader` is null, no line SHALL render and the card height SHALL be unchanged from the previous behavior.

#### Scenario: Card with felleskostnader

- **WHEN** a property has `felleskostnader = 4250`
- **THEN** the card renders `+ kr 4 250 / mnd` immediately under the price

#### Scenario: Card without felleskostnader

- **WHEN** a property has `felleskostnader = null`
- **THEN** no felleskostnader line is rendered
- **AND** the card matches the pre-change visual layout
