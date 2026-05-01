import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { requirePublicSupabaseConfig } from "@/lib/env";

/**
 * Server-side Supabase client for server components, route handlers,
 * and server actions. Reads/writes the session cookie via Next's
 * `cookies()` helper so middleware-issued sessions stay coherent.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const { url, anonKey } = requirePublicSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server components cannot mutate cookies — ignore. Middleware
          // and route handlers will refresh the cookie on the next request.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // See note above.
        }
      },
    },
  });
}
