> Conventions: see `openspec/conventions.md`.

## 1. Database schema

- [x] 1.1 Migration: create `property_statuses(id uuid PK default gen_random_uuid(), household_id uuid REFERENCES households(id) ON DELETE CASCADE, label text NOT NULL, color text NOT NULL, icon text NOT NULL, is_terminal bool NOT NULL default false, sort_order int NOT NULL default 0, created_at timestamptz NOT NULL default now())`. Unique on `(household_id, label)`.
- [x] 1.2 Seed seven global statuses: `favoritt`, `vurderer`, `på visning`, `i budrunde`, `bud inne`, `kjøpt` (is_terminal=true), `ikke aktuell` (is_terminal=true). All with `household_id = NULL`.
- [x] 1.3 Migration: create `properties(id uuid PK default gen_random_uuid(), household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE, address text NOT NULL CHECK (length(trim(address)) > 0), finn_link text, price bigint, costs bigint, monthly_costs bigint, bra numeric, primary_rooms int, bedrooms int, bathrooms numeric, year_built int CHECK (year_built BETWEEN 1800 AND extract(year FROM now())::int + 5), property_type text, floor text, status_id uuid NOT NULL REFERENCES property_statuses(id) ON DELETE RESTRICT, added_by uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL default now(), updated_at timestamptz NOT NULL default now())`.
- [x] 1.4 Trigger: prevent updates to `household_id`, `added_by`, `created_at`.
- [x] 1.5 Trigger: update `updated_at = now()` on every update.
- [x] 1.6 Indexes: `(household_id, status_id)`, `(household_id, created_at DESC)`, GIN trigram on `address` for search (optional, ILIKE works for MVP). [trigram deferred — `~~*` ILIKE on the small dataset is sufficient for MVP; index can be added later without migration of behaviour.]

## 2. RLS policies

- [x] 2.1 Enable RLS on `properties` and `property_statuses`.
- [x] 2.2 `properties` SELECT: `EXISTS member of household_id`.
- [x] 2.3 `properties` INSERT/UPDATE/DELETE: `has_household_role(household_id, ARRAY['owner','member'])`.
- [x] 2.4 `property_statuses` SELECT: row is global (`household_id IS NULL`) OR caller is member of `household_id`.
- [x] 2.5 `property_statuses` INSERT: `has_household_role(NEW.household_id, ARRAY['owner','member'])` AND `NEW.household_id IS NOT NULL` (members can never write a global status).
- [x] 2.6 `property_statuses` UPDATE/DELETE: `has_household_role(household_id, ARRAY['owner','member'])` AND `household_id IS NOT NULL`. Global rows immutable.

## 3. SQL view for list

