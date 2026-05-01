/**
 * Pure validators / helpers for the weights capability. No DB access
 * so they can be unit-tested with Vitest without Supabase.
 */

import type { HouseholdWeight, UserWeight } from "./types";

/**
 * True when `value` is an integer in `[0, 10]`. Mirrors the DB
 * CHECK constraint on `weight` columns.
 */
export function isValidWeight(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 10
  );
}

/**
 * Validate + return the value as a normalized integer 0..10. Used by
 * server actions before they hit the DB so we can return a Norwegian
 * error before the round-trip.
 */
export function validateWeight(input: unknown): {
  ok: true;
  value: number;
} | {
  ok: false;
  error: string;
} {
  // Allow string inputs ("5") too — the form may serialise as strings.
  let n: number;
  if (typeof input === "number") {
    n = input;
  } else if (typeof input === "string" && input.trim().length > 0) {
    n = Number(input);
  } else {
    return { ok: false, error: "Vekt må være et heltall mellom 0 og 10" };
  }
  if (!isValidWeight(n)) {
    return { ok: false, error: "Vekt må være et heltall mellom 0 og 10" };
  }
  return { ok: true, value: n };
}

/**
 * Returns true when every weight in the set is `0`. Used by the
 * comparison capability's totalscore math (D8): when the denominator
 * sums to zero we display "Ikke nok data" rather than dividing by
 * zero.
 *
 * Empty arrays count as all-zero (we have nothing to weight by).
 */
export function weightSetIsAllZero(
  rows: ReadonlyArray<{ weight: number }>,
): boolean {
  if (rows.length === 0) return true;
  return rows.every((r) => r.weight === 0);
}

/**
 * Sum the weight column. Used by both the all-zero check (sum === 0)
 * and the comparison math denominator.
 */
export function sumWeights(
  rows: ReadonlyArray<{ weight: number }>,
): number {
  let total = 0;
  for (const r of rows) total += r.weight;
  return total;
}

/**
 * Check that a list of weight rows covers all expected criterion ids.
 * Returns the list of MISSING criterion ids — empty array means the
 * set is complete. Used by integration tests and by a
 * defensive read-time healthcheck (design.md risks table).
 */
export function findMissingCriteriaIds(
  rows: ReadonlyArray<HouseholdWeight | UserWeight>,
  expectedCriterionIds: ReadonlyArray<string>,
): string[] {
  const present = new Set(rows.map((r) => r.criterion_id));
  const missing: string[] = [];
  for (const id of expectedCriterionIds) {
    if (!present.has(id)) missing.push(id);
  }
  return missing;
}
