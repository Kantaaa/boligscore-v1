import { EMPTY_ADDRESS_MESSAGE } from "./types";

/**
 * Pure validators for the properties capability. Pure (no DB) so they
 * can be unit-tested with Vitest. Tests are colocated as *.test.ts.
 */

export function validateAddress(input: unknown): {
  ok: true;
  value: string;
} | {
  ok: false;
  error: string;
} {
  if (typeof input !== "string") {
    return { ok: false, error: EMPTY_ADDRESS_MESSAGE };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: EMPTY_ADDRESS_MESSAGE };
  }
  if (trimmed.length > 500) {
    return { ok: false, error: "Adresse er for lang (maks 500 tegn)" };
  }
  return { ok: true, value: trimmed };
}

/**
 * Year-built range matches the DB CHECK constraint:
 *   1800 ≤ year_built ≤ current_year + 5
 *
 * `now` is injectable so the test can mock the clock.
 */
export function isValidYearBuilt(
  year: unknown,
  now: Date = new Date(),
): boolean {
  if (year === null || year === undefined) return true; // optional
  if (typeof year !== "number" || !Number.isInteger(year)) return false;
  const currentYear = now.getUTCFullYear();
  return year >= 1800 && year <= currentYear + 5;
}

/**
 * Coerce a possibly-empty form string to an optional integer, returning
 * `null` when the input is empty/blank. Throws on un-parseable input so
 * the server action can surface "Ugyldig tall" rather than silently
 * dropping data.
 */
export function parseOptionalInt(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? Math.trunc(input) : null;
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export function parseOptionalNumber(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  const trimmed = input.trim().replace(",", ".");
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseOptionalString(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Compute pris/kvm = price / bra. Returns null when either input is
 * missing or bra is 0. Result is rounded to nearest integer (NOK).
 */
export function pricePerKvm(
  price: number | null | undefined,
  bra: number | null | undefined,
): number | null {
  if (price == null || bra == null) return null;
  if (bra <= 0) return null;
  return Math.round(price / bra);
}
