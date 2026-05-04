> Conventions: see `openspec/conventions.md`.

## Why

The MVP `properties-finn-import` parser extracts the 9 most basic fields (address, price, BRA, primærrom, bedrooms, bathrooms, year_built, property_type, image_url). It deliberately deferred everything else as "best-effort" / "fill in manually". User feedback after round A is that the **budget-relevant** facts on every FINN ad — felleskostnader, omkostninger, fellesgjeld — are exactly what couples compare on, and asking users to retype them defeats the auto-fill promise. Energy rating (energimerke) is the next most-asked-about fact because it foreshadows monthly heating cost.

Manual entry users hit the same gap: there's no place to put these numbers today, so they end up scribbled in scoring notes or left out entirely.

## What Changes

- **Schema**: add 8 nullable columns to `properties` — `felleskostnader` (int, NOK/mnd), `omkostninger` (int, NOK), `fellesgjeld` (int, NOK), `tomteareal` (int, m²), `etasje` (text — FINN ships strings like "4. etasje" or "U."), `energimerke_letter` (char(1), `A`..`G`), `energimerke_color` (text, one of `dark_green`/`light_green`/`yellow`/`orange`/`red`), `finnkode` (int).
- **Partial unique index** on `(household_id, finnkode) WHERE finnkode IS NOT NULL` so re-importing the same listing in the same household is rejected at the SQL level.
- **Server-side dedupe check** in the FINN import flow: before parsing, look up `finn_link` or `finnkode` against the user's household — if a match exists, surface "Du har allerede denne boligen" with a link to it (no parse, no insert).
- **Parser**: extend `ParsedListing` and `parseFinnHtml` to populate the eight new fields. JSON-LD-first where the data exists (rare for these fields); otherwise CSS-label fallback against FINN's standard "key facts" rows. Missing fields stay null per the existing partial-success contract (D8 of `properties-finn-import`).
- **NyBoligForm**: add the new fields to the manual section so non-FINN entries can fill them too. Group them as a "Kostnader" block + an "Energi"-row (compact dropdown for letter + color).
- **Oversikt**: add a "Kostnader" card showing felleskostnader, omkostninger, fellesgjeld, energimerke, tomteareal, etasje when set. Anything null hidden, not shown as `—`.
- **PropertyCard**: add `felleskostnader` underneath the price line (compact: `+ kr 4 250 / mnd`). Rest only on the detail view per user direction "keep cards simple".

## Out of MVP scope (future)

- **Re-parse on URL change** — still deferred (carried from `properties-finn-import`).
- **Multiple gallery images** — still deferred (`properties-images-gallery` later).
- **Full description text + agent / megler info** — low signal-to-noise for scoring decisions; users have notes for free-form context.
- **Visningstider / open-house dates** — too volatile, would go stale.
- **Backfilling `finnkode` for existing rows** — added column stays null; no migration of historical rows. If a user wants to dedupe an old listing, re-import it.
- **Unit conversion / price normalization** — store FINN's value verbatim. Currency is always NOK.
- **i18n of new field labels** — Norwegian only, hardcoded JSX literals per `conventions.md`.

## Capabilities

### New Capabilities
- `properties-finn-fields`: schema migration for the 8 columns + partial unique index, parser extensions, dedupe check in import flow, Kostnader block in NyBoligForm, Kostnader card on Oversikt, felleskostnader line on PropertyCard.

### Modified Capabilities
- `properties`: `properties` table gains 8 columns + a partial unique index; manual entry form gains a Kostnader block and an Energi row; Oversikt gains a Kostnader card; PropertyCard adds a felleskostnader line under the price.
- `properties-finn-import`: `ParsedListing` extends with 8 new keys; `parseFinnHtml` populates them best-effort; the parse-FINN flow gains a pre-parse dedupe check against `finn_link` / `finnkode`.

## Impact

- **Database**: one migration adds 8 nullable columns + 1 partial unique index. No data backfill. No existing-row impact.
- **Backend**: `src/lib/finn/types.ts` `ParsedListing` widens (additive, won't break callers). `src/lib/finn/parse.ts` gains 8 new field extractors. New module `src/lib/finn/extractEnergimerke.ts` (separate because of the letter+color pairing). Server action `createProperty` and the parse-FINN route both get a dedupe check.
- **UI**: NyBoligForm gains a "Kostnader" section + an "Energi" row; Oversikt gains a Kostnader card; PropertyCard gains one line. No new pages.
- **Tests**: parser unit tests (against existing fixtures + a new one with energimerke + costs filled in); migration smoke test; e2e test for the dedupe path.
- **Storage / cost**: zero — schema only.
- **Privacy**: no new PII. All fields are public listing facts.
- **Compatibility**: existing properties with all-null new fields render the same as today (Kostnader card hidden when empty, PropertyCard felleskostnader line hidden when null).
