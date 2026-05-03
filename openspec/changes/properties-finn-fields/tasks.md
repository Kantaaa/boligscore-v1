> Conventions: see `openspec/conventions.md`.

## 1. Schema migration

- [ ] 1.1 Create `supabase/migrations/<timestamp>_properties_finn_fields.sql` adding 8 nullable columns: `felleskostnader int`, `omkostninger int`, `fellesgjeld int`, `tomteareal int`, `etasje text`, `energimerke_letter char(1)`, `energimerke_color text`, `finnkode int`.
- [ ] 1.2 Add CHECK constraints: `energimerke_letter IN ('A','B','C','D','E','F','G')` (allowing null) and `energimerke_color IN ('dark_green','light_green','yellow','orange','red')` (allowing null).
- [ ] 1.3 Add `etasje` length constraint: `CHECK (etasje IS NULL OR length(etasje) <= 20)`.
- [ ] 1.4 Add partial unique index: `CREATE UNIQUE INDEX properties_household_finnkode_uniq ON properties (household_id, finnkode) WHERE finnkode IS NOT NULL`.
- [ ] 1.5 Re-run `supabase db reset` locally; verify migration applies cleanly + seed.sql still loads.

## 2. Types + parser

- [ ] 2.1 Extend `src/lib/finn/types.ts` `ParsedListing` with the 8 new fields (all `| null`). Extend `ParsedListingKey` union.
- [ ] 2.2 Add label-based extractors in `src/lib/finn/parse.ts`: `extractFelleskostnader`, `extractOmkostninger`, `extractFellesgjeld`, `extractTomteareal`, `extractEtasje`. Reuse `findLabelledValue` + Norwegian-int parsing where applicable.
- [ ] 2.3 New module `src/lib/finn/extractEnergimerke.ts` exporting `(($: cheerio.CheerioAPI) => { letter: 'A'|...|'G'|null, color: <enum>|null })`. Strategy: look for FINN's energy badge by class/data-attr; fall back to scanning text content for "Energimerking: A" patterns.
- [ ] 2.4 Add `extractFinnkode` — parse the URL query string first; fall back to scanning page for `finnkode=<digits>`.
- [ ] 2.5 Wire all new extractors into `parseFinnHtml`'s merge pipeline. Add each populated key to `extracted_fields`.

## 3. Dedupe pre-check

- [ ] 3.1 Add `src/server/properties/findExistingByFinnRef.ts` exporting `findExistingByFinnRef(householdId: string, url: string): Promise<{ id: string } | null>`. Logic: derive `finnkode` from URL; query `properties` where `household_id = X AND (finnkode = Y OR finn_link = url)`; return first match.
- [ ] 3.2 In `src/app/api/properties/parse-finn/route.ts`, after auth + URL validation but before `fetchFinnHtml`, call `findExistingByFinnRef`. On match, return `{ ok: false, error: "Du har allerede denne boligen", existing_id }` with status 409.
- [ ] 3.3 Add a Norwegian message constant to `FINN_ERROR_MESSAGES`: `alreadyOwned: "Du har allerede denne boligen"`.

## 4. NyBoligForm — Kostnader + Energi inputs

- [ ] 4.1 Add a "Kostnader" section under the existing manual fields with three int inputs: Felleskost/mnd, Omkostninger, Fellesgjeld. Use the existing `<NumberInput>` (or equivalent) — Norwegian thousand-separator formatting, accept blank.
- [ ] 4.2 Add a "Tomteareal" int input + an "Etasje" text input (max 20 chars). Place under "Boligdetaljer" group.
- [ ] 4.3 Add an "Energimerke" pair: `<select>` for letter (A..G + blank) and `<select>` for color (5 colors + blank). Display them inline. Both independently nullable.
- [ ] 4.4 Wire form submit through to `createProperty` server action — extend its input schema and insert payload to include the 8 new fields.
- [ ] 4.5 On a successful FINN parse (after the route returns), populate the new fields in form state alongside the existing ones. Update the prefill notice to count populated new fields too.

## 5. Oversikt — Kostnader card

- [ ] 5.1 New component `src/components/properties/KostnaderCard.tsx` taking the 6 display fields. Render lines for non-null values only. Letter + color render as a small colored pill (e.g. green pill with "A" inside).
- [ ] 5.2 Mount `<KostnaderCard>` on the Oversikt tab below the address heading. Hide entirely when all 6 fields null.
- [ ] 5.3 Add a tiny utility `src/lib/properties/formatNok.ts` for `kr 4 250 / mnd` formatting (Norwegian non-breaking space thousand sep).

## 6. PropertyCard — felleskostnader line

- [ ] 6.1 In `PropertyCard.tsx`, under the price line, conditionally render `+ kr {felleskostnader} / mnd` when `felleskostnader != null`.
- [ ] 6.2 Visual review: card height should not jump when felleskostnader missing — verify with a fixture-style test rendering both cases.

## 7. Server action + edit flow

- [ ] 7.1 Extend `createProperty` server action to accept the 8 new optional fields and insert them.
- [ ] 7.2 Extend the property edit flow on Oversikt (the existing form) so all 8 new fields are editable post-creation. Same validation as create.
- [ ] 7.3 `listProperties` and `getProperty` server methods select the new columns and pass through to the client.

## 8. Tests

- [ ] 8.1 **Unit (Vitest)**: extractors (`extractFelleskostnader`, etc.) against label-row HTML snippets. Cover blank, present, multiple variants of label text.
- [ ] 8.2 **Unit**: `extractEnergimerke` — fixture for A/dark_green, E/orange, missing widget; partial (letter only).
- [ ] 8.3 **Unit**: `extractFinnkode` — URL parse, page-text fallback, neither path matches (returns null).
- [ ] 8.4 **Unit**: `parseFinnHtml` end-to-end against an extended fixture containing all 8 new fields. Assert `extracted_fields` includes the new keys.
- [ ] 8.5 **Integration / Route**: `POST /api/properties/parse-finn` dedupe path — happy-path 200 when no existing match, 409 when `finnkode` matches, 409 when `finn_link` matches. Asserts no outbound fetch in the 409 cases.
- [ ] 8.6 **Integration**: insert via server action with all 8 fields set; round-trip select returns the same values.
- [ ] 8.7 **Integration**: insert two rows in same household with same `finnkode` — second SHALL fail with the unique-violation error.
- [ ] 8.8 **E2E (Playwright)**: paste a FINN URL → form prefills new Kostnader + Energi fields → save → Oversikt shows the Kostnader card + PropertyCard shows felleskostnader line.

## 9. Documentation

- [ ] 9.1 Update `docs/architecture/finn-import.md` with the 8 new fields, the `extractEnergimerke` module, and the dedupe pre-check.
- [ ] 9.2 Update the `properties-finn-import` proposal `## Out of MVP scope` section: remove "deep field extraction (omkostninger, felleskostnader, primærrom split) is best-effort" since these now extracted explicitly.
- [ ] 9.3 README: under "Adding a property", note the dedupe behavior ("if you've already added this listing, we'll show you the existing one instead of duplicating").

## 10. Operational

- [ ] 10.1 Add a `// TODO(monitoring)` comment near the new extractors noting where to add a Sentry/log call when an extractor returns null repeatedly. Same pattern as `properties-finn-import` task 8.2 — actual instrumentation deferred.
- [ ] 10.2 Manual smoke check on at least 3 distinct FINN listings of different property types (leilighet, enebolig, rekkehus). Record which fields each one populated in a comment in the PR description.
