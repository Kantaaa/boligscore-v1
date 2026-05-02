/**
 * Pure validators for the scoring capability. No DB access; unit-testable.
 */

import { SCORE_OUT_OF_RANGE_MESSAGE } from "./types";

/** True when `value` is an integer in `[0, 10]`. Mirrors the DB CHECK. */
export function isValidScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 10
  );
}

/** Validate + normalise a score input. */
export function validateScore(input: unknown):
  | { ok: true; value: number }
  | { ok: false; error: string } {
  let n: number;
  if (typeof input === "number") {
    n = input;
  } else if (typeof input === "string" && input.trim().length > 0) {
    n = Number(input);
  } else {
    return { ok: false, error: SCORE_OUT_OF_RANGE_MESSAGE };
  }
  if (!isValidScore(n)) {
    return { ok: false, error: SCORE_OUT_OF_RANGE_MESSAGE };
  }
  return { ok: true, value: n };
}
