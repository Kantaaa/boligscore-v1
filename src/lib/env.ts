/**
 * Centralized env access. Throws early in server code so misconfiguration
 * surfaces during boot rather than at the first DB call.
 *
 * In client components only `NEXT_PUBLIC_*` is available.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

export const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function requirePublicSupabaseConfig(): {
  url: string;
  anonKey: string;
} {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", PUBLIC_SUPABASE_URL),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", PUBLIC_SUPABASE_ANON_KEY),
  };
}

/**
 * Service-role key access. Returns the configured key, or `null` when
 * the variable is empty (common in local dev). Callers must handle the
 * `null` case explicitly — never throw on missing service key in code
 * paths that should also work for end users.
 *
 * The service-role key bypasses RLS, so use sparingly: only in server
 * actions where a cross-user/cross-household read is required (e.g.
 * looking up an invitation by token before the invitee is signed in).
 */
export function getServiceRoleKey(): string | null {
  return SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY : null;
}

/**
 * Hard-require service role for code paths that genuinely cannot fall
 * back. Throws with a clear message so misconfiguration surfaces early.
 */
export function requireServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY);
}
