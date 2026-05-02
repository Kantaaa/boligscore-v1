# Weights — architecture notes

> Spec source: `openspec/changes/weights/{proposal,design,specs/weights/spec.md}.md`.
> Canonical criteria list: `docs/criteria.md`.

The `weights` capability owns the household × user weight model that
drives `felles_total` and `din_total` in the comparison view. Its
domain entities are:

- `criterion_sections` — the 3 logical groupings (seed data).
- `criteria` — the 22 scored criteria (seed data, immutable in MVP).
- `household_weights` — one row per (household × criterion). The
  household's shared weights, used to compute `felles_total`.
- `user_weights` — one row per (household × user × criterion). Each
  member's personal weights, used to compute `din_total`.

This doc is a quick orientation for capability authors. The
canonical behaviour lives in the OpenSpec docs.

## Tables

```text
criterion_sections             — seeded once by 20260501000007
  id uuid PK
  key text UNIQUE              -- bolig_innvendig | beliggenhet_omrade | helhet
  label text                   -- Norwegian label
  description text
  sort_order int

criteria                       — seeded once by 20260501000007 (22 rows)
  id uuid PK
  key text UNIQUE              -- e.g. kjokken, bad, planlosning, ...
  section_id uuid FK criterion_sections.id
  label text                   -- Norwegian label
  description text
  sort_order int

household_weights              — one row per (household × criterion); seeded by trigger
  household_id uuid FK households.id ON DELETE CASCADE
  criterion_id uuid FK criteria.id ON DELETE RESTRICT
  weight int NOT NULL DEFAULT 5 CHECK (weight BETWEEN 0 AND 10)
  updated_at timestamptz
  updated_by uuid FK auth.users.id
  PRIMARY KEY (household_id, criterion_id)

user_weights                   — one row per (household × user × criterion); seeded by trigger
  household_id uuid FK households.id ON DELETE CASCADE
  user_id uuid FK auth.users.id ON DELETE CASCADE
  criterion_id uuid FK criteria.id ON DELETE RESTRICT
  weight int NOT NULL DEFAULT 5 CHECK (weight BETWEEN 0 AND 10)
  updated_at timestamptz
  PRIMARY KEY (household_id, user_id, criterion_id)
```

The four tables are created as STUBS by the `properties` capability
(`20260501000004_properties_dependent_stubs.sql`) so the property
list function can compile against them. The `weights` capability:

- seeds 22 rows into `criteria` and 3 rows into `criterion_sections`,
- adds the AFTER-INSERT triggers that auto-seed weights,
- adds UPDATE policies (writes were denied by absence in the stub).

## Triggers (D3)

Seeding is done in the database, not in application code, so a future
bulk-import script that bypasses the app cannot create households
missing weight rows.

```text
households AFTER INSERT
  → seed_household_weights()
     → insert 22 household_weights rows (one per criterion, weight=5)
     → ON CONFLICT (household_id, criterion_id) DO NOTHING (idempotent)

household_members AFTER INSERT
  → seed_user_weights()
     → insert 22 user_weights rows (one per criterion, weight=5)
     → ON CONFLICT (household_id, user_id, criterion_id) DO NOTHING
```

Both functions are SECURITY DEFINER so they can write past RLS — the
trigger fires regardless of the inserter's role.

The migration also runs a one-time backfill (`INSERT ... CROSS JOIN
criteria ON CONFLICT DO NOTHING`) so existing households / members
get their 22 rows.

## RLS

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `criterion_sections` | any authenticated | denied | denied | denied |
| `criteria` | any authenticated | denied | denied | denied |
| `household_weights` | members of household | denied (trigger only) | owner / member of household | denied (cascade only) |
| `user_weights` | own row only | denied (trigger only) | own row + owner / member role | denied (cascade only) |

INSERT and DELETE are NEVER allowed via the API. Population happens
via the seed triggers; removal happens via FK cascade when a member
leaves or a household is deleted.

The `has_household_role(uuid, text[])` helper (defined in the
`households` capability) is reused for the UPDATE policies.

## Server actions

All actions live under `src/server/weights/` and use `"use server"`.
They funnel through `requireUser()` which returns the cookie-bound
Supabase client + the auth user. Actions:

- `getCriteria()` — returns `{ sections, criteria }` ordered by
  `sort_order`.
- `getHouseholdWeights(householdId)` — returns 22 rows or `[]` if
  RLS filters.
- `getUserWeights(householdId, userId)` — returns 22 rows or `[]`.
  Server validates `userId === auth.uid()` (defence in depth).
- `setHouseholdWeight(householdId, criterionId, weight)` — UPDATE with
  `updated_by = auth.uid()`. Viewer denied at RLS.
- `setUserWeight(householdId, criterionId, weight)` — UPDATE on
  caller's row. Viewer denied at RLS.
- `resetHouseholdWeights(householdId)` — bulk UPDATE to weight=5.
- `resetUserWeights(householdId)` — bulk UPDATE on caller's rows.

Validation: every set/reset path runs `validateWeight()` which
mirrors the DB CHECK constraint and returns the spec-locked
Norwegian message on failure.

## Math contract with `comparison`

This capability does NOT compute totals. The math lives in
`comparison` and (for the list view) in the
`get_property_list()` function from the `properties` migration:

```text
felles_total = round((Σ felles_score[c] × household_weight[c]) /
                     (Σ household_weight[c]))   × 10

din_total    = round((Σ your_score[c]   × user_weight[c]) /
                     (Σ user_weight[c] over scored criteria)) × 10
```

Edge case (D8): when `Σ weight = 0`, the totalscore is rendered as
"Ikke nok data" rather than dividing by zero. The
`weightSetIsAllZero(rows)` helper in `src/lib/weights/validation.ts`
is the canonical check; the SQL function uses `NULLIF(denominator,
0)` to achieve the same.

## UI

- Page: `src/app/app/vekter/page.tsx` (server component, fetches
  catalogue + felles + personal in parallel).
- Client: `src/components/weights/VekterClient.tsx` owns the
  segmented-control state (URL `?view=felles|personal`), optimistic
  updates, "lagret" pulse, and the reset modal.
- Slider: `src/components/weights/WeightSlider.tsx` is a
  Tailwind-styled `<input type="range">` with a 44×44 touch target.
  Commits eagerly on `pointerup`/`touchend` and debounces keyboard
  arrow-key changes by 250ms.
- Section: `src/components/weights/WeightSection.tsx` groups rows
  under a section heading + description.

## Conflicts with downstream capabilities

- `comparison`: this capability assumes `comparison` will read both
  weight tables to compute totalscores. The math contract above is
  the source of truth — `comparison` should NOT re-derive the
  formulas.
- `scoring`: this capability assumes `scoring` will write to
  `property_scores` referencing the same `criteria.id` set. The 22
  criteria are the catalog; scoring's UI must render exactly those
  22.
- `properties`: the list function `get_property_list()` already
  references both weight tables. Anyone changing weight column names
  or types must update that function in tandem.
