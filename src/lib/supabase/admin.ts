import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServiceRoleKey, PUBLIC_SUPABASE_URL } from "@/lib/env";

/**
 * Service-role Supabase client.
 *
 * This key bypasses RLS, so the module is marked `server-only`: importing it
 * from a client component is a build error rather than a leak. Never pass the
 * client, or anything derived from it, to the browser.
 *
 * Returns `null` when the key is not configured, so callers can degrade
 * instead of throwing — the same contract `getServiceRoleKey()` offers. Use it
 * only where a cross-user read is genuinely required and RLS would hide the
 * row from the signed-in caller; for everything else use the cookie-bound
 * client from `server.ts`, which keeps RLS in force.
 *
 * No session is persisted: this client is request-scoped and must never pick
 * up or write the caller's auth cookie.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const key = getServiceRoleKey();
  if (!key || !PUBLIC_SUPABASE_URL) return null;

  return createClient(PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
