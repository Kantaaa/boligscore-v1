> Conventions: see `openspec/conventions.md`.

## Context

Scoring is the **act** the product is built around — the user opens a property, taps through 22 chip-rad sliders to record their gut feeling, and walks away with a structured opinion they can later compare with their partner. v1 stored a single set of scores per property; v2 stores `(property × user × criterion)` so each member's vurdering is independent and private until they hit the `Sammenligning` tab. Scoring needs to feel **fast and forgiving** on mobile: chip taps, autosave, no commit step, ability to revise indefinitely, and a counter that says "X av 22 scoret" so users know where they stand.

## Goals / Non-Goals

**Goals:**
- 22-criteria scoring per user × property, persisted in `property_scores`.
- `Min vurdering` tab at `/app/bolig/[id]/min-vurdering` with chip-rad UI.
- Autosave on chip tap; no commit / submit step.
- Counter showing scored / total.
- Section notes (one short textarea per section) — `private` by default, schema supports `shared` value for future change.
- Change log captured for every score insert/update via DB trigger (history UI is out of MVP scope).
- Fakta section auto-derived (pris/kvm, størrelse, alder) — read-only display.

**Non-Goals:**
- **Locking / "I'm done scoring" state** — explicitly rejected; scores remain editable.
- **Historikk view** — UI to browse score history. Data captured from day 1 but no UI in MVP.
- **Shared section notes** — schema supports it (`visibility = 'shared'`), no UI toggle in MVP.
- **Per-criterion comments** — different from section notes; if needed, future change.
- **Score revisions tied to property edits** — if a property's address changes, scores stay; we don't snapshot.

## Decisions

### D1. Score table keyed on (property × user × criterion)

**Choice**: `property_scores(property_id, user_id, criterion_id, score INT 0..10, updated_at)`. Composite primary key.

**Rationale**: every score is uniquely identified by who scored which criterion on which property. Upserts on score change are simple `INSERT ... ON CONFLICT (property_id, user_id, criterion_id) DO UPDATE`.

### D2. History captured by trigger, not application code

**Choice**: `property_score_history(id, property_id, user_id, criterion_id, old_score, new_score, changed_at)` populated by `AFTER INSERT OR UPDATE` trigger on `property_scores`.

**Alternative considered**: write history rows from server actions.

**Rationale**: triggers are atomic with the score change and impossible to skip. Server-side history writes can be bypassed by direct DB writes (data import scripts, future bulk operations) and would be silently incomplete. Triggers are bullet-proof.

### D3. Autosave on chip select

**Choice**: when the user taps a chip, fire the upsert immediately (no debounce). Optimistic UI: chip fills before the round-trip completes; if the request fails, revert + show inline error.

**Alternative considered**: debounce 500ms (saves on rapid retap).

**Rationale**: rapid retaps are rare — a user tapping 7 then realizing they meant 8 is two events, not 50. The debounce was a v1 carryover assumption. Optimistic UI hides round-trip latency and the round-trip cost is small (single row upsert).

### D4. Section notes: `visibility` field with `'private'` default

**Choice**: `property_section_notes(property_id, user_id, section_id, body, visibility, updated_at)` with `visibility CHECK IN ('private','shared') NOT NULL DEFAULT 'private'`. Composite key `(property_id, user_id, section_id)`.

**Rationale**: future-ready without UI changes today. RLS on the SELECT side reads `(visibility = 'shared') OR (user_id = auth.uid())`. Today every read returns only your own; tomorrow the same RLS lets shared notes through.

### D5. Counter computed in the SQL function, not client-side

**Choice**: the property list function (`get_property_list` from `properties` capability) and a single-property function (`get_property_with_scores`) include `your_score_count` (int 0–22). The client renders the counter from this value.

**Rationale**: avoids fetching all 22 score rows just to count them. The function is the single source of truth used by both the list cards and the `Min vurdering` tab counter.

### D6. Fakta section is presentational only

**Choice**: `Fakta` (pris/kvm, størrelse, alder) is rendered above or below the scored sections with read-only values. No `criterion` rows, no scoring possible.

**Rationale**: the brief explicitly says "auto-beregnet, read-only". Treating these as scored criteria would inflate the criterion count and pollute the math.

### D7. Optimistic UI with fail-on-conflict

**Choice**: client renders the new chip state instantly; rolls back if the server returns an error. Errors include a short Norwegian toast: "Kunne ikke lagre — prøv igjen".

**Rationale**: optimistic UI is what makes the chip-rad feel snappy. The simple rollback covers transient failures; users can re-tap.

### D8. Section notes textarea autosave with debounce

**Choice**: notes textarea autosaves on `blur` and on a 1-second idle debounce while typing. Indicator shows "lagrer..." → "lagret" on completion.

**Rationale**: notes are typed text, not chip taps. Saving on every keystroke is wasteful; saving only on blur risks losing data on accidental nav. Debounced save + blur = good middle ground.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Trigger writes history row even when score is unchanged (e.g. user taps the same chip twice) | Trigger condition: `WHEN (OLD.score IS DISTINCT FROM NEW.score)`. No-op updates produce no history entry. |
| Optimistic UI shows wrong state if server denies | Client awaits the server response; on failure, rolls back to previous score and shows toast. Non-blocking — user can retry. |
| Counter is stale if scores change in another tab | Counter is fetched on `Min vurdering` mount and after each save (since save returns the updated count). Tab-focus refresh handles cross-tab drift. |
| User adds a criterion via DB tinkering → counter goes above 22 | `criteria` is read-only in MVP (RLS denies non-service-role writes). Counter shows actual count vs `criteria.count`. |
| Section notes visibility = 'shared' set incorrectly via DB | RLS only allows the user themselves to UPDATE the row, so visibility can't be changed by partner. Future UI flip is the correct path. |
| Score history grows unbounded | Acceptable in MVP. Add monthly partitioning or pruning later if it becomes a problem (it won't at single-household scale). |
| User scoring on flaky network → optimistic shows score, server save fails, user thinks it saved | Toast is visible; chip rolls back. If they don't notice, the next pageview will show the absent score. Worth a "show inline indicator if any score has unsynced state" upgrade if it becomes a real problem. |

## Resolved Decisions

### D9. Section notes are one per section, not one per criterion

**Choice**: textarea attaches to a section (e.g. `Bolig innvendig`), not to each criterion. Brief calls these "huskelapp" — quick reminders. One per section is enough granularity.

**Rationale**: per-criterion notes would be 22 textareas which is too many. One per section keeps the UI simple.

### D10. Fakta values are computed on the fly, not stored

**Choice**: `pris/kvm` = `price / bra` (handle null bra), `størrelse` = `bra`, `alder` = `current_year - year_built` (handle null year). All computed in the SQL function or client-side.

**Rationale**: storing derived data is a footgun — it can drift from its source. Compute on read; cheap.
