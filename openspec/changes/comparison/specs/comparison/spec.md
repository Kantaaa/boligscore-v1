## ADDED Requirements

### Requirement: Felles score storage

The system SHALL store felles scores in `property_felles_scores(property_id, criterion_id, score, updated_by, updated_at)` with `score INT CHECK (score BETWEEN 0 AND 10)`. The composite `(property_id, criterion_id)` SHALL be the primary key. Rows are sparse — absence means "felles not set for this criterion".

#### Scenario: Member sets a felles score

- **WHEN** a member sets the felles score for a property × criterion to 8
- **THEN** a row is upserted with `score = 8`, `updated_by = caller`, `updated_at = now()`

#### Scenario: Viewer cannot set felles

- **WHEN** a `viewer` attempts to upsert a felles score
- **THEN** RLS denies the operation

#### Scenario: Sparse storage

- **WHEN** a property has felles scores set for 18 of 22 criteria
- **THEN** `property_felles_scores` has exactly 18 rows for that property; the 4 unset criteria have no rows

#### Scenario: Out of range rejected

- **WHEN** a user attempts to set `score = 11`
- **THEN** the database CHECK constraint rejects the operation

### Requirement: Sammenligning tab — totalscore panel

The system SHALL render at the top of `/app/bolig/[id]/sammenligning` a totalscore panel containing: a hero `Felles: <N>/100`, smaller `Din: <N>` and `<Partner>: <N>` numbers, and a warning row when one or more criteria are missing a felles score.

#### Scenario: Two-member household, fully scored

- **WHEN** a property in a two-member household has felles scores for all 22 criteria
- **THEN** the panel renders `Felles: 78` (or whatever the math produces), `Din: <N>`, `<Partner>: <N>`
- **AND** no warning row appears

#### Scenario: Missing felles scores

- **WHEN** 3 of 22 criteria lack a felles score
- **THEN** the panel shows the warning "⚠ 3 kriterier mangler score — regnes som 0 i totalen"

#### Scenario: All-zero weights graceful display

