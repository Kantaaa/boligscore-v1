> Conventions: see `openspec/conventions.md`.

## Why

In v1, adding a property means filling out a manual form. v2 keeps the manual form for MVP and adds **status workflow** (favoritt → vurderer → på visning → i budrunde → bud inne → kjøpt / ikke aktuell) so the household can see where each candidate stands at a glance. Properties must be owned by the household, not a user, so partners share the same list. **FINN-import and image upload are deferred** to later phases — manual entry is the MVP path.

## What Changes

- Property records owned by `household_id` (depends on `households` capability).
- **Manual entry form** (only path in MVP), grouped in sections per the design brief:
  - Adresse & FINN-lenke (URL field stored as plain text; no parsing in MVP).
  - Prisinfo (totalpris, omkostninger, felleskostnader).
  - Størrelse (BRA, primærrom, soverom, bad).
  - Basis-fakta (byggeår, boligtype, etasje).
  - Status (dropdown — see below).
- **Status as an extensible lookup table** (`property_statuses`), not a hard DB enum. Seeded with the 7 default values from the brief but new statuses can be added per-household or globally without a schema migration.
  - Default seeds: `favoritt`, `vurderer`, `på visning`, `i budrunde`, `bud inne`, `kjøpt`, `ikke aktuell`.
  - Each status has: id, label, color, icon, is_terminal (true for `kjøpt`/`ikke aktuell`), sort_order.
- Status badge shown on every property card. Always **icon + text + color** (color-only is an a11y violation per the brief).
- `added_by` field (FK to `auth.users`) — which household member added the property, shown subtly on the card/detail (e.g. "Lagt til av Ine").
- List view (forsiden):
  - Sorting: `Felles total` (default) | `Pris` | `Nyeste først` | `Din score`.
  - Filter sheet: status, prisspenn, BRA-spenn, område (text).
  - Search field (adresse, kommentar, notat).
- Card layout: address, `Pris • BRA • byggeår`, `Felles: 78 • Din: 76`, status-badge, "lagt til av X". (No image in MVP — placeholder illustration.)
- Detail view structured as tabs: `Oversikt` (this capability) | `Min vurdering` (scoring) | `Sammenligning` (comparison) | `Kommentarer` | `Notater`.
- Empty state: illustration + "Ingen boliger ennå" + CTA `+ Legg til bolig`.

## Out of MVP scope (future changes)

- ~~**FINN-import**: paste FINN URL → server-side parse → prefill form.~~ Shipped via the separate `properties-finn-import` capability — see `openspec/changes/properties-finn-import/`.
- **Image upload**: per-property photo gallery via Supabase Storage. Will be a separate `properties-images` change. MVP shows a placeholder thumbnail.
- **Property comments thread** (`Kommentarer` tab content): tab placeholder in MVP, full comments capability later.

## Capabilities

### New Capabilities
- `properties`: property entity, manual entry, extensible status workflow, list view (sort/filter/search), detail Oversikt tab, empty state.

### Modified Capabilities
<!-- None - this is greenfield. -->

## Impact

- **Database**: `properties(id, household_id, address, finn_link, status_id, price, costs, monthly_costs, bra, primary_rooms, bedrooms, bathrooms, year_built, property_type, floor, added_by, created_at, updated_at)`. New `property_statuses(id, household_id NULL for global, label, color, icon, is_terminal, sort_order)`. Index on `(household_id, status_id)` for list queries.
- **UI**: replace v1 modal-based form with full-page `Ny bolig` flow. New `PropertyCard` design with status badge. New filter bottom sheet.
- **Routes**: `/app` (list), `/app/bolig/ny`, `/app/bolig/[id]` (with tab subroutes).
- **Dependencies**: requires `households`. Blocks `scoring`, `comparison`.
