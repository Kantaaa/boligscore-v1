> Conventions: see `openspec/conventions.md`.

## 1. Database schema

- [x] 1.1 Migration: create `property_felles_scores(property_id uuid REFERENCES properties(id) ON DELETE CASCADE, criterion_id uuid REFERENCES criteria(id) ON DELETE RESTRICT, score int NOT NULL CHECK (score BETWEEN 0 AND 10), updated_by uuid NOT NULL REFERENCES auth.users(id), updated_at timestamptz NOT NULL default now(), PRIMARY KEY (property_id, criterion_id))`. Index on `property_id`. (Table created as STUB in `20260501000004_properties_dependent_stubs.sql`; this capability tightens RLS + adds triggers in `20260501000011_comparison.sql`.)
- [x] 1.2 `households.comparison_disagreement_threshold` already added by `households` capability (per its tasks 2.2). Verify default `3` and CHECK `BETWEEN 1 AND 10`. (Defensive `do$$` block in 0011 asserts the column exists.)

## 2. RLS policies

- [x] 2.1 Enable RLS on `property_felles_scores`. (Stub already enabled it; 0011 ensures all 4 policies are correctly defined.)
- [x] 2.2 SELECT: caller is a member of the property's household (JOIN through `properties`).
- [x] 2.3 INSERT/UPDATE/DELETE: `has_household_role(<property's household_id>, ARRAY['owner','member'])` — viewer denied. `updated_by` MUST equal `auth.uid()` (enforced via DEFAULT auth.uid() in client + WITH CHECK + BEFORE INSERT/UPDATE trigger).

## 3. SQL math functions

- [x] 3.1 Function `compute_felles_total(p_property_id uuid)` returns int|null. Numerator: `Σ (felles_score × household_weight)` over criteria with felles set. Denominator: `Σ household_weight` over ALL criteria. Returns `round((num/den) × 10)::int`. Returns NULL if denominator is 0.
- [x] 3.2 Function `compute_user_total(p_property_id uuid, p_user_id uuid)` similar but uses `property_scores` × `user_weights`.
- [x] 3.3 Function `get_property_comparison(p_property_id uuid, p_viewer_id uuid)` returns a row containing: property fields, threshold, member count, an array of `{criterion_id, section_id, criterion_label, your_score, partner_score, partner_user_id, snitt, felles_score}`, and the three totalscores.
- [x] 3.4 Test that the math matches a hand-computed example. (See `src/lib/comparison/math.test.ts`.)

## 4. Server actions / data layer

- [x] 4.1 `setFellesScore(propertyId, criterionId, score)` — upsert. Returns the new `felles_total` for client to update without full refetch.
- [x] 4.2 `clearFellesScore(propertyId, criterionId)` — DELETE.
- [x] 4.3 `getComparison(propertyId)` — wraps `get_property_comparison` SQL function.
- [x] 4.4 `setDisagreementThreshold(householdId, threshold)` — owner only.

## 5. UI — Sammenligning tab

- [ ] 5.1 `app/app/bolig/[id]/sammenligning/page.tsx` — server-fetches `getComparison`; passes data + viewer's role to a client component.
- [ ] 5.2 `<TotalscorePanel>` — renders `Felles` (hero), `Din`, `<Partner>` (small). Warning bar for missing felles count. Empty state for single-member.
- [ ] 5.3 `<ComparisonMatrix>` — three section blocks; each block renders `<MatrixRow>` per criterion.
- [ ] 5.4 `<MatrixRow>` — columns `Kriterium | Ine | Kanta | Snitt | Felles`. Highlights row when `|Δ| ≥ threshold`. `Felles` cell is interactive.
- [ ] 5.5 `<FellesCell>` — clickable; opens `<ChipPickerPopover>`. Shows current felles or snitt placeholder. Disabled for viewer.
- [ ] 5.6 `<ChipPickerPopover>` — 11 chips arranged 6+5. Selection calls `setFellesScore` then closes. Backdrop tap dismisses without save.
- [ ] 5.7 Single-member fallback: if `member_count === 1`, render the simplified 2-column matrix and the simplified totalscore panel.
- [ ] 5.8 3+ member fallback: same simplified UI as single-member case.

## 6. Refresh on focus

- [ ] 6.1 Custom hook `useFocusRefresh(callback, debounceMs = 200)` listens for `visibilitychange` and `focus` events; calls `callback` when the tab becomes visible.
- [ ] 6.2 Mount the hook in the comparison page client component to refetch `getComparison` on focus.
- [ ] 6.3 Also refetch after every successful `setFellesScore` (server action returns the new total; client merges).

## 7. Threshold setting UI

- [ ] 7.1 In `Husstand` page (or `Meg` → `Innstillinger`): a small section "Uenighetsgrense" with a slider 1–10 (default 3). Owner sees and can edit; non-owners see read-only.
- [ ] 7.2 Helper text: "Rader hvor dere er uenige med [N] eller mer markeres."
- [ ] 7.3 On change: call `setDisagreementThreshold`. Comparison views refetch on next focus.

## 8. Tests

- [ ] 8.1 **Unit (Vitest)**: math edge cases — all weights 0 → null; partial felles → reduced total; rounding consistency at boundary values.
- [ ] 8.2 **Unit**: disagreement threshold check (`|a - b| >= threshold`).
- [ ] 8.3 **Integration**: SQL functions return correct totals for hand-built fixture data; partner data leak prevented for non-members.
- [ ] 8.4 **Integration**: RLS — viewer cannot upsert felles; non-member cannot SELECT felles; threshold update only by owner.
- [ ] 8.5 **Integration**: cascade — deleting a property removes felles rows.
- [ ] 8.6 **E2E (Playwright)**: two users score a property differently; second user opens `Sammenligning` and sees the disagreement highlight on the differing row.
- [ ] 8.7 **E2E**: edit Felles via chip-picker → totalscore panel updates immediately → reload, persists.
- [ ] 8.8 **E2E**: change threshold from 3 to 2 → matrix highlight pattern changes after refetch.
- [ ] 8.9 **E2E**: single-member household — comparison tab renders the simplified matrix.
- [ ] 8.10 **E2E**: viewer mode — Felles cells are not interactive.

## 9. Documentation

- [ ] 9.1 `docs/architecture/comparison.md` — schema, math contract, refresh strategy, role rules.
- [ ] 9.2 Worked example in the doc: hand-compute felles_total for a sample property to sanity-check the formula.
