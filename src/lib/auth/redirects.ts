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
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  const isApp = value === "/app" || value.startsWith("/app/");
  const isInvitation = value.startsWith("/invitasjon/");
  if (!isApp && !isInvitation) return null;
  return value;
}
