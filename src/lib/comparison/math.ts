/**
 * Pure math + validation helpers for the comparison capability. No DB
 * access — these are unit-testable against fixture data and mirror the
 * SQL functions in `20260501000011_comparison.sql`.
 *
 * The SQL functions are the source of truth at runtime; this module
 * exists so:
 *   - the client can predict the new felles_total optimistically while
 *     waiting for the server to confirm,
 *   - unit tests can verify the math contract (D7) without spinning up
 *     a DB.
 *
 * Kept consistent with `compute_felles_total()` and
 * `compute_user_total()` in the migration.
 */

import { weightSetIsAllZero } from "@/lib/weights/validation";

import type { ComparisonRow } from "./types";
import {
  FELLES_OUT_OF_RANGE_MESSAGE,
  THRESHOLD_OUT_OF_RANGE_MESSAGE,
} from "./types";

/** True when `value` is an integer in `[0, 10]`. Mirrors the DB CHECK. */
export function isValidFellesScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 10
  );
}

/** Validate + normalise a felles score input. */
export function validateFellesScore(input: unknown):
  | { ok: true; value: number }
  | { ok: false; error: string } {
  let n: number;
  if (typeof input === "number") {
    n = input;
  } else if (typeof input === "string" && input.trim().length > 0) {
    n = Number(input);
  } else {
    return { ok: false, error: FELLES_OUT_OF_RANGE_MESSAGE };
  }
  if (!isValidFellesScore(n)) {
    return { ok: false, error: FELLES_OUT_OF_RANGE_MESSAGE };
  }
  return { ok: true, value: n };
}

/** True when `value` is an integer in `[1, 10]`. Mirrors the DB CHECK. */
export function isValidThreshold(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 10
  );
}

/** Validate + normalise a threshold input. */
export function validateThreshold(input: unknown):
  | { ok: true; value: number }
  | { ok: false; error: string } {
  let n: number;
  if (typeof input === "number") {
    n = input;
  } else if (typeof input === "string" && input.trim().length > 0) {
    n = Number(input);
  } else {
    return { ok: false, error: THRESHOLD_OUT_OF_RANGE_MESSAGE };
  }
  if (!isValidThreshold(n)) {
    return { ok: false, error: THRESHOLD_OUT_OF_RANGE_MESSAGE };
  }
  return { ok: true, value: n };
}

/**
 * True when |a − b| >= threshold, treating null as "no data" (no
 * disagreement to flag). Used to highlight rows.
 */
export function isDisagreement(
  a: number | null,
  b: number | null,
  threshold: number,
): boolean {
  if (a === null || b === null) return false;
  return Math.abs(a - b) >= threshold;
}

/**
 * Compute the felles totalscore for a fixture set of (felles, weight)
 * pairs. Mirrors `compute_felles_total()` in SQL.
 *
 * Contract (D7):
 *   - Numerator: Σ (felles_score × household_weight) over criteria with
 *     a felles_score set.
 *   - Denominator: Σ household_weight over ALL criteria — sparse felles
 *     reduces the total.
 *   - Output: round(num/den × 10), 0..100 integer; null when den == 0.
 */
export function computeFellesTotal(
  rows: ReadonlyArray<{ felles_score: number | null; weight: number }>,
): number | null {
  if (weightSetIsAllZero(rows.map((r) => ({ weight: r.weight })))) {
    return null;
  }
  let numerator = 0;
  let denominator = 0;
  for (const r of rows) {
    denominator += r.weight;
    if (r.felles_score !== null) {
      numerator += r.felles_score * r.weight;
    }
  }
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10);
}

/**
 * Compute a user totalscore (din or partner) for fixture data. Mirrors
 * `compute_user_total()` in SQL.
 *
 * Contract (D7): sums only over criteria the user has scored. Both
 * numerator and denominator skip unscored criteria. Returns null when
 * the user has nothing scored or the resulting weight sum is 0.
 */
export function computeUserTotal(
  rows: ReadonlyArray<{ score: number | null; weight: number }>,
): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const r of rows) {
    if (r.score === null) continue;
    numerator += r.score * r.weight;
    denominator += r.weight;
  }
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10);
}

/**
 * Count criteria missing a felles score in the comparison matrix.
 * Used to render the warning row in the totalscore panel.
 */
export function countMissingFelles(
  rows: ReadonlyArray<Pick<ComparisonRow, "felles_set">>,
): number {
  let missing = 0;
  for (const r of rows) {
    if (!r.felles_set) missing += 1;
  }
  return missing;
}

/**
 * Snitt placeholder: round((your + partner) / 2) when both are set,
 * else null. Mirrors the snitt computation in `get_property_comparison`.
 *
 * The UI uses snitt as the chip-picker default value when no felles
 * score has been written yet (D3).
 */
export function snitt(
  yourScore: number | null,
  partnerScore: number | null,
): number | null {
  if (yourScore === null || partnerScore === null) return null;
  return Math.round((yourScore + partnerScore) / 2);
}

/**
 * Default value to pre-select in the chip-picker for a given row.
 *
 * Order:
 *   1. Existing felles_score (so the picker reflects current state).
 *   2. Snitt of partner scores (D3 — "default felles = average").
 *   3. Viewer's own score (single-member household — no partner).
 *   4. null (nothing to default to).
 */
export function chipPickerDefault(row: ComparisonRow): number | null {
  if (row.felles_score !== null) return row.felles_score;
  if (row.snitt !== null) return row.snitt;
  if (row.your_score !== null) return row.your_score;
  return null;
}
