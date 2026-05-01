> Conventions: see `openspec/conventions.md`.

## 1. Database schema (criteria seed)

- [x] 1.1 Migration: create `criterion_sections(id uuid PK default gen_random_uuid(), key text NOT NULL UNIQUE, label text NOT NULL, description text, sort_order int NOT NULL)`. (Stub created in `properties` capability; this capability seeds it.)
- [x] 1.2 Migration: create `criteria(id uuid PK default gen_random_uuid(), key text NOT NULL UNIQUE, section_id uuid NOT NULL REFERENCES criterion_sections(id), label text NOT NULL, description text, sort_order int NOT NULL)`. (Stub created in `properties` capability; this capability seeds it.)
- [x] 1.3 Seed three sections: `bolig_innvendig` ("Bolig innvendig"), `beliggenhet_omrade` ("Beliggenhet & område"), `helhet` ("Helhet").
- [x] 1.4 Seed 22 criteria with the keys/labels from the design brief:
  - Bolig innvendig: `kjokken`, `bad`, `planlosning`, `lys_luft`, `oppbevaring`, `stue`, `balkong_terrasse`, `antall_soverom`, `antall_bad`.
  - Beliggenhet & område: `omradeinntrykk`, `nabolagsfolelse`, `transport`, `skoler`, `beliggenhet_makro`, `parkering`, `stoy`.
  - Helhet: `visningsinntrykk`, `potensial`, `tilstand`, `hage`, `utleiedel`, `solforhold`.
  - Final list documented in `docs/criteria.md`.

## 2. Database schema (weight tables)

- [x] 2.1 Migration: create `household_weights(household_id uuid REFERENCES households(id) ON DELETE CASCADE, criterion_id uuid REFERENCES criteria(id) ON DELETE RESTRICT, weight int NOT NULL default 5 CHECK (weight BETWEEN 0 AND 10), updated_at timestamptz NOT NULL default now(), updated_by uuid REFERENCES auth.users(id), PRIMARY KEY (household_id, criterion_id))`. (Stub from `properties`; constraints already match.)
- [x] 2.2 Migration: create `user_weights(household_id uuid REFERENCES households(id) ON DELETE CASCADE, user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, criterion_id uuid REFERENCES criteria(id) ON DELETE RESTRICT, weight int NOT NULL default 5 CHECK (weight BETWEEN 0 AND 10), updated_at timestamptz NOT NULL default now(), PRIMARY KEY (household_id, user_id, criterion_id))`. (Stub from `properties`; constraints already match.)
- [x] 2.3 Trigger on `households` AFTER INSERT: insert 22 rows into `household_weights` for the new household with `weight = 5`.
- [x] 2.4 Trigger on `household_members` AFTER INSERT: insert 22 rows into `user_weights` for the new (user × household) with `weight = 5`.

## 3. RLS policies

- [x] 3.1 Enable RLS on `criteria`, `criterion_sections`, `household_weights`, `user_weights`. (Already enabled in stub migration.)
- [x] 3.2 `criteria` and `criterion_sections`: SELECT for any authenticated user; no writes via API (service-role only via migration). (Stub policy retained.)
- [x] 3.3 `household_weights` SELECT: caller is member of `household_id`. (Stub policy retained.)
- [x] 3.4 `household_weights` UPDATE: `has_household_role(household_id, ARRAY['owner','member'])`. INSERT/DELETE blocked at API (handled by trigger only).
- [x] 3.5 `user_weights` SELECT: caller is member of `household_id` AND `user_id = auth.uid()` (you can only see your OWN personal weights, not your partner's). INSERT/DELETE blocked at API. (Stub policy retained.)
- [x] 3.6 `user_weights` UPDATE: same conditions as SELECT (only your own).

## 4. Server actions / data layer

- [ ] 4.1 `getCriteria()` — returns full list of criteria + sections, ordered.
- [ ] 4.2 `getHouseholdWeights(householdId)` — returns 22 rows.
- [ ] 4.3 `getUserWeights(householdId, userId)` — returns 22 rows. Server validates that `userId === auth.uid()` (defense-in-depth on top of RLS).
- [ ] 4.4 `setHouseholdWeight(householdId, criterionId, weight)` — owner/member only.
- [ ] 4.5 `setUserWeight(householdId, criterionId, weight)` — own weights only; owner/member roles only.
- [ ] 4.6 `resetHouseholdWeights(householdId)` — bulk update to 5.
- [ ] 4.7 `resetUserWeights(householdId)` — bulk update to 5 for caller.
- [ ] 4.8 Helper `weightSetIsAllZero(rows)` — used by comparison math to detect divide-by-zero case.

## 5. UI — Vekter page (`/app/vekter`)

- [ ] 5.1 `app/app/vekter/page.tsx` — fetches `getCriteria` + `getHouseholdWeights` + `getUserWeights` in parallel.
- [ ] 5.2 Segmented control at top: `Felles vekter` (default) / `Mine personlige vekter`. Active state via URL query param `?view=felles|personal` for shareable / browser-back behavior.
- [ ] 5.3 Sections render in order with heading + description.
- [ ] 5.4 Each row: criterion label (left), criterion description (small, below label), slider (right). On personal view: small "Felles: N" reference label between the criterion label and the slider.
- [ ] 5.5 Slider component: Tailwind-styled native `<input type="range" min=0 max=10 step=1>`. Show current value as a number bubble or label. Touch-friendly thumb size.
- [ ] 5.6 On slider release: call `setHouseholdWeight` or `setUserWeight`. Show "lagret" pulse on success.
- [ ] 5.7 Reset button below each view: `Tilbakestill alle til 5`. Confirmation dialog before action.
- [ ] 5.8 Viewer mode: sliders disabled (`<input disabled>`), reset hidden, segmented control still functional (they can view personal — well, only their own; viewers can have personal weights too, just read-only? clarify in tasks: viewers see their personal sliders disabled).

## 6. Tests

- [ ] 6.1 **Unit (Vitest)**: weight value validator (0–10 integers); `weightSetIsAllZero` helper.
- [ ] 6.2 **Integration**: trigger seeding — create a household, assert 22 felles weight rows exist with weight=5; add a member, assert 22 personal weight rows exist for that user.
- [ ] 6.3 **Integration**: RLS — viewer cannot UPDATE; member cannot UPDATE another user's `user_weights`; non-member cannot SELECT either weight table for a household they don't belong to.
- [ ] 6.4 **Integration**: range CHECK rejects 11 and -1.
- [ ] 6.5 **Integration**: deleting a member cascades to their `user_weights`; deleting a household cascades to both weight tables.
- [ ] 6.6 **E2E (Playwright)**: open `/app/vekter`, drag a slider on felles view, reload, value persisted; switch to personal view, see felles reference label.
- [ ] 6.7 **E2E**: reset action — drag a few sliders away from 5, click reset, confirm, all return to 5.
- [ ] 6.8 **E2E**: viewer's `/app/vekter` shows disabled sliders.

## 7. Documentation

- [ ] 7.1 `docs/criteria.md` — full list of 22 criteria + 3 sections + descriptions, with the canonical English keys and Norwegian labels.
- [ ] 7.2 `docs/architecture/weights.md` — schema, triggers, RLS, math contract with comparison.
