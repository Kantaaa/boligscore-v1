> Conventions: see `openspec/conventions.md`.

## Context

Different couples weigh different things. The brief calls for a `Vekter` page where the household maintains a **felles** weight set (used for `felles_total`) and each member maintains their **personal** weight set (used for `din_total`). Both sets always coexist; there is **no** "blank means use felles" override semantics. This makes the math simple and the UI honest — the user can always see exactly what weights they are using vs what the household consensus is.

## Goals / Non-Goals

**Goals:**
- 22 criteria grouped into 3 sections (`Bolig innvendig`, `Beliggenhet & område`, `Helhet`), seeded as data.
- Two parallel weight tables: `household_weights` (one row per household × criterion) and `user_weights` (one row per user × household × criterion).
- Every household and member starts with all 22 weights set to `5` (mid-scale "moderat viktig").
- `Vekter` page with a segmented control (`Felles vekter` / `Mine personlige vekter`).
- Slider 0–10 per criterion. Personal view shows the felles weight as a small reference label next to each slider.
- `owner` and `member` can edit; `viewer` is read-only.

**Non-Goals:**
- Live preview of how `totalscore` changes as the user moves a slider — explicitly droppable per the brief.
- Real-time partner sync of felles weight edits — polling/refresh on focus is acceptable.
- Per-criterion weight ranges (e.g. "Kjøkken can be 0–20 but Areal can only be 0–10") — uniform 0–10 across the board.
- Weight history / audit log — not asked for; we can add later if needed.
- "Reset to defaults" UI — implied but not explicit; we'll include a `Reset til standard (5 over hele linjen)` button on each view.

## Decisions

### D1. Two parallel tables, no override semantics

**Choice**: `household_weights(household_id, criterion_id, weight)` and `user_weights(household_id, user_id, criterion_id, weight)` are both **fully populated** for every (household × criterion) and (user × household × criterion). There is no nullable "use felles" fallback.

**Alternative considered**: nullable override (`user_weights.weight NULL` means "use household_weights").

**Rationale**: user explicitly wants to see both weights side-by-side. With a nullable model, we'd have to coalesce on read AND make UX choices about what "blank" means in the slider (off? grey? = felles?). With both populated, the UI is unambiguous and the math is simple.

### D2. Default weight = 5

**Choice**: when seeded, every weight = `5`. Range is 0–10.

**Rationale**: 5 is "moderat viktig" — a neutral starting point that requires the household to actively decide which criteria matter more. `0` would mean "criterion doesn't matter at all" which is too strong as a default — most criteria matter to some degree.

### D3. Seeding via DB triggers

**Choice**: two triggers handle seeding:
- After insert on `households`: insert one `household_weights` row per criterion with `weight = 5`.
- After insert on `household_members`: insert one `user_weights` row per criterion (for the new member, scoped to the joined household) with `weight = 5`.

**Alternative considered**: do the seeding in application code (`createHousehold` server action seeds household_weights, `acceptInvitation` seeds user_weights).

**Rationale**: triggers are atomic with the row insert and impossible to forget. Application-code seeding is bypassable by direct DB writes (e.g. a future bulk import script), which would create households missing weights. Triggers are the single source of truth.

### D4. Criteria are seed data, not configurable

**Choice**: `criteria` and `criterion_sections` are tables, but their rows are part of the schema migration — the 22 criteria and 3 sections are seeded by the migration and not user-editable.

**Rationale**: the criteria list is part of the product spec; making it editable would require localization, validation, and migration logic for the score history when criteria change. None of that is needed for MVP. If we ever need to change the criteria list, we ship a new migration.

### D5. Slider with discrete integer steps

**Choice**: slider step = `1`. Values are integers 0–10. Use `<input type="range" min=0 max=10 step=1>` with custom Tailwind styling.

**Rationale**: integer values are easier to reason about ("kjøkken er 8 av 10 viktig"). Floating-point weights add precision the user can't perceive. Discrete steps make keyboard a11y trivial (arrow keys = ±1).

### D6. Reset action on each view

**Choice**: each segmented-control view has a `Tilbakestill alle til 5` action. Confirms via dialog (destructive of changes).

**Rationale**: weighted totals are sensitive to weights — easy to thrash. A reset gives users an escape hatch when they realize they over-tuned.

### D7. Weights consumed by `comparison`'s totalscore math

**Choice**: this capability does NOT compute totals. `din_total = Σ (your_score[c] × your_user_weight[c]) / Σ (your_user_weight[c]) × 10` and `felles_total = Σ (felles_score[c] × household_weight[c]) / Σ (household_weight[c]) × 10` are computed in the `comparison` capability and the `properties` list view.

**Rationale**: separation of concerns. This capability owns weight management; comparison owns the math.

### D8. Edge case: all weights are 0

**Choice**: if every weight in a set is 0, `Σ weight = 0` and the formula divides by zero. Display "Ikke nok data" instead of a number.

**Rationale**: rare but possible (user thinks "nothing matters"). Better than NaN.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Trigger fails silently if criteria table is empty | Migration order: criteria seeded BEFORE household-trigger creation. Integration test: creating a household always produces 22 weight rows. |
| User accepts invitation to large existing household → trigger inserts 22 rows × N existing users? | The trigger inserts 22 rows for the *joining* user only, scoped to that household. Existing members already have their rows. |
| Both partners edit the same felles weight at the same time | Last-write-wins; updated_by stamp shows who. No locking. |
| User deletes themselves (leaves household) → user_weights orphaned | FK cascade: `user_weights.user_id → auth.users(id) ON DELETE CASCADE` AND `household_id → households(id)`. Combined with `household_members` cascade, the orphan can't persist. |
| Reset button thrashes felles weights for both partners | The reset modal explicitly says "Dette tilbakestiller VEKTENE FOR HELE HUSHOLDNINGEN" when on the felles view. |
| Missing user_weights rows for an existing user (bug, manual DB tinkering) | Defensive read in `comparison` math: `coalesce(user_weights.weight, 5)`. Also add a healthcheck that flags users missing weight rows. |

## Resolved Decisions

### D9. Personal view shows felles as small reference label, not as separate slider

**Choice**: in the personal view, each row shows your slider + a small text reference "Felles: 7" next to it. NOT two parallel sliders.

**Rationale**: avoids confusion about which slider is "yours". The reference is informative; editing felles is a separate view.

### D10. Sliders are eager-save (no save button)

**Choice**: changes save on slider release (`onMouseUp`/`onTouchEnd`/`onChange` settle). No "Lagre" button. Matches the autosave pattern from `scoring`.

**Rationale**: consistent with the rest of the product. Brief explicitly mentions autosave for scoring; weights inherit the same model.
