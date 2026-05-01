# Properties — architecture notes

> Spec source: `openspec/changes/properties/{proposal,design,specs/properties/spec.md}.md`.

The `properties` capability owns the household-scoped property entity,
the manual `Ny bolig` form, the `/app` list view (search / sort /
filter / FAB), and the property-detail `Oversikt` tab. Other tabs
(`Min vurdering`, `Sammenligning`, `Kommentarer`, `Notater`) are owned
by downstream capabilities; this capability only renders D11
"Kommer snart" placeholders for the two that have no MVP content
(Kommentarer, Notater).

This doc is a quick orientation for capability authors. The canonical
behaviour lives in the OpenSpec docs.

## Tables

```text
property_statuses                — extensible status lookup (D1)
  id uuid PK
  household_id uuid NULL FK households.id ON DELETE CASCADE
  label text NOT NULL CHECK (length(trim(label)) > 0)
  color text NOT NULL              -- token name, e.g. status-vurderer
  icon text NOT NULL               -- single-glyph icon
  is_terminal boolean NOT NULL DEFAULT false
  sort_order int NOT NULL DEFAULT 0
  created_at timestamptz
  -- Partial unique indexes: globally unique label when household_id IS NULL,
  -- per-household unique otherwise.

properties
  id uuid PK
  household_id uuid NOT NULL FK households.id ON DELETE CASCADE  (immutable)
  address text NOT NULL CHECK (length(trim(address)) > 0)
  finn_link text
  price bigint, costs bigint, monthly_costs bigint
  bra numeric
  primary_rooms int, bedrooms int, bathrooms numeric
  year_built int CHECK (year_built BETWEEN 1800 AND extract(year FROM now())::int + 5)
  property_type text, floor text
  status_id uuid NOT NULL FK property_statuses.id ON DELETE RESTRICT
  added_by uuid NOT NULL FK auth.users.id  (immutable)
  created_at timestamptz                    (immutable)
  updated_at timestamptz                    (auto-updated)
```

`properties.{household_id, added_by, created_at}` are immutable: a
`BEFORE UPDATE` trigger (`properties_prevent_immutable_update`) raises
on any attempt to change them. `updated_at` is maintained by a
companion `properties_set_updated_at` trigger.

