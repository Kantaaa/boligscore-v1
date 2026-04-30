## ADDED Requirements

### Requirement: Per-user score storage

The system SHALL store each score as `(property_id, user_id, criterion_id, score)` where `score` is an integer in `[0, 10]`. The composite `(property_id, user_id, criterion_id)` SHALL be the primary key — there is exactly one score per user per criterion per property.

#### Scenario: Insert a new score

- **WHEN** a member upserts a score (8) for a property × criterion they haven't scored before
- **THEN** a new `property_scores` row is inserted with `updated_at = now()`

#### Scenario: Update an existing score

- **WHEN** a member upserts a score (7) for a property × criterion they have already scored (was 8)
- **THEN** the existing row's `score` is updated to 7 and `updated_at = now()`

#### Scenario: Score out of range rejected

- **WHEN** a user attempts to set `score = 11` or `score = -1`
- **THEN** the database CHECK constraint rejects the operation

#### Scenario: Cannot score on behalf of another user

- **WHEN** a user attempts to insert a `property_scores` row with `user_id != auth.uid()`
- **THEN** RLS denies the operation

#### Scenario: Viewer cannot score

- **WHEN** a `viewer` attempts to upsert a score
- **THEN** RLS denies the operation

#### Scenario: Non-member cannot score

- **WHEN** a user not a member of the property's household attempts to upsert a score
- **THEN** RLS denies the operation (the property is not in their household)

### Requirement: Score change history

The system SHALL automatically record every change to `property_scores` in `property_score_history` via an `AFTER INSERT OR UPDATE` trigger. History rows SHALL NOT be created for no-op updates (where the score didn't actually change).

#### Scenario: Insert produces history row

- **WHEN** a new score row is inserted (score 8)
- **THEN** a history row is written with `old_score = NULL`, `new_score = 8`, `changed_at = now()`

#### Scenario: Update produces history row

- **WHEN** an existing score row is updated from 8 to 7
- **THEN** a history row is written with `old_score = 8`, `new_score = 7`, `changed_at = now()`

#### Scenario: No-op update produces no history

- **WHEN** an UPDATE statement runs but the score value did not actually change
- **THEN** no history row is written

#### Scenario: History readable only by self

- **WHEN** a user reads `property_score_history` for their own user_id in their household
- **THEN** their history rows are returned

#### Scenario: History not readable by other users

- **WHEN** a user attempts to read another user's score history
- **THEN** RLS returns no rows

### Requirement: Min vurdering tab UI

The system SHALL render the `Min vurdering` tab at `/app/bolig/[id]/min-vurdering` with: a counter ("X av 22 kriterier scoret"), three scored sections grouped by `criterion_section`, a chip-rad 0–10 per criterion, and a section-notes textarea per section.

#### Scenario: Tab renders with counter

- **WHEN** an owner/member opens `Min vurdering` for a property they have partially scored
- **THEN** the counter shows the count of their scored criteria (e.g. "13 av 22")

#### Scenario: Chip-rad selection

- **WHEN** the user taps a chip (e.g. 7) on a criterion
- **THEN** the chip fills with the primary color
- **AND** the score is upserted to the database immediately (optimistic UI)
- **AND** the counter increments if this was a previously unscored criterion

#### Scenario: Re-score same criterion

- **WHEN** the user taps a different chip on a criterion that was already scored
- **THEN** the previous chip un-fills, the new one fills
- **AND** the score is updated; counter is unchanged

#### Scenario: Unscored criterion display

- **WHEN** a criterion has no score for the current user
- **THEN** the row shows all 11 chips outlined (no fill) and a small "— ikke scoret" label

#### Scenario: Server save failure rolls back UI

- **WHEN** the optimistic save returns an error
- **THEN** the chip state reverts to its previous value
- **AND** a toast displays "Kunne ikke lagre — prøv igjen"

#### Scenario: Viewer cannot score

- **WHEN** a `viewer` opens `Min vurdering`
- **THEN** chips render but are disabled (no tap interaction)
- **AND** the section-notes textareas are read-only

### Requirement: Section notes

The system SHALL provide one notes textarea per section (`Bolig innvendig`, `Beliggenhet & område`, `Helhet`) — one row per `(property_id, user_id, section_id)`. Notes default to `visibility = 'private'`. Notes SHALL autosave on blur and after a 1-second idle while typing.

#### Scenario: Save note

- **WHEN** a member types in the section notes textarea and pauses for 1 second
- **THEN** the note is upserted to `property_section_notes`
- **AND** an indicator shows "lagrer..." then "lagret"

#### Scenario: Save on blur

- **WHEN** a member types in the textarea and clicks outside (blur)
- **THEN** the note is upserted immediately

#### Scenario: Notes are private by default

- **WHEN** a member writes a note for property P, section S
- **THEN** the row is inserted with `visibility = 'private'`
- **AND** the partner's `Min vurdering` tab does NOT show the note

#### Scenario: Read own notes

- **WHEN** a member reads notes for their own user × property × section
- **THEN** the note body is returned

#### Scenario: Cannot read partner's private notes

- **WHEN** a member queries notes where `user_id != auth.uid()` AND `visibility = 'private'`
- **THEN** RLS returns no rows

### Requirement: Fakta section presentation

The system SHALL render a `Fakta` section above the scored sections on the `Min vurdering` tab showing read-only values: `Pris/kvm`, `Størrelse (BRA)`, `Alder`. These values SHALL be computed on the fly from property data; missing inputs render as `—`.

#### Scenario: All inputs available

- **WHEN** a property has `price = 5_000_000`, `bra = 70`, `year_built = 2010`
- **THEN** the Fakta section shows `Pris/kvm: 71 429 kr`, `Størrelse: 70 m²`, `Alder: 16 år` (current year 2026)

#### Scenario: Missing price → derived value masked

- **WHEN** a property has `price` null
- **THEN** `Pris/kvm` is rendered as `—`

#### Scenario: Fakta values are not editable

- **WHEN** a user views the Fakta section
- **THEN** no chip-rad or input is shown — only the computed values

### Requirement: Score reading

The system SHALL provide a function `get_property_with_scores(property_id, viewer_id)` returning: all property fields, the viewer's 22 scores (NULL where unscored), partner's score count (NOT individual scores — those leak the partner's vurdering), and total counts. RLS SHALL ensure the function only returns data for households the viewer is a member of.

#### Scenario: Member fetches their property

- **WHEN** a member calls `get_property_with_scores(p, themself)` for a property in their household
- **THEN** the result includes the property + their 22 scores (NULL for unscored)

#### Scenario: Partner score visibility leak prevented

- **WHEN** a member fetches `get_property_with_scores`
- **THEN** the response includes `partner_score_count` (e.g. "Kanta has scored 18 of 22") but NOT the individual partner scores

#### Scenario: Non-member cannot fetch

- **WHEN** a non-member calls the function
- **THEN** the function returns no rows (RLS denies via the membership check)
