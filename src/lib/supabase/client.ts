"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requirePublicSupabaseConfig } from "@/lib/env";

/**
 * Browser-side Supabase client. Uses cookie-backed auth via `@supabase/ssr`
 * so the same session is visible to server components and middleware.
 *
 * Use inside client components only.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = requirePublicSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
