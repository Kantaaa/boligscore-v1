> Conventions: see `openspec/conventions.md`.

## 1. Database schema

- [x] 1.1 Migration: create `property_scores(property_id uuid REFERENCES properties(id) ON DELETE CASCADE, user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, criterion_id uuid REFERENCES criteria(id) ON DELETE RESTRICT, score int NOT NULL CHECK (score BETWEEN 0 AND 10), updated_at timestamptz NOT NULL default now(), PRIMARY KEY (property_id, user_id, criterion_id))`. Index on `(property_id, user_id)` for the per-tab fetch.
- [x] 1.2 Migration: create `property_score_history(id uuid PK default gen_random_uuid(), property_id uuid NOT NULL, user_id uuid NOT NULL, criterion_id uuid NOT NULL, old_score int, new_score int NOT NULL, changed_at timestamptz NOT NULL default now())`. No FKs (history outlives the source row if scores deleted).
- [x] 1.3 Migration: create `property_section_notes(property_id uuid REFERENCES properties(id) ON DELETE CASCADE, user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, section_id uuid REFERENCES criterion_sections(id) ON DELETE RESTRICT, body text NOT NULL default '', visibility text NOT NULL default 'private' CHECK (visibility IN ('private','shared')), updated_at timestamptz NOT NULL default now(), PRIMARY KEY (property_id, user_id, section_id))`.
- [x] 1.4 Trigger `property_scores_history_trg` AFTER INSERT OR UPDATE ON `property_scores` WHEN (OLD.score IS DISTINCT FROM NEW.score OR OLD IS NULL): insert into `property_score_history`.

## 2. RLS policies

- [x] 2.1 Enable RLS on all three new tables.
- [x] 2.2 `property_scores` SELECT: caller is a member of the property's household (via JOIN to properties + has_household_role).
- [x] 2.3 `property_scores` INSERT/UPDATE/DELETE: `user_id = auth.uid()` AND caller has role `owner` or `member` in the property's household.
- [x] 2.4 `property_score_history` SELECT: `user_id = auth.uid()` AND member of the property's household. INSERT/UPDATE/DELETE: blocked at API (only the trigger writes; service-role on server-actions if needed).
- [x] 2.5 `property_section_notes` SELECT: caller is a member of the property's household AND (`visibility = 'shared'` OR `user_id = auth.uid()`). UPDATE/INSERT/DELETE: `user_id = auth.uid()` AND owner/member role.

## 3. Server actions / data layer

- [x] 3.1 `setScore(propertyId, criterionId, score)` — upsert with `ON CONFLICT (property_id, user_id, criterion_id) DO UPDATE`. Returns the new score row + the updated `your_score_count` for the property.
- [x] 3.2 `clearScore(propertyId, criterionId)` — DELETE; counter decreases.
- [x] 3.3 `getMyScores(propertyId)` — returns 22 rows (one per criterion), with score or NULL. (Returns only rows that exist; client treats missing as "ikke scoret" — see action JSDoc.)
- [x] 3.4 `getMyNotes(propertyId)` — returns 3 rows (one per section), creating empty rows if missing. (Returns only existing rows; client renders absent as empty textarea — see action JSDoc.)
- [x] 3.5 `setNote(propertyId, sectionId, body)` — upsert.
- [x] 3.6 SQL function `get_property_with_scores(p_property_id uuid, p_viewer_id uuid)` returning property + viewer scores + viewer score count + partner score count (no partner scores leaked).

## 4. UI — Min vurdering tab

- [ ] 4.1 `app/app/bolig/[id]/min-vurdering/page.tsx` — server-fetches via `get_property_with_scores`; passes data to a client component for interaction.
- [ ] 4.2 Counter at top: `"X av 22 kriterier scoret"`. Renders from `your_score_count`.
- [ ] 4.3 `<FaktaSection>` component — read-only Pris/kvm, Størrelse, Alder. Uses property fields from the parent fetch.
- [ ] 4.4 Three sections rendered with header + description; for each: list of criterion rows.
- [ ] 4.5 `<ScoreChipRow>` component — 11 chips (0–10), selected chip filled. Touch target ≥ 44px each. Optimistic UI on tap.
- [ ] 4.6 Section notes: `<SectionNotes>` textarea per section. Autosaves on blur + 1-second idle while typing. "lagrer..." / "lagret" indicator.
- [ ] 4.7 Viewer mode: chips disabled, notes read-only (use `disabled` attribute and `aria-readonly`).

## 5. Optimistic UI implementation

- [ ] 5.1 `<ScoreChipRow>` receives `currentScore` from server data, holds an `optimisticScore` local state.
- [ ] 5.2 On chip tap: set `optimisticScore` immediately; call `setScore` server action.
- [ ] 5.3 On success: invalidate the parent fetch (Next.js `revalidatePath` or client-side query refetch).
- [ ] 5.4 On error: revert `optimisticScore` to `currentScore`; show toast "Kunne ikke lagre — prøv igjen".

## 6. Tests

- [ ] 6.1 **Unit (Vitest)**: pris/kvm calculation with various inputs (handles null price, null bra); alder calculation (handles null year_built, year > current year + 5).
- [ ] 6.2 **Integration**: insert-update round-trip; trigger writes history row; no-op update writes no history; CHECK rejects out-of-range.
- [ ] 6.3 **Integration**: RLS — viewer cannot upsert; member cannot upsert with another user_id; non-member cannot SELECT scores or history; private notes hidden from partner.
- [ ] 6.4 **Integration**: cascade — deleting a property removes scores and notes; deleting a member removes their scores.
- [ ] 6.5 **Integration**: `get_property_with_scores` — viewer score count present, partner_score_count present, partner scores NOT in the response.
- [ ] 6.6 **E2E (Playwright)**: open `Min vurdering`, tap a chip, see counter increment; reload, score persists.
- [ ] 6.7 **E2E**: tap same chip twice (no change) — counter and chip state stable; no extra history rows (assert via SQL).
- [ ] 6.8 **E2E**: type in section notes, blur, reload — note persists.
- [ ] 6.9 **E2E**: optimistic-failure rollback — simulate server error (test mode), tap a chip, see chip revert + toast.
- [ ] 6.10 **E2E**: viewer mode — chips disabled, notes read-only.

## 7. Documentation

- [ ] 7.1 `docs/architecture/scoring.md` — schema, history trigger, RLS, optimistic UI pattern.
- [ ] 7.2 Update `docs/criteria.md` (from weights capability) to ensure the criteria list is canonical and shared.