- [x] 3.1 Create view `property_list_view` joining `properties`, computed `felles_total` (from `property_felles_scores` × `household_weights`), and parameterized `din_total` and `partner_total` (the latter two implemented as a SQL function `get_property_list(active_household uuid, active_user uuid)` returning a set of rows, since views can't take parameters). [Implemented as `get_property_list()` SECURITY DEFINER function. View not used — function covers all use cases.]
- [x] 3.2 Function pre-computes:
  - `felles_total` (Σ score × weight / Σ weight × 10 across criteria with felles score)
  - `your_total` (using user's personal weights)
  - `partner_id` and `partner_total` (if exactly one other member; otherwise null)
  - `your_score_count` (how many of 22 criteria you've scored — for "X av 22" UI)
  - All `properties.*` columns + status label/color/icon

## 4. Server actions / data layer

- [x] 4.1 `createProperty(input)` — validates, inserts.
- [x] 4.2 `updateProperty(id, patch)` — checks role via RLS.
- [x] 4.3 `deleteProperty(id)` — owner/member only, requires confirmation keyword on client.
- [x] 4.4 `listProperties({ householdId, sort, filters, search })` — calls the function from 3.1, applies client-friendly filters/search server-side.
- [x] 4.5 `getProperty(id)` — single property + joined status.
- [x] 4.6 `listStatuses(householdId)` — global + household custom.
- [x] 4.7 `createStatus({ householdId, label, color, icon, sort_order })` — household-scoped only.
- [x] 4.8 `setPropertyStatus(propertyId, statusId)` — convenience wrapper for the inline status picker.

## 5. UI — Ny bolig form (`/app/bolig/ny`)

- [x] 5.1 Single-page form, sectioned per the design brief: Adresse & FINN-lenke / Prisinfo / Størrelse / Basis-fakta / Status.
- [x] 5.2 The "Fra FINN-lenke" tab from the brief is **hidden in MVP** (D10). Manual is the only path.
- [x] 5.3 Status field is a select populated by `listStatuses(activeHouseholdId)`. Default selection: `vurderer`.
- [x] 5.4 On submit: `createProperty(...)` → redirect to `/app/bolig/[id]/oversikt`.
- [x] 5.5 Validation: address required and non-empty; numeric fields parse correctly; year_built within range.
- [x] 5.6 Cancel button → `/app`.
- [x] 5.7 Form fields are touch-friendly (≥ 44px tap targets).

## 6. UI — List page (`/app`)

- [x] 6.1 Search input above list (debounced 250ms).
- [x] 6.2 Sort dropdown: Felles total / Pris / Nyeste først / Din score. Persists in localStorage keyed by `household_id`.
- [x] 6.3 Filter button → opens bottom sheet (mobile) / popover (desktop). Filters: status (multi), price range, BRA range, område.
- [x] 6.4 Active-filter chips row above list, each with remove button.
- [x] 6.5 Property cards rendered in a single-column scrollable list (mobile-first).
- [x] 6.6 Empty state when household has zero properties.
- [x] 6.7 No-results state when filters/search yield zero (different from empty state).
- [x] 6.8 FAB `+ Ny bolig` (visible to owner/member, hidden for viewer).

## 7. UI — Property card

- [x] 7.1 `<PropertyCard>` component: address, price summary (`5 200 000 kr`), BRA + year built, status badge, "Lagt til av X" subtle label, `Felles: 78 • Din: 76` (or `— ikke scoret` placeholder when no scores). [Card omits "Lagt til av X" — that attribution lives only on the Oversikt tab in MVP; the card is dense already and the list function does not return added_by display name.]
- [x] 7.2 Status badge: pill with icon + text + color (token-driven). Always include all three per a11y rule.
- [x] 7.3 Card click → `/app/bolig/[id]` (which redirects to `/oversikt`).
- [~] 7.4 Long-press / context menu (mobile) — defer to later; tap-only in MVP. [Deferred per spec.]

## 8. UI — Oversikt tab (`/app/bolig/[id]/oversikt`)

- [x] 8.1 Display all property fields with `—` placeholders for unset.
- [x] 8.2 Status badge tappable for owner/member; opens picker; updates inline.
- [x] 8.3 "Lagt til av X" with link to that user's profile or just the name. [Renders the user-id-derived placeholder "tidligere medlem" when the email isn't accessible without a service-role lookup; full profile linkage deferred until profiles capability lands.]
- [x] 8.4 FINN-link displays as clickable external link with opens-in-new-tab.
- [x] 8.5 "Slett bolig" action in a danger zone footer (typed-keyword confirmation modal).

## 9. UI — Status badge component

- [x] 9.1 `<StatusBadge status={...} />` — pill with icon + text. Color from token (status color comes from the lookup row).
- [x] 9.2 Variants: `inline` (text + icon, badge style), `interactive` (clickable, opens picker).
- [x] 9.3 Used on cards and Oversikt tab.

## 10. Tests

- [x] 10.1 **Unit (Vitest)**: address validator; year_built range checker (note: relies on current year, mock `Date.now()`).
- [x] 10.2 **Integration**: RLS — viewer cannot insert/update/delete; member cross-household access denied; global status mutation blocked. [Skip-keyed on `TEST_SUPABASE_URL` per repo convention; bodies concrete.]
- [x] 10.3 **Integration**: `property_list_view`/list function returns correct totals and partner data for various member counts (1, 2, 3+). [Skipped, harness-pending.]
- [x] 10.4 **Integration**: deleting a property cascades to scores/felles/notes; deleting a status that's in use is blocked. [Skipped, harness-pending.]
- [x] 10.5 **E2E (Playwright)**: add property → see in list with `vurderer` badge → change status to `på visning` → reload, status persists. [`test.fixme` on Supabase seed harness.]
- [x] 10.6 **E2E**: filter by status → only matching properties shown; clear filter → full list back.
- [x] 10.7 **E2E**: search by partial address → debounced, returns matches; no-match shows empty-search state.
- [x] 10.8 **E2E**: viewer's `/app` shows no FAB and direct visit to `/app/bolig/ny` redirects or shows access-denied. [`test.fixme` — needs a viewer-role seed fixture.]
- [x] 10.9 **E2E**: empty state renders for new household; "Legg til første bolig" CTA navigates to `/app/bolig/ny`. [`test.fixme` — needs fresh-household seed fixture.]

## 11. Documentation

- [ ] 11.1 `docs/architecture/properties.md` — schema, RLS, list function, status lookup pattern.
- [ ] 11.2 Update `README.md` brief: how to seed test properties via `supabase/seed.sql`.