- **WHEN** the household_weights all equal 0 (denominator zero)
- **THEN** `Felles` shows "Ikke nok data" instead of a number
- **AND** the warning row is suppressed (it's redundant with the broader issue)

#### Scenario: Single-member household totalscore panel

- **WHEN** a property is in a single-member household
- **THEN** the panel shows only `Din: <N>`; `Felles` and `<Partner>` are hidden

### Requirement: Sammenligning tab — comparison matrix (two-member case)

The system SHALL render a matrix grouped by criterion section with columns `Kriterium | Ine | Kanta | Snitt | Felles` (the partner names are filled in dynamically). The `Felles` column SHALL be inline-editable for `owner` and `member`, read-only for `viewer`.

#### Scenario: Matrix renders all 22 criteria grouped by section

- **WHEN** an owner/member opens the tab in a two-member household
- **THEN** all 22 rows render under their three section headers

#### Scenario: Cell content for fully-scored row

- **WHEN** both members have scored a criterion (8 and 6)
- **THEN** the row shows `Ine: 8`, `Kanta: 6`, `Snitt: 7`, and the Felles cell shows the felles score (or `7` as the placeholder snitt if no felles set)

#### Scenario: Cell content for partially-scored row

- **WHEN** the current user has scored a criterion (7) but the partner has not
- **THEN** the row shows `Ine: 7`, `Kanta: —`, `Snitt: —`, `Felles: —`

#### Scenario: Cell content for unscored row

- **WHEN** neither member has scored a criterion
- **THEN** the row renders all values as `—`

#### Scenario: Disagreement highlight

- **WHEN** a row has `|Ine_score − Kanta_score| ≥ household.comparison_disagreement_threshold` (default 3)
- **THEN** the row is rendered with a subtle highlight (background color or left border)

#### Scenario: Threshold change re-renders highlights

- **WHEN** the household owner changes `comparison_disagreement_threshold` from 3 to 2
- **THEN** the matrix re-renders with rows where `|Δ| ≥ 2` highlighted (after refetch on next render)

### Requirement: Inline edit of Felles column

The system SHALL allow `owner` and `member` to set the felles score by tapping a Felles cell, which opens a chip-picker popover with chips 0–10. Selecting a chip SHALL upsert the felles row and close the popover.

#### Scenario: Open chip-picker

- **WHEN** an owner/member taps a Felles cell
- **THEN** a popover opens displaying chips 0–10
- **AND** the currently set value (or snitt placeholder) is highlighted

#### Scenario: Select chip saves immediately

- **WHEN** the user selects chip `8` in the popover
- **THEN** the felles score is upserted to 8
- **AND** the popover closes
- **AND** the totalscore panel recalculates

#### Scenario: Tap outside dismisses without save

- **WHEN** the user opens a chip-picker but taps outside before selecting
- **THEN** the popover closes; no upsert occurs

#### Scenario: Viewer cannot open chip-picker

- **WHEN** a viewer taps a Felles cell
- **THEN** the cell does not open the picker (or opens read-only)
- **AND** the row remains unchanged

### Requirement: Single-member household variant

The system SHALL render a simplified two-column matrix (`Kriterium | Din | Felles`) when the active household has exactly one member. The `Felles` column SHALL prefill with `Din` as the placeholder; the user can override.

#### Scenario: Single-member matrix

- **WHEN** an owner/member opens the tab in a single-member household
- **THEN** the matrix shows columns `Kriterium | Din | Felles` (no `Snitt`, no partner)
- **AND** rows display the user's score in `Din`, the felles score (or `Din` value as placeholder) in `Felles`

#### Scenario: Felles editable in single-member case

- **WHEN** a single-member user taps a Felles cell
- **THEN** the chip-picker opens; selection upserts as normal

### Requirement: 3+ member household variant

When a household has more than two members, the system SHALL render a simplified `Kriterium | Din | Felles` matrix and the totalscore panel SHALL show only `Felles` and `Din` (no per-partner numbers). The full multi-member comparison matrix is out of MVP scope.

#### Scenario: Three-member household renders simplified matrix

- **WHEN** a household with 3+ members views the comparison tab
- **THEN** the matrix shows only `Kriterium | Din | Felles`
- **AND** the totalscore panel shows `Felles: <N>` and `Din: <N>` only

### Requirement: Refresh on tab focus

The system SHALL refetch the comparison data when the browser tab regains focus (`visibilitychange` event with `document.visibilityState === 'visible'`) and after every local felles-score edit.

#### Scenario: Tab focus triggers refetch

- **WHEN** the tab is hidden and then becomes visible again
- **THEN** the comparison data is refetched
- **AND** any partner-side changes that occurred while hidden are reflected

#### Scenario: Edit triggers refetch

- **WHEN** the user upserts a felles score
- **THEN** the totalscore panel and matrix re-render with the latest data

### Requirement: Threshold configuration

The system SHALL allow `owner` to change `households.comparison_disagreement_threshold` to any integer in `[1, 10]`. The setting SHALL be surfaced in `Husstand` (or `Meg` → `Innstillinger`) UI.

#### Scenario: Owner changes threshold

- **WHEN** an `owner` updates the threshold from 3 to 2
- **THEN** the value is persisted to `households.comparison_disagreement_threshold`

#### Scenario: Member cannot change threshold

- **WHEN** a `member` or `viewer` attempts to change the threshold
- **THEN** RLS denies the update

#### Scenario: Out of range rejected

- **WHEN** a user attempts to set the threshold to 0 or 11
- **THEN** the CHECK constraint rejects the value

### Requirement: Felles totalscore math

The system SHALL compute `felles_total = round((Σ over c with felles set: felles_score[c] × household_weight[c]) / (Σ over all c: household_weight[c]) × 10)`. Criteria without a felles score are NOT skipped — they contribute `0` to the numerator, but the denominator still uses ALL household weights so missing felles scores reduce the total.

#### Scenario: Fully-scored felles total

- **WHEN** all 22 felles scores are set
- **THEN** `felles_total` is the standard weighted average × 10, rounded to integer

#### Scenario: Partially-scored penalizes total

- **WHEN** 18 of 22 felles scores are set
- **THEN** the unset 4 contribute `0` to the numerator
- **AND** the denominator uses all 22 weights
- **AND** the resulting total is lower than if those 4 had been filled in

#### Scenario: All weights zero

- **WHEN** every household_weight = 0
- **THEN** `felles_total` is reported as null and UI displays "Ikke nok data"
