# Comparison — architecture notes

> Spec source: `openspec/changes/comparison/{proposal,design,specs/comparison/spec.md}.md`.
> Sibling docs: `docs/architecture/scoring.md`, `docs/architecture/weights.md`.

The `comparison` capability is the **payoff** of the product. Once both
partners have privately scored a property (`scoring`) and the household
has tuned its weights (`weights`), this capability surfaces:

1. The headline `Felles: 78/100` total used in property cards and lists.
2. A side-by-side matrix showing where partners agree and disagree.
3. An inline-editable `Felles` column for committing the household's
   reconciled score per criterion.

This doc is a quick orientation. The canonical behaviour lives in the
OpenSpec docs.

## Tables

```text
property_felles_scores         — STUB created by 20260501000004
  property_id   uuid FK properties.id ON DELETE CASCADE
  criterion_id  uuid FK criteria.id ON DELETE RESTRICT
  score         int NOT NULL CHECK (score BETWEEN 0 AND 10)
  updated_by    uuid FK auth.users.id
  updated_at    timestamptz
  PRIMARY KEY (property_id, criterion_id)
  INDEX (property_id)

households.comparison_disagreement_threshold
  int NOT NULL DEFAULT 3 CHECK (BETWEEN 1 AND 10)
  -- Added in 20260501000001 (households capability).
```

The table is **sparse**: a missing row means "felles not set for this
criterion". The UI fills the cell with the snitt of partner scores as
a placeholder until the user commits a value (D2/D3).

## RLS (migration 20260501000011)

| Operation | Allowed for | Extra check |
|---|---|---|
| SELECT | members of property's household (any role) | — |
| INSERT | owner / member of property's household | `updated_by = auth.uid()` |
| UPDATE | owner / member of property's household | `updated_by = auth.uid()` |
| DELETE | owner / member of property's household | — |

Defence-in-depth: a `BEFORE INSERT OR UPDATE` trigger sets `updated_at`
to `now()` AND raises if `updated_by != auth.uid()` (when there is a
logged-in user — SECURITY DEFINER admin paths can still write).

## Math contract (D7)

The three totalscores are 0..100 integers (D10 — round at the end).

### `compute_felles_total(p_property_id)`

```text
numerator   = Σ over c with felles set: felles_score[c] × household_weight[c]
denominator = Σ over ALL c:             household_weight[c]
felles_total = round((numerator / denominator) × 10)
```

- Sparse felles is intentional: missing rows contribute `0` to the
  numerator but the denominator stays the same → the total drops.
- `denominator == 0` (e.g. weights all zero) → returns NULL → UI shows
  `Ikke nok data`. The missing-felles warning is suppressed in this
  case because the bigger problem is the actionable one.

### `compute_user_total(p_property_id, p_user_id)`

```text
numerator   = Σ over c the user scored: score[c] × user_weight[c]
denominator = Σ over c the user scored: user_weight[c]
user_total  = round((numerator / denominator) × 10)
```

Unscored criteria are excluded from BOTH numerator and denominator —
your `Din total` reflects only criteria you've expressed an opinion
about. Returns NULL when the user has scored nothing.

### `get_property_comparison(p_property_id, p_viewer_id)`

Single-call payload for the Sammenligning tab. Membership-checks at
the top so non-members get an empty result. Returns:

- property fields,
- threshold + member count,
- `partner_user_id` — the unique partner when `member_count = 2`,
  else NULL,
- a `jsonb` array of per-criterion rows: `{criterion_id, criterion_key,
  criterion_label, criterion_sort_order, section_id, section_key,
  section_label, section_sort_order, your_score, partner_score,
  partner_user_id, snitt, felles_score, felles_set}`,
- the three totalscores: `felles_total`, `your_total`, `partner_total`.

Note: this function **deliberately exposes partner scores**, unlike
`get_property_with_scores()` which strips them. The whole point of
the comparison view is to see the partner's vurdering.

## Worked example

Household with **3 criteria** (for brevity), all weight=5. Two members
scored:

| Criterion | Your score | Partner score | Felles set | Felles |
|---|---|---|---|---|
| K1 | 10 | 8 | yes | 9 |
| K2 |  6 | 4 | yes | 5 |
| K3 |  8 | 8 | no  | — |

### Felles total

- numerator = 9·5 + 5·5 + 0·5 = 70
- denominator = 5 + 5 + 5 = 15
- felles_total = round((70/15) × 10) = round(46.67) = **47**

### Your total

- All three scored. numerator = 10·5 + 6·5 + 8·5 = 120; denominator = 15
- your_total = round((120/15) × 10) = round(80) = **80**

### Partner total

- numerator = 8·5 + 4·5 + 8·5 = 100; denominator = 15
- partner_total = round((100/15) × 10) = round(66.67) = **67**

### Disagreement highlights (threshold = 3, default)

- K1: |10 − 8| = 2 < 3 → not flagged
- K2: |6 − 4| = 2 < 3 → not flagged
- K3: |8 − 8| = 0 < 3 → not flagged

Set threshold to 2 → K1 and K2 flag. Threshold to 1 → all three.

## Refresh strategy (D6)

No Supabase Realtime in MVP. The comparison page client component:

1. Calls `useFocusRefresh(refetch)` — listens for `visibilitychange`
   and `window` `focus` events, debounced 200ms.
2. Calls `refetch` after every successful `setFellesScore` /
   `clearFellesScore` so the matrix reflects partner edits that
   landed in the same window.

Worst case: a 30-second delay before seeing the partner's edits when
you switch tabs. Acceptable for the "we score together at viewings"
use-case.

## Variant rendering (D5, D9)

| Member count | Matrix columns | Totalscore panel |
|---|---|---|
| 1 | `Kriterium \| Din \| Felles` | `Din total: <N>` |
| 2 | `Kriterium \| <viewer> \| <partner> \| Snitt \| Felles` | `Felles: <N>` (hero) + `Din: <N>` + `<partner>: <N>` |
| 3+ | `Kriterium \| Din \| Felles` (D9 — simplified) | `Felles: <N>` (hero) + `Din: <N>` |

The variant is selected from `member_count` returned by the SQL
function — a single source of truth.

## Role rules

- **owner / member**: read everything; write felles via chip-picker;
  owner additionally controls the disagreement threshold.
- **viewer**: read everything (matrix renders fully); felles cells
  render as plain spans, no chip-picker.
- **non-member**: `getComparison` returns "Bolig ikke funnet" — page
  hits `notFound()`.

## Threshold setting (`setDisagreementThreshold`)

Lives on the Husstand page as the `<DisagreementThresholdSection>`
component. Owner sees an active 1..10 slider; non-owner sees the
slider disabled with an explanatory helper text. Server action calls
`UPDATE households SET comparison_disagreement_threshold = ?`; RLS
denies non-owner updates.
