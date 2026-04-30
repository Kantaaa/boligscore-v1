/**
 * Validate a `next` redirect target before using it post-login.
 *
 * Rules:
 *   - Must be a non-empty string.
 *   - Must start with `/` (absolute path).
 *   - Must NOT start with `//` (protocol-relative — would escape the origin).
 *   - Must point inside the protected app surface (`/app` prefix) — that
 *     is the only place a user should ever be redirected to after login.
 *
 * Anything that fails these checks resolves to `null`, and the caller
 * should fall back to a known-safe default (e.g. `/app`).
 */
export function safeNextParam(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value !== "/app" && !value.startsWith("/app/")) return null;
  return value;
}
