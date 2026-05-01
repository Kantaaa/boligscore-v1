# Scoring — architecture notes

> Spec source: `openspec/changes/scoring/{proposal,design,specs/scoring/spec.md}.md`.
> Canonical criteria list: `docs/criteria.md`.

The `scoring` capability is what the product is built around: each
member of a household privately scores every property on the 22 shared
criteria, with autosave on chip tap. The data model keys on
`(property × user × criterion)` so partner scores are independent and
private until the `comparison` capability reconciles them.

This doc is a quick orientation for capability authors. The canonical
behaviour lives in the OpenSpec docs.

## Tables

```text
property_scores                — extended from STUB by 20260501000010
  property_id   uuid FK properties.id ON DELETE CASCADE
  user_id       uuid FK auth.users.id ON DELETE CASCADE
  criterion_id  uuid FK criteria.id ON DELETE RESTRICT
  score         int NOT NULL CHECK (score BETWEEN 0 AND 10)
  updated_at    timestamptz
  PRIMARY KEY (property_id, user_id, criterion_id)
  INDEX (property_id, user_id)               -- per-tab fetch

property_score_history         — NEW table from 20260501000010
  id           uuid PK
  property_id  uuid FK properties.id ON DELETE CASCADE
  user_id      uuid FK auth.users.id ON DELETE CASCADE
  criterion_id uuid FK criteria.id ON DELETE RESTRICT
  old_score    int NULL CHECK (between 0 and 10 or null)
  new_score    int NOT NULL CHECK (between 0 and 10)
  changed_at   timestamptz

property_section_notes         — NEW table from 20260501000010
  property_id  uuid FK properties.id ON DELETE CASCADE
  user_id      uuid FK auth.users.id ON DELETE CASCADE
  section_id   uuid FK criterion_sections.id ON DELETE RESTRICT
  body         text NOT NULL DEFAULT ''
  visibility   text NOT NULL DEFAULT 'private'
                  CHECK (visibility IN ('private','shared'))
  updated_at   timestamptz
  PRIMARY KEY (property_id, user_id, section_id)
```

`property_scores` is created as a STUB by the `properties` capability
(`20260501000004_properties_dependent_stubs.sql`) so the property list
function can join on it. The `scoring` migration extends it with the
history trigger and replaces the stub RLS with capability-specific
policies.

`property_score_history` and `property_section_notes` are NEW tables —
they are created in the `scoring` migration.

## History trigger (D2)

```sql
CREATE TRIGGER property_scores_history_trg
    AFTER INSERT OR UPDATE ON property_scores
    FOR EACH ROW
    WHEN (OLD IS NULL OR OLD.score IS DISTINCT FROM NEW.score)
    EXECUTE FUNCTION _scoring_score_history_fn();
```

The `WHEN` clause filters out no-op updates: when the user taps the
same chip twice, the UPDATE statement runs but `OLD.score = NEW.score`,
so no history row is written.

The trigger function is `SECURITY DEFINER` so it can write to
`property_score_history` even though the table has no API-level
INSERT policy — the trigger is the only writer, and it runs as the
table owner.

## RLS

| Table | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `property_scores` | member of property's household (any role) | `user_id = auth.uid()` AND owner/member role |
| `property_score_history` | `user_id = auth.uid()` AND member | none — trigger writes only |
| `property_section_notes` | member AND (`visibility='shared'` OR `user_id = auth.uid()`) | `user_id = auth.uid()` AND owner/member role |

The `property_scores` SELECT is permissive (any role, all users' rows)
because the `comparison` capability needs raw access to compute
`partner_total`. The Min vurdering tab uses
`get_property_with_scores()` which explicitly does NOT return partner
scores — only counts (D5).

The `property_section_notes` SELECT reads the `visibility` column so a
note flipped to `'shared'` automatically becomes visible to the
partner without further migration. MVP UI never writes
`'shared'` — that's a future change.

## get_property_with_scores SQL function

```sql
public.get_property_with_scores(p_property_id uuid, p_viewer_id uuid)
returns table (
    -- property fields ...
    your_score_count int,
    partner_id uuid,
    partner_score_count int,
    total_criteria int
)
```

`SECURITY DEFINER` + an explicit membership check at the top so a
non-member call returns the empty set rather than aggregated data.
The function returns `partner_score_count` (e.g. "Bob has scored
18 of 22") but NEVER the partner's individual scores — that's the
core privacy guarantee of the scoring capability.

`total_criteria` is computed from `SELECT count(*) FROM criteria` so
the counter remains correct if the catalog ever grows beyond 22 (it
won't in MVP, but the function is forward-compatible).

## Optimistic UI pattern (D3, D7)

The Min vurdering tab uses optimistic UI on chip tap: the chip fills
instantly, then the server action runs in a `useTransition`. On
success, the counter is synced from the server response (which
re-counts via SQL). On failure, the chip and counter both roll back
and an inline `<p role="alert">` displays the spec-locked Norwegian
message "Kunne ikke lagre — prøv igjen".

The notes textarea uses a different pattern (D8): autosave on blur +
1-second idle debounce while typing, with a `lagrer...` → `lagret`
indicator. We deliberately do NOT roll back the textarea text on
failure — that would be hostile (users can copy-recover their text).

## Files

- Migration: `supabase/migrations/20260501000010_scoring.sql`
- Server actions: `src/server/scoring/{setScore,clearScore,getMyScores,getMyNotes,setNote,getPropertyWithScores}.ts`
- UI:
  - `src/app/app/bolig/[id]/min-vurdering/page.tsx` — server component, fetches via `get_property_with_scores`.
  - `src/components/scoring/MinVurderingClient.tsx` — owns optimistic state + counter.
  - `src/components/scoring/ScoreChipRow.tsx` — 11 chips (0..10), 44px touch targets.
  - `src/components/scoring/SectionNotes.tsx` — autosave textarea.
  - `src/components/scoring/FaktaSection.tsx` — Pris/kvm, Størrelse, Alder; computed on the fly.
- Pure helpers: `src/lib/scoring/{types,fakta,validation}.ts`.
- Tests:
  - Unit: `src/lib/scoring/{fakta,validation}.test.ts`
  - Integration (skipped until harness): `tests/integration/scoring.test.ts`
  - E2E (`fixme` until seed): `tests/e2e/scoring.spec.ts`

## Out of MVP scope (data captured, UI deferred)

- **Historikk view**: data captured by the trigger from day 1; no UI.
- **Shared section notes**: schema and RLS support `visibility='shared'`,
  but no UI toggle to set it.
- **Per-criterion notes**: notes are per-section only.

## Conflicts to watch when `comparison` lands

- `comparison` will read `property_scores` directly (non-aggregated)
  to render the felles vs din columns. The `property_scores` SELECT
  RLS already allows that (any household member can SELECT any user's
  scores). `get_property_with_scores` from THIS capability is for the
  Min vurdering tab only and deliberately hides partner scores;
  `comparison` should NOT use it.
- The list function `get_property_list` from `properties` already
  returns a `partner_total`; that's fine — totals are non-leaky
  aggregates. Individual scores remain hidden from
  `get_property_with_scores`.
