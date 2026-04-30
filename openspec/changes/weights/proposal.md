> Conventions: see `openspec/conventions.md`.

## Why

Different couples weigh different things — for one household kjøkken is the deal-breaker, for another it's beliggenhet. v2 needs **two parallel weight sets**: a **felles** weight set (shared by the household, used in `felles_total`) and a **personal** weight set per user (private, used in `din_total`). Members see and use both side-by-side in the comparison view. This is more transparent than a "blank = use felles" override model — every weight is visible, no hidden fallbacks.

## What Changes

- New `Vekter` page (top-level nav item).
- Segmented control at the top: `Felles vekter` (default) | `Mine personlige vekter`.
- Same 22 criteria as `scoring`, grouped in the same three sections.
- Per criterion: label + short description + **slider 0–10**. Default value: **5** (mid-scale, "moderat viktig").
- **Felles vekter**: shared across the household. Either member's edits are visible to the other (after polling/refresh — no realtime in MVP). Used to compute `felles_total`.
- **Personal vekter**: every user always has their own full set of 22 weights. Initialized to **5** (or copied from felles at the moment the user joins — implementation choice). Used to compute `din_total`.
- Each row in the personal view also displays the **felles weight** as a small reference value next to the slider (e.g. "Felles: 7"), so the user can see how their personal weighting differs from the household consensus.
- No live preview of how totalscore changes — out of scope for MVP. (Brief explicitly says droppable.)
- **Role rules**:
  - `owner`, `member`: can edit felles weights and their own personal weights.
  - `viewer`: read-only on both.

## Capabilities

### New Capabilities
- `weights`: 22-criteria weight management with both felles AND personal weight sets, segmented-control UI, slider component, side-by-side reference display in personal view.

### Modified Capabilities
<!-- None - new top-level capability. -->

## Out of MVP scope (future)

- **Live totalscore preview** as you drag sliders — explicitly droppable per the brief.
- **Real-time sync** of felles weight changes across partner sessions — polling/refresh in MVP.

## Impact

- **Database**:
  - `household_weights(household_id, criterion_id, weight INT 0..10, updated_at, updated_by)` — one row per (household × criterion).
  - `user_weights(household_id, user_id, criterion_id, weight INT 0..10, updated_at)` — one row per (user × household × criterion). Always populated for all 22 criteria; no nullable override semantics.
  - Trigger: when a new household is created, seed both tables with `weight = 5` for all 22 criteria. When a user joins a household, seed their `user_weights` with `weight = 5` for all 22 criteria.
- **UI**: new `Vekter` page, slider component, segmented control, side-by-side personal-vs-felles row layout for the personal view.
- **Math**: see `comparison` for how `din_total` (uses `user_weights`) and `felles_total` (uses `household_weights`) are calculated.
- **Routes**: `/app/vekter`.
- **Dependencies**: requires `households`. Consumed by `comparison` and any totalscore display in `properties`.
