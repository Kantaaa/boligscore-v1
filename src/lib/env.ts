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

export function requirePublicSupabaseConfig(): {
  url: string;
  anonKey: string;
} {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", PUBLIC_SUPABASE_URL),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", PUBLIC_SUPABASE_ANON_KEY),
  };
}
