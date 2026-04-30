> Conventions: see `openspec/conventions.md`.

## Why

Independent scoring is only valuable if the partners can **see disagreement and reconcile**. Without comparison, the two sets of numbers sit in isolated tabs and the household still can't rationally rank Bolig A vs Bolig B. The comparison view turns the raw scores into a structured conversation: "we differ by 3 on kjøkken — let's talk." It also produces the **Felles totalscore** (the headline number) used everywhere else (sorting, list cards, decision-making).

## What Changes

- New `Sammenligning` tab on the property detail page. Visible if at least the current user has scored.
- **Totalscore-panel** at the top:
  - Hero: `Felles: 78/100` (large) — based on felles-karakter × felles-vekter.
  - Secondary: `Din: 76` and `Kanta: 82` (smaller).
  - Warning if any criterion is missing a felles score: `⚠ 3 kriterier mangler score — regnes som 0 i totalen`.
- **Comparison matrix** (rows grouped by section, same sections as scoring):
  - Columns: `Kriterium | Ine | Kanta | Snitt | Felles`.
  - `Felles` column is **inline-editable** — tap the number, chip-picker opens, autosave on select.
  - `Felles` is prefilled with `Snitt` as the default, but either partner can override.
  - Rows where `|Δ| ≥ threshold` (default 3) get a subtle highlight (e.g. soft yellow background).
- **Disagreement threshold is configurable** per household. Setting lives on the `households` row (`comparison_disagreement_threshold`, default `3`, range 1–10). Surfaced in `Husstand` settings (or `Meg`/`Innstillinger`).
- No explicit "commit" button — last edit wins.
- **No real-time push** in MVP. The matrix re-fetches on **tab focus** and after any local edit (refetch after autosave). Real-time subscription via Supabase Realtime is a later upgrade.
- Empty/partial states:
  - **Single-user household** (no partner yet): tab renders, but `Kanta` and `Snitt` columns are hidden. `Felles` column simplifies to "din score blir felles". Totalscore-panel shows only `Din total` (felles defaults to your scores × felles weights when no partner).
  - Partner is in household but has not scored: show only your scores in the `Din` column, label `Snitt` and `Felles` as `— venter på partner`.
- Felles total recalculates after each edit (client-side, since polling drives the data).

## Capabilities

### New Capabilities
- `comparison`: matrix view, felles-karakter editing, felles-totalscore calculation, configurable disagreement threshold, partial-state handling (single-user, partner-not-scored).

### Modified Capabilities
<!-- None - new tab, doesn't change scoring or weights specs. -->

## Out of MVP scope (future)

- **Real-time partner sync**: Supabase Realtime subscription so the matrix updates live as your partner scores. MVP uses fetch-on-focus + refetch-after-edit.

## Impact

- **Database**:
  - `property_felles_scores(property_id, criterion_id, score, updated_by, updated_at)` — one row per (property × criterion) representing the household's agreed-upon score. Either member can write (viewers cannot).
  - `households.comparison_disagreement_threshold INT NOT NULL DEFAULT 3 CHECK (BETWEEN 1 AND 10)`.
- **Math**:
  - `felles_total = round(Σ (felles_score[c] × felles_weight[c]) / Σ (felles_weight[c]) × 10)`. Missing felles score counts as 0 in numerator (warning shown).
  - `din_total = round(Σ (your_score[c] × your_personal_weight[c]) / Σ (your_personal_weight[c]) × 10)`.
  - `partner_total` same with partner's data.
  - All totals are derived (computed client-side or as a SQL view), never stored.
- **UI**: new matrix component, chip-picker popover, disagreement-highlight styling, totalscore badge component, threshold setting in Husstand or Meg.
- **Routes**: `/app/bolig/[id]/sammenligning`.
- **Dependencies**: requires `households`, `properties`, `scoring`, `weights`.
