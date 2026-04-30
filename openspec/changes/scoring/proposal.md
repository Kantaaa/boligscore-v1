> Conventions: see `openspec/conventions.md`.

## Why

The whole point of v2 is **independent partner scoring** — Ine and Kanta each score the same property without seeing each other's numbers, then reconcile in `comparison`. v1 stores a single set of scores per property, which makes that flow impossible. Scoring needs to be re-modeled as `(property_id, user_id, criterion) → score` so each member's vurdering is private and standalone, and the UI needs to be a touch-friendly chip-rad on mobile that autosaves as the user taps. Every change to a score is **logged** so the household can see how a vurdering evolved over time.

## What Changes

- **BREAKING**: Scores live in a `property_scores` table keyed by `(property_id, user_id, criterion_id)`. Not a column on `properties`.
- 22 scoring criteria, grouped in three sections (matching the design brief):
  - **Bolig innvendig**: kjøkken, bad, planløsning, lys/luftighet, oppbevaring, stue, balkong/terrasse.
  - **Beliggenhet & område**: områdeinntrykk, nabolagsfølelse, offentlig transport, skoler/barnehager.
  - **Helhet**: inntrykk på visning, potensial.
  - **Fakta** (auto-derived, not scored): pris/kvm, størrelse, alder.
- UI per criterion: label + short description + **chip-rad 0–10** (11 chips). Selected chip filled in primary color. Touch target ≥ 44×44px.
- **Autosave** on tap with subtle "lagret" indicator. No save button. Debounce timing is an implementation detail — pick something reasonable.
- Counter at top of `Min vurdering` tab: `13 av 22 kriterier scoret`. Unscored rows render greyed out with `— (ikke scoret)`.
- **No locking** — scores remain editable any time. Either partner can revise their own scores after seeing the comparison.
- **Change log**: every score insert/update is recorded in `property_score_history(id, property_id, user_id, criterion_id, old_score, new_score, changed_at)`. Used later for a "Historikk" view (UI for the log is **out of MVP scope** — only the data is captured from day 1).
- **Section notes**: "huskelapp" textarea per section. Default `visibility = 'private'` (only the author sees it). Schema includes a `visibility` field with future values (`'shared'`) so we can flip notes to partner-visible later without a migration.

## Capabilities

### New Capabilities
- `scoring`: 22-criteria scoring per user, autosave, counter, section notes (private in MVP, shareable in schema), change log capture, `Min vurdering` tab UI.

### Modified Capabilities
<!-- None - replaces v1's score column with a per-user score table. -->

## Out of MVP scope (future)

- **Historikk view**: UI to browse score change history. Data captured from day 1, view added later.
- **Shared section notes**: data model supports it (`visibility = 'shared'`), but UI toggle and display added later.

## Impact

- **Database**:
  - `property_scores(property_id, user_id, criterion_id, score, updated_at)`.
  - `property_score_history(id, property_id, user_id, criterion_id, old_score, new_score, changed_at)` — written via DB trigger on insert/update of `property_scores`.
  - `property_section_notes(property_id, user_id, section_id, body, visibility, updated_at)`.
  - `criteria` lookup table (id, key, section_id, label, description, sort_order) and `criterion_sections` (id, key, label, description, sort_order). Seeded with the 22 + 3 from the brief.
- **UI**: new `<ScoreChipRow>` component, new `<MinVurderingTab>` page, section accordions or scrollable sections, "lagret" indicator.
- **Math**: total score becomes a derived value — see `comparison` for how individual + felles totals are calculated.
- **Dependencies**: requires `households` (private to user within household), `properties` (foreign key). Blocks `comparison`, consumed by any totalscore display.
