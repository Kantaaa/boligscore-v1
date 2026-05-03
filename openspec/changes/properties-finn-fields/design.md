> Conventions: see `openspec/conventions.md`.

## Context

`properties-finn-import` shipped with a deliberately narrow field set. Round-A user feedback says the budget facts (felleskostnader, omkostninger, fellesgjeld) and the energy rating (energimerke) are the next-most-important. They live in FINN's "Nøkkelinfo" / "Økonomi" / "Energi" panels — predictable label strings, less reliable as JSON-LD. Manual users need the same fields available without going through FINN.

Constraints:
- **Schema additivity**: existing rows must remain valid. All new columns nullable.
- **No silent re-parse**: existing import flow runs the parser once on URL submit; this change keeps that.
- **Robustness**: FINN can rename labels. Use multi-string label matching (`"Felleskostnader"`, `"Felleskost/mnd."`, `"Felleskost"`).
- **Per-household dedupe**: same listing can legitimately exist across households (a friend's couple is also scoring it) — uniqueness is scoped to the household.

## Goals / Non-Goals

**Goals:**
- Add 8 fields to `properties` and to the parser, all nullable.
- Surface Kostnader on Oversikt; surface `felleskostnader` on PropertyCard.
- Reject same-finnkode re-imports per household (SQL + UX).
- Manual entry can fill all new fields without going through FINN.

**Non-Goals:**
- Re-parsing existing properties to backfill new fields.
- Backfilling `finnkode` from existing `finn_link` URLs.
- Adding any new external dependency — `cheerio` already covers the parsing.
- Currency conversion or price-history tracking.
- Validation of energimerke against year_built (could be useful later — out of scope).

## Decisions

### D1. Real columns, not a JSON sidecar

**Choice**: 8 new columns on `properties`, each typed appropriately. No `extra_fields jsonb`.

**Alternative considered**: a single `properties.extra jsonb` column.

**Rationale**: SQL filter/sort/aggregate stays trivial ("show me properties under 4M with felleskostnader < 5000"). Type safety in the TypeScript layer. RLS reuses the same row policy. The cost of 8 nullable columns on a small table is negligible. JSON would force every consumer to learn the inner shape.

### D2. `etasje` is text, not int

**Choice**: `etasje text` (nullable).

**Alternative considered**: `etasje_int int` + `etasje_total_int int` ("4 av 5") + a normalized accessor.

**Rationale**: FINN ships strings: `"4. etasje"`, `"1. etasje av 3"`, `"U. etasje"` (basement), `"Loft"`. Coercing to int loses meaning. A 20-char text column carries verbatim what FINN said and what the user wants to display. Sort/filter use cases (e.g. "ground-floor only") aren't on the roadmap.

### D3. Energimerke as two columns: letter + color

**Choice**: `energimerke_letter char(1)` + `energimerke_color text`. Both nullable. CHECK constraints:
- `energimerke_letter IN ('A','B','C','D','E','F','G')` when not null.
- `energimerke_color IN ('dark_green','light_green','yellow','orange','red')` when not null.

**Alternative considered**: one `energimerke jsonb`, or one `energimerke_code` enum like `A_dark_green`.

**Rationale**: separate cols are filterable and sortable independently. CHECK constraints catch parser bugs at write time. JSON would hide the shape; concatenated codes lose semantic clarity.

### D4. `finnkode` partial unique index per household

**Choice**: `CREATE UNIQUE INDEX properties_household_finnkode_uniq ON properties (household_id, finnkode) WHERE finnkode IS NOT NULL`.

**Alternative considered**: app-only check; or a unique constraint without the partial WHERE clause.

**Rationale**:
- Partial-WHERE allows multiple manually-entered (no finnkode) rows in the same household.
- Per-household scope lets two unrelated households score the same listing.
- SQL-level enforcement is belt-and-braces against race conditions in the app-level pre-check.

### D5. App-level dedupe pre-check before parse

**Choice**: in `POST /api/properties/parse-finn`, before fetching FINN, extract the finnkode from the URL and check `properties` for `(household_id = current, (finnkode = X OR finn_link = url))`. If found, return `{ ok: false, error: "Du har allerede denne boligen", existing_id }` with a 409 status.

**Alternative considered**: only enforce at insert time via D4's unique index.

**Rationale**: pre-check skips the FINN fetch entirely (saves a network round-trip + saves quota). Surfaces a friendlier error with a deep link to the existing property — far better UX than letting the user fill out the whole form just to be rejected at submit.

### D6. Parser: CSS-label fallback for nearly all new fields

**Choice**: parser tries JSON-LD first (in case FINN ever exposes these structurally), then falls back to label-based CSS extraction:
- `Felleskost/mnd.`, `Felleskostnader` → `felleskostnader`
- `Omkostninger` → `omkostninger`
- `Fellesgjeld`, `Andel fellesgjeld` → `fellesgjeld`
- `Tomteareal` → `tomteareal`
- `Etasje` → `etasje` (verbatim text)
- Energimerke widget → `energimerke_letter` + `energimerke_color` via DOM heuristics (badge with class containing energy-letter, plus the surrounding container's CSS class hinting at color tier).

**Rationale**: FINN's JSON-LD doesn't cover most of these. The label-based fallbacks already work for BRA / Byggeår; pattern is proven.

### D7. Energimerke parsing isolated in its own module

**Choice**: `src/lib/finn/extractEnergimerke.ts` with its own unit tests. Parses out `{ letter: 'A'..'G' | null, color: <enum> | null }` from a Cheerio root.

**Rationale**: it's the most fragile extractor (depends on FINN's badge widget structure). Isolating it makes targeted fixture-replacement easy when FINN changes the widget without touching the rest of the parser.

### D8. PropertyCard adds **only** `felleskostnader`, the rest go on Oversikt

**Choice**: PropertyCard renders `+ kr {felleskostnader} / mnd` under the price line, only when not null. Other new fields (omkostninger, fellesgjeld, tomteareal, etasje, energimerke) appear on the Oversikt tab in a Kostnader card.

**Rationale**: user direction — keep the card scannable, push detail to the click-through. Felleskostnader is uniquely card-worthy because it changes the felt monthly cost; everything else is one-time / contextual / status-y.

### D9. Kostnader card on Oversikt hides when fully empty

**Choice**: if every new column on the row is null, do not render the Kostnader card at all. Otherwise render with the populated lines only — never a row of `—`.

**Rationale**: existing properties + skip-the-form users shouldn't see an empty section. The card is a value-add when filled, noise when empty.

### D10. No `properties.image_url` re-touching

**Choice**: ignore image fields. `properties-images` already owns the photo story.

**Rationale**: keeping this change scope-clean.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Energimerke widget changes shape, parser silently returns null | D7's isolation + unit tests with multiple fixtures (A-dark_green, E-orange, missing). Manual fill always works. |
| Felleskostnader label varies ("Felleskost/mnd.", "Felleskost", "Felleskostnader") | Match all known variants in a single pass; log when no variant matches so we can add new aliases. |
| User has 50 existing properties from before this change → all new fields are null → Kostnader card hidden everywhere | Acceptable. They can fill manually on edit, or re-import. We don't auto-backfill. |
| Migration unique index fails because two duplicate (household_id, finnkode) rows already exist | Won't happen: `finnkode` column is brand new; every existing row has it null; partial WHERE excludes them. |
| Adding a partial unique index triggers a long lock on a hot table | `properties` is small (per-household, hundreds tops). Run as a normal migration; no concurrency story needed. |
| Dedupe check is racy across concurrent requests (two tabs open) | D4's SQL unique index is the backstop. App pre-check is for UX, not correctness. |
| `etasje` free text invites garbage ("ÅÅÅÅ") | Validate to ≤20 chars and visually trimmed. Free-text is the only realistic option. |

## Resolved decisions

### D11. Field display order on Oversikt Kostnader card

**Choice**: top-to-bottom: felleskostnader, omkostninger, fellesgjeld, energimerke, tomteareal, etasje. Money first (most decision-relevant), then energi, then physical specs.

**Rationale**: matches the order users will scan when shopping on monthly cost.
