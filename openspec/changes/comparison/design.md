> Conventions: see `openspec/conventions.md`.

## Context

Comparison is the **payoff** of the product — independent partner scoring is only valuable if you can see disagreement and reconcile. The brief calls for a matrix view (rows = criteria, columns = `Ine | Kanta | Snitt | Felles`), inline-editable felles column, disagreement highlighting (`|Δ| ≥ threshold`), and a hero totalscore panel showing `Felles: 78/100` with smaller `Din: 76` / `Kanta: 82` underneath. This capability turns the raw score tables from `scoring` and the weight tables from `weights` into the headline numbers used everywhere else (sorted list cards, totalscore panel, etc.).

## Goals / Non-Goals

**Goals:**
- `Sammenligning` tab at `/app/bolig/[id]/sammenligning`.
- Totalscore-panel: `Felles: 78`, `Din: 76`, `Kanta: 82`, with warning when criteria are missing felles scores.
- Matrix grouped by section: `Kriterium | Ine | Kanta | Snitt | Felles`. Inline-editable Felles column via chip-picker.
- Disagreement highlighting on rows where `|Ine_score − Kanta_score| ≥ household.comparison_disagreement_threshold` (default 3, configurable).
- Felles-score storage: `property_felles_scores(property_id, criterion_id, score, updated_by, updated_at)`.
- Single-user fallback: tab still renders; `Kanta`/`Snitt` columns hidden; `Felles` simplifies to the user's score.
- Polling-on-focus refresh (no realtime in MVP).

**Non-Goals:**
- **Realtime sync** via Supabase Realtime — deferred to a follow-up change. MVP refetches on tab focus and after each local edit.
- **History of felles-score changes** — could be added later via trigger. Out of MVP.
- **Suggestion engine / "you usually agree on X"** — out of scope.
- **Per-criterion comments thread** — different feature; out of scope.
- **Partner activity indicators** ("Kanta is currently scoring this") — premature optimization.

## Decisions

### D1. Felles scores stored, not derived

**Choice**: `property_felles_scores(property_id, criterion_id, score, updated_by, updated_at)`. One row per scored criterion (sparse — rows exist only after the felles score is set).

**Alternative considered**: derive felles_score = average of partner scores, no storage.

**Rationale**: brief explicitly says felles is editable independently of partner averages — the household can override the average ("we'll go with 8 even though you scored 7 and I scored 6"). Storage is the only way to capture that override. Default value (when row absent) is the average, computed at read time.

### D2. Felles is sparse — absent row means "not set"

**Choice**: a missing `property_felles_scores` row means felles is unset for that criterion. UI fills it with the partner average as a default value, but until the user actively confirms (taps), no row is written. Once written, the felles is treated as authoritative.

**Alternative considered**: insert all 22 rows on first comparison-tab load with the average as the value.

**Rationale**: a sparse table is honest about which felles scores have been actively agreed on. The brief shows a warning "X kriterier mangler score — regnes som 0 i totalen" — this is the count of rows missing a felles score. With sparse storage, that count is `22 - count(rows)`.

### D3. Default felles = average of partner scores; tap to commit

**Choice**: when the comparison matrix renders, the `Felles` column shows `Snitt` as a placeholder for unset felles. Tapping the cell opens a chip-picker; selecting writes the row.

**Rationale**: removes friction — most felles scores will be the average, so don't make the user retype it. But also doesn't auto-fill the database, preserving the "intentionally not yet agreed on" semantics.

### D4. Threshold lives on `households` table

**Choice**: `households.comparison_disagreement_threshold INT NOT NULL DEFAULT 3 CHECK (BETWEEN 1 AND 10)`. Already added in `households` schema (D11 there).

**Rationale**: per-household setting (not per-user, not per-property). Surfaced in `Husstand` settings UI.

### D5. Single-user household renders the tab with collapsed UI

