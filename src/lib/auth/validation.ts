/**
 * Pure auth-form validators. UI-only — server actions also re-check via
 * Supabase but we surface friendlier inline errors before any RPC.
 *
 * All return values use the same shape so call sites can short-circuit
 * with a `if (!result.ok) return result.error;`.
 */

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email validator — non-empty + matches a basic shape. We intentionally
 * keep it simple: Supabase will reject genuinely malformed addresses,
 * and over-strict regexes reject valid edge cases (plus-tags, IDN).
 */
export function validateEmail(value: string): ValidationResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: "Skriv inn e-postadressen din" };
  }
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, error: "Ugyldig e-postadresse" };
  }
  return { ok: true };
}

/**
 * Password validator. Supabase enforces a minimum of 6 by default; the
 * spec asks for 8. Reject anything weaker before hitting the network.
 */
export function validatePassword(value: string): ValidationResult {
  if (!value) {
    return { ok: false, error: "Skriv inn et passord" };
  }
  if (value.length < 8) {
    return { ok: false, error: "Passordet må være minst 8 tegn" };
  }
  return { ok: true };
}
