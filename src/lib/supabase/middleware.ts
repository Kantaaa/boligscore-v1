import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { requirePublicSupabaseConfig } from "@/lib/env";

/**
 * Build a Supabase server client backed by `NextRequest`/`NextResponse`
 * cookies, suitable for use inside `middleware.ts`.
 *
 * Returns the client plus the response so the caller can inspect the
 * session and forward the (possibly mutated) cookies on the response.
 */
export function createSupabaseMiddlewareClient(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { url, anonKey } = requirePublicSupabaseConfig();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  return { supabase, response };
}