**Choice**: when there's only one member, the matrix shows three columns: `Kriterium | Din | Felles`. The `Felles` column simplifies to "din score blir felles" (with the option to override). Totalscore panel shows only `Din total`.

**Rationale**: the tab is still useful — the single user sees their own scores in matrix form and can adjust the felles. Hides partner-comparison machinery cleanly. When a partner joins later, the tab "lights up" without restructuring.

### D6. Polling-on-focus refresh, not Supabase Realtime

**Choice**: refetch the tab data when (a) the tab regains focus (`visibilitychange` event) and (b) after each local edit (autosave). No subscription.

**Rationale**: MVP keeps things simple. Realtime adds connection management, fallback handling for connection loss, and per-table channel limits in Supabase free tier. The feature works fine with focus-refresh — the worst case is a 30-second delay before seeing partner edits, which is acceptable for a "we score together at viewings" use-case.

### D7. Math contract

**Choice**: total formulas:
- `felles_total = round(Σ (felles_score[c] × household_weight[c]) / Σ (household_weight[c]) × 10)` — sum only over criteria with a felles_score set; missing felles counts as `0` in numerator.
- `din_total = round(Σ (your_score[c] × your_user_weight[c]) / Σ (your_user_weight[c]) × 10)` — sum only over criteria you've scored.
- `partner_total` = same formula with partner's data.
- Output range: 0–100 (integer).
- Divide-by-zero (all weights 0): display "Ikke nok data".

**Rationale**: matches the brief's example "Felles: 78/100". Weighted average rescaled to 0–100 is intuitive. Missing felles → 0 is the punishment for incompleteness, surfaced via the warning text.

### D8. Inline-edit chip-picker (not full chip-rad)

**Choice**: tapping a Felles cell opens a small popover containing the 11 chips (0–10) in two rows of 6. Tap to select, autosave, popover closes.

**Alternative considered**: render the full 11-chip rad inline in every row.

**Rationale**: inline 11-chip rads in 22 rows × 1 column = 22 rad widgets stacked. On mobile, that's narrow chips and an aesthetically chaotic matrix. A popover keeps the matrix dense and readable; the popover is touch-friendly with its own large chips.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Sparse `property_felles_scores` confusing for the partial-state UI | Spec scenario explicitly tests "X kriterier mangler score" warning. Helper function returns the count of unset felles rows. |
| Two members editing the same felles cell at the same time | Last-write-wins. `updated_by` and `updated_at` recorded. UI refresh-on-focus surfaces the partner's edit. Acceptable; brief explicitly says "den som sist redigerte 'felles' er den som står". |
| Matrix performance with many properties × refetches | Each comparison view fetches one property's data — small (~22 rows × 4 columns). No issue. |
| `partner_total` requires fetching partner's scores — leak risk | Server-side query fetches partner scores ONLY when the calling user is a member of the same household AND there is exactly one partner (`household_members.count = 2`). For 3+ member households, "partner" is undefined; render aggregate "Andre medlemmer" or punt: MVP assumes 1–2 members per household. |
| Threshold change retroactively re-highlights | Acceptable — that's the point. Threshold is a display-only setting; no migration on change. |
| Felles totalscore mismatches the matrix's row-by-row math due to rounding | Use integer math at the end (multiply, sum, divide, multiply by 10, round). Avoid floats in the sum. Document the formula in `docs/architecture/comparison.md`. |

## Resolved Decisions

### D9. 3+ member households — out of scope for MVP

**Choice**: brief and product framing assume 1–2 members. If a household has 3+ members, the comparison tab shows the felles total + the current user's `Din total` only. No "partner" column, no comparison matrix beyond `Kriterium | Din | Felles`.

**Rationale**: most households are couples. Don't over-engineer for the family-of-four case. We can add multi-member rendering later if it materializes.

### D10. Round to integer at the end

**Choice**: `round(... × 10)` produces a 0–100 integer. Display as "78", not "78.4".

**Rationale**: brief says "Felles: 78/100". Whole numbers are easier to compare and feel more authoritative.