`status_id` uses `ON DELETE RESTRICT` (D9). Deleting a status that is
referenced by a property fails at the FK layer; the UI surfaces this
as `STATUS_IN_USE_MESSAGE` ("Du må flytte boligene til en annen status
før du sletter denne").

## Status lookup pattern (D1)

Statuses are not a Postgres enum — they are rows in
`property_statuses`. A row is **global** when `household_id IS NULL`
and **household-scoped** otherwise. The migration seeds the seven
default statuses as global rows:

```text
favoritt        ★    yellow
vurderer        ◔    blue        (default for new properties — D8)
på visning      👁    purple
i budrunde      ⚖    orange
bud inne        ✋    red
kjøpt           ✓    green       (is_terminal)
ikke aktuell    ✗    grey        (is_terminal)
```

Why a lookup table over a Postgres enum:

- Adding a custom status doesn't need `ALTER TYPE`.
- Per-household statuses are possible without schema changes.
- The cost is one extra join on every property read — negligible for
  this scale.

RLS rules:

- `SELECT`: row is global OR caller is a member of `household_id`.
- `INSERT`/`UPDATE`/`DELETE`: caller has `owner` / `member` role on
  `household_id` AND `household_id IS NOT NULL`. Global rows are
  immutable through the API.

## RLS pattern

Every household-scoped table now follows the same membership-then-role
pattern documented in `docs/architecture/households.md`. The helper
`public.has_household_role(uuid, text[])` is reused.

```sql
CREATE POLICY properties_insert ON public.properties
    FOR INSERT
    WITH CHECK (
        public.has_household_role(household_id, ARRAY['owner','member'])
        AND added_by = auth.uid()
    );
```

The `added_by = auth.uid()` constraint prevents a user from
attributing a property to someone else.

## list function (D3)

`get_property_list(p_household_id uuid, p_user_id uuid)` is a
`SECURITY DEFINER` function returning one row per property with the
joined status fields plus four derived totals:

| Column | Meaning |
| --- | --- |
| `felles_total` | `round(Σ (felles_score × household_weight) / Σ (household_weights) × 10)` — missing felles counts as 0 in numerator |
| `your_total` | `round(Σ (your_score × user_weight) / Σ (user_weights for scored criteria) × 10)` |
| `partner_id` | The unique other member's user_id when household has exactly 2 members; otherwise NULL |
| `partner_total` | Same formula as `your_total`, applied to the partner's data |
| `your_score_count` | Number of criteria this user has scored on this property (drives the "X av 22" counter from `scoring`) |

The function performs an explicit membership check at the top, so
non-members get an empty set even though it runs as `SECURITY
DEFINER`. Divide-by-zero is avoided via NULLIF / null guards — the
caller surfaces "Ikke nok data" when totals are NULL.

`listProperties()` (server action) calls this RPC and applies the
client-friendly filters (status / price / BRA / område) and the
sort key (`felles | price | newest | your`) in JS. The dataset per
household is small enough that a Postgres-side filter would not pay
off, and the client-side approach keeps the SQL stable as we add UI
filters.

## Stub tables for downstream capabilities

The list function references tables defined by `weights`, `scoring`,
and `comparison`:

| Stub | Owning capability |
| --- | --- |
| `criterion_sections`, `criteria` | `weights` |
| `household_weights`, `user_weights` | `weights` |
| `property_scores` | `scoring` |
| `property_felles_scores` | `comparison` |

These are created as **empty tables** in
`20260501000004_properties_dependent_stubs.sql`. They have permissive
SELECT policies so the function compiles + reads without error and
**no INSERT/UPDATE/DELETE policies** (RLS-default deny).

When `weights` / `scoring` / `comparison` ship, those capabilities
will:

- Add seed data (criteria + sections), the AFTER-INSERT triggers on
  `households` and `household_members` for weight seeding, and the
  scoring history trigger.
- **Replace** the placeholder SELECT policies with capability-specific
  ones (e.g. `user_weights` SELECT → own rows only).
- Add INSERT / UPDATE policies that the stubs intentionally omit.

The stubs are documented inline in the migration file and in the
table COMMENTs (`STUB: defined in `properties` capability...`).

## Active household + role gating

The list page reads `useActiveHousehold()` to determine the FAB's
visibility — owner/member render the `+ Ny bolig` button; viewer does
not. The same hook is used by the Ny bolig form to look up the
caller's role and the Oversikt tab to decide whether the status badge
is interactive.

`Ny bolig` and the Oversikt danger zone also re-check role on the
server (the action falls back to the spec-locked Norwegian message
`Du har ikke tilgang til å legge til boliger` when RLS rejects an
insert/update/delete).

## Hard delete (D9)

Deleting a property removes the row and cascades to dependent tables
(`property_scores`, `property_felles_scores`, future `property_*` per
capability). The UI requires typing the keyword `slett`; the server
action re-checks the typed keyword as defence in depth before issuing
the DELETE.

## Where to look

| Concern | File |
| --- | --- |
| SQL — schema | `supabase/migrations/20260501000003_properties.sql` |
| SQL — stubs for downstream | `supabase/migrations/20260501000004_properties_dependent_stubs.sql` |
| SQL — list function | `supabase/migrations/20260501000005_properties_list_function.sql` |
| Types + message constants | `src/lib/properties/types.ts` |
| Validators (pure) | `src/lib/properties/validation.ts` |
| Server actions | `src/server/properties/*.ts` |
| UI — list page | `src/app/app/page.tsx` + `src/components/properties/PropertyListClient.tsx` |
| UI — Ny bolig | `src/app/app/bolig/ny/page.tsx` + `src/components/properties/NyBoligForm.tsx` |
| UI — Oversikt tab | `src/app/app/bolig/[id]/oversikt/page.tsx` + `src/components/properties/OversiktView.tsx` |
| UI — status / cards / FAB | `src/components/properties/{StatusBadge,StatusPicker,PropertyCard,FAB,FilterSheet}.tsx` |
| Tests — unit | `src/lib/properties/validation.test.ts` |
| Tests — integration (skipped) | `tests/integration/properties.test.ts` |
| Tests — e2e (fixmed) | `tests/e2e/properties.spec.ts` |
