import { FINN_ERROR_MESSAGES, type FinnUrlValidation } from "./types";

/**
 * Hostname allowlist enforced before any outbound fetch.
 *
 * Matches `design.md` D4: only `www.finn.no` and bare `finn.no` are
 * accepted. Everything else (other Norwegian classifieds, internal IPs,
 * unrelated domains) is rejected without a network request — closing
 * the SSRF hole that an unrestricted fetch-by-URL endpoint would open.
 *
 * We additionally reject non-`https` schemes. FINN serves https; any
 * `http://` URL is suspicious enough that we'd rather fail loud.
 */
const ALLOWED_HOSTS = new Set<string>(["finn.no", "www.finn.no"]);

export function validateFinnUrl(input: unknown): FinnUrlValidation {
  if (typeof input !== "string" || input.trim().length === 0) {
    return { ok: false, error: FINN_ERROR_MESSAGES.malformedUrl };
  }

  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return { ok: false, error: FINN_ERROR_MESSAGES.malformedUrl };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: FINN_ERROR_MESSAGES.notFinnUrl };
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return { ok: false, error: FINN_ERROR_MESSAGES.notFinnUrl };
  }

  return { ok: true, url: parsed };
}
