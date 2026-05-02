## ADDED Requirements

### Requirement: FINN URL parsing

The system SHALL accept a FINN listing URL and return as many extracted property fields as it can. Missing fields SHALL be reported as missing — they SHALL NOT cause the entire parse to fail.

#### Scenario: Successful parse

- **WHEN** an authenticated user submits a valid FINN URL via `POST /api/properties/parse-finn`
- **THEN** the response is `{ ok: true, data: { address, price, bra, year_built, property_type, image_url, finn_link, extracted_fields: [...] } }`
- **AND** `extracted_fields` lists which keys were populated (omitted keys are null)

#### Scenario: Partial parse

- **WHEN** the FINN page exposes only some of the target fields
- **THEN** the response is `{ ok: true, data: ... }` with the available fields populated and the rest null
- **AND** `extracted_fields` reflects only what was found

#### Scenario: Network failure

- **WHEN** the upstream FINN fetch fails (timeout, 4xx, 5xx, DNS)
- **THEN** the response is `{ ok: false, error: <user-facing Norwegian message> }`
- **AND** the manual form remains usable (the UI does NOT block)

### Requirement: URL allowlist

The system SHALL only fetch URLs whose hostname is exactly `www.finn.no` or `finn.no`. Any other hostname SHALL be rejected without making a network request.

#### Scenario: Non-FINN URL rejected

- **WHEN** a user POSTs `{ url: "http://example.com/anything" }`
- **THEN** the response is `{ ok: false, error: "URL må være en FINN-annonse" }` with status 400
- **AND** no outbound HTTP request is made

#### Scenario: Malformed URL rejected

- **WHEN** a user POSTs `{ url: "not a url" }`
- **THEN** the response is `{ ok: false, error: <validation message> }` with status 400

#### Scenario: HTTP scheme accepted

- **WHEN** a user POSTs `{ url: "https://www.finn.no/..." }` or `{ url: "https://finn.no/..." }`
- **THEN** the parser proceeds

### Requirement: Authentication required

The parser endpoint SHALL require an authenticated Supabase session. Unauthenticated requests SHALL receive 401.

#### Scenario: Unauthenticated request denied

- **WHEN** a request to `/api/properties/parse-finn` carries no valid session cookie
- **THEN** the response is `{ ok: false, error: "Du må være logget inn" }` with status 401
- **AND** no outbound fetch is performed

### Requirement: Resource limits

The parser SHALL enforce a 5-second timeout on the upstream fetch and a 200 KB cap on the response body. Exceeding either SHALL produce a controlled error.

#### Scenario: Timeout

- **WHEN** FINN takes longer than 5 seconds to respond
- **THEN** the parser aborts the fetch and returns `{ ok: false, error: "FINN svarer ikke — prøv igjen senere eller fyll inn manuelt" }`

#### Scenario: Oversized response

- **WHEN** the response body exceeds 200 KB
- **THEN** the parser stops reading and returns `{ ok: false, error: <message> }`

### Requirement: NyBoligForm tab switcher

The system SHALL render two tabs above `NyBoligForm`: `Fra FINN-lenke` (default, focused) and `Manuelt`. The FINN tab SHALL contain a URL input and a "Hent fra FINN" button. On success, the parsed values SHALL prefill the manual form fields without auto-submitting.

#### Scenario: Default tab is FINN

- **WHEN** an `owner` or `member` navigates to `/app/bolig/ny`
- **THEN** the `Fra FINN-lenke` tab is active
- **AND** the URL input has focus

#### Scenario: Successful prefill

- **WHEN** the user submits a valid FINN URL and the parse succeeds with at least 3 fields
- **THEN** the form switches to the Manual tab with the parsed values populated
- **AND** a notice displays "Hentet N felter fra FINN — sjekk og rediger ved behov"

#### Scenario: Partial prefill

- **WHEN** the parse succeeds but only some fields were extracted
- **THEN** the form prefills the available fields and leaves the others blank
- **AND** the notice lists which fields were prefilled

#### Scenario: Parse failure falls back to manual

- **WHEN** the parser returns `{ ok: false }`
- **THEN** an inline error displays the Norwegian error message
- **AND** the form remains usable in the FINN tab (user can retry) or the user can switch to Manual

#### Scenario: Manual tab is unaffected

- **WHEN** the user starts on `Manuelt` and types in fields
- **AND** does not switch tabs
- **THEN** the form behaves exactly as before — no parser interaction, same submit flow

### Requirement: Parsed fields land on the property record

When the user reviews the prefilled form and submits, the resulting `properties` row SHALL store the parsed values that the user did not edit. The `finn_link` SHALL store the original FINN URL. The `image_url` (if extracted) SHALL be stored.

#### Scenario: Saving after a successful prefill

- **WHEN** the user prefills via FINN and submits without further edits
- **THEN** the inserted row contains the parsed `address`, `price`, `bra`, `year_built`, `property_type`, `finn_link` (= the input URL), and `image_url` (if extracted)

#### Scenario: User edits before saving

- **WHEN** the user prefills via FINN and changes a field before submitting
- **THEN** the inserted row contains the user's edited value, not the parsed one
