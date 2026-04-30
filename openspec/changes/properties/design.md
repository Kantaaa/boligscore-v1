> Conventions: see `openspec/conventions.md`.

## Context

In v2, every property belongs to a household, not a user. The MVP focuses on **manual entry** with **status workflow** so the household can see where each candidate stands at a glance — FINN-import and image upload are explicitly deferred. The detail page has tabs (`Oversikt | Min vurdering | Sammenligning | Kommentarer | Notater`); this capability owns `Oversikt`, the list view, the empty state, and the property entity itself. Other tabs are owned by `scoring`, `comparison`, and (future) `comments`/`notes` capabilities.

## Goals / Non-Goals

**Goals:**
- Property entity owned by `household_id`, with status, address, prisinfo, størrelse, basis-fakta.
- Manual `Ny bolig` form (single page, sectioned).
- Status as an **extensible lookup table** seeded with the 7 default values.
- List view (`/app`) with sort, filter, search, status badges.
- Property detail `Oversikt` tab showing facts + status (auto-redirect from `/app/bolig/[id]` per `navigation-shell`).
- Empty state with "Legg til første bolig" CTA.
- `added_by` field surfaced in UI as "Lagt til av X".
- Cards and badges meet a11y floor (icon + text + color, never just color).

**Non-Goals:**
- **FINN-import** — separate follow-up change (`properties-finn-import`). The "Fra FINN-lenke" tab on the create form is shown but inactive in MVP; design brief preserved by storing `finn_link` as plain text users can paste.
- **Image upload / per-property photo gallery** — separate follow-up change (`properties-images`). MVP shows a placeholder thumbnail per property card.
- **Kommentarer tab** content — placeholder route only; full comments/threading comes later.
- **Notater tab** content — placeholder route only; private per-user notes (different scope from scoring's section notes).
- **Property archiving** — soft-delete with archive view. MVP supports hard delete with typed-name confirmation (smaller-blast-radius variant: typed `bolig` keyword, since "type the address" is too long).

## Decisions

### D1. Status as a lookup table, not a database enum

**Choice**: `property_statuses` table with `(id, household_id NULLABLE, label, color, icon, is_terminal, sort_order)`. `household_id NULL` = global / built-in status; non-null = household-specific override or addition. Seeded with the 7 default values as global rows.

**Alternative considered**: Postgres `ENUM` type.

**Rationale**: extensibility is a stated requirement. Adding a new status to a Postgres enum requires `ALTER TYPE ... ADD VALUE`, which can't run inside a transaction in older versions and is annoying. A lookup table is more flexible and lets households add custom statuses later without schema changes. Cost: an extra join on every property read — negligible at this scale.

### D2. Address is a single freeform string

**Choice**: `properties.address TEXT NOT NULL`.

**Alternative considered**: structured fields (street, number, postal code, city).

**Rationale**: Norwegian addresses have edge cases (rural addresses, gnr/bnr, hytte at "Veien til hytta"). A freeform field handles all of them. We can add structured parsing if/when FINN-import lands. For now, search is text-based against the freeform field, which works fine for the household's small list.

### D3. List view uses a single SQL view for derived totals

**Choice**: create a Postgres view `property_list_view` joining `properties` with computed `felles_total`, `din_total`, the partner's score (if any), and the active user's score count. The list query selects from this view filtered by `household_id` and the active user.

**Alternative considered**: compute totals client-side after fetching scores.

**Rationale**: list view sorts by `Felles total` by default — sorting on a derived value requires either client-side sort on a fully-loaded dataset (fine for a household's small list, but messy for pagination later) or a server-side computed column. The view is clean SQL, gets indexed nicely, and survives the move to pagination.

### D4. Default sort with `NULLS LAST`

**Choice**: list default sort is `felles_total DESC NULLS LAST`. Properties without a felles total (no scoring done yet) appear at the bottom.

**Rationale**: a property with no scores isn't ranked; pushing them to the bottom matches the user's mental model of "things I've evaluated".

### D5. Filter UI: bottom sheet on mobile, popover on desktop

**Choice**: same component, different presentation via Tailwind responsive classes. Mobile: full-width sheet sliding up from bottom. Desktop: popover anchored to the filter button.

**Rationale**: brief explicitly says "Filter-panel (bottom sheet på mobil, popover på desktop)". Use Headless UI's `Dialog` component primitive — it supports both presentations with the same accessibility behavior (focus trap, escape to close).

### D6. `added_by` field, surfaced in UI

**Choice**: `properties.added_by uuid REFERENCES auth.users(id)`. Display as "Lagt til av Ine" on the property card and Oversikt tab.

**Rationale**: small attribution helps the household remember who scouted what (especially when one partner does most of the FINN-scrolling).

### D7. Year built validation

**Choice**: `year_built INT CHECK (year_built BETWEEN 1800 AND extract(year FROM now())::int + 5)`.

**Rationale**: most Norwegian housing is from after 1800; +5 years allows for under-construction listings. Catches obvious typos like `2030` for a `2003` property.

### D8. Default status = `vurderer`

**Choice**: when a property is created without an explicit status, default is `vurderer`.

**Rationale**: matches the brief's framing — adding a property means you're considering it. `favoritt` is something you upgrade to deliberately.

### D9. Hard delete with confirmation, not soft archive

**Choice**: deleting a property removes the row and cascades to scores, felles-scores, notes for that property. UI requires typing `slett` (or a similar keyword) to confirm.

**Alternative considered**: soft delete with `archived_at`.

**Rationale**: same reasoning as households deletion (D11 there). Simpler schema. Typed-keyword modal makes accidents implausible. Future "archived list" is easy to add later via `archived_at` if users ask for undo.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| `property_statuses` global rows accidentally edited by RLS bypass | Global rows have `household_id IS NULL`; RLS denies updates/deletes when `household_id IS NULL` regardless of caller. |
| Sort by `felles_total` is expensive without scoring data | View pre-computes, indexed on `(household_id, felles_total DESC NULLS LAST)`. At scale beyond this — cache. |
| User adds a custom status, then deletes it while properties reference it | `property_statuses` referenced via `RESTRICT` — cannot delete a status with referencing rows. UI surfaces this as "Du må flytte boligene til en annen status før du sletter denne." |
| Address freeform → search misses on misspellings | Use `ILIKE` for case-insensitive substring search. Add Postgres trigram index later if needed. |
| Year built CHECK breaks if app runs past 2030 without re-evaluation | The CHECK is `extract(year FROM now())::int + 5` — dynamic, recomputed on each insert, no maintenance. |
| `added_by` user is later removed from household | Membership change doesn't break the FK (FK is to `auth.users`, not `household_members`). UI handles missing-member case as "Lagt til av tidligere medlem". |

## Resolved Decisions

### D10. The "Fra FINN-lenke" tab is hidden in MVP

**Choice**: design brief implies a two-tab create form, but in MVP we render only the Manual tab. The `Fra FINN-lenke` tab is implemented as a stub that returns "Kommer snart — bruk manuell registrering for nå." or simply hidden behind a feature flag. Going with **hidden** — fewer dead UIs.

**Rationale**: a stub tab clutters the UI and invites support questions. Add it back when the FINN-import follow-up ships.

### D11. Empty `Kommentarer` and `Notater` tabs render placeholders

**Choice**: these tabs render a "Kommer snart" empty-state component in MVP. They are NOT removed from the tab strip — the design brief locks the five-tab structure and we don't want to break it now and add tabs later.

**Rationale**: stable UX during the v2 rollout. Users see what's coming.
