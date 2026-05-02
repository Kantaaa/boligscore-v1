/**
 * Validate a `next` redirect target before using it post-login.
 *
 * Rules:
 *   - Must be a non-empty string.
 *   - Must start with `/` (absolute path).
 *   - Must NOT start with `//` (protocol-relative — would escape the origin).
 *   - Must point at one of the allowed in-app surfaces:
 *       - `/app` and `/app/...` — the protected app.
 *       - `/invitasjon/...` — invitation acceptance flow (households
 *         capability). This is a public route, but it's the only
 *         meaningful destination after a user signs up via an
 *         invitation link.
 *
 * Anything that fails these checks resolves to `null`, and the caller
 * should fall back to a known-safe default (e.g. `/app`).
 */
export function safeNextParam(value: string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  const isApp = value === "/app" || value.startsWith("/app/");
  const isInvitation = value.startsWith("/invitasjon/");
  if (!isApp && !isInvitation) return null;
  return value;
}

/**
 * Resolve a `next` parameter to a definite redirect target.
 *
 * Wraps `safeNextParam` and applies a fallback. `auth-onboarding` task
 * 9.1 lists this as the helper used by every "redirect after auth"
 * call site so the fallback is consistent (always `/app` unless
 * overridden).
 *
 * Examples:
 *   resolveNextOrDefault("/app/vekter")           -> "/app/vekter"
 *   resolveNextOrDefault("/invitasjon/abc")       -> "/invitasjon/abc"
 *   resolveNextOrDefault("https://evil.com")       -> "/app"
 *   resolveNextOrDefault("//evil.com/app")          -> "/app"
 *   resolveNextOrDefault(undefined)                 -> "/app"
 *   resolveNextOrDefault(undefined, "/app/onboarding") -> "/app/onboarding"
 */
export function resolveNextOrDefault(
  value: string | null | undefined,
  fallback = "/app",
): string {
  return safeNextParam(value) ?? fallback;
}
