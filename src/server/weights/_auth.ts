import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ActionResult } from "@/lib/weights/types";
import { err } from "@/lib/weights/types";

/**
 * Mirror of `src/server/properties/_auth.ts` — returns the cookie-bound
 * server client and the authenticated user, or an err() ActionResult.
 *
 * Kept duplicated rather than imported from `properties` so the
 * weights capability has its own stable surface.
 */
export async function requireUser(): Promise<
  ActionResult<{
    supabase: ReturnType<typeof createSupabaseServerClient>;
    user: { id: string; email: string | null };
  }>
> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return err("Du må være logget inn for å gjøre dette");
  }
  return {
    ok: true,
    data: {
      supabase,
      user: { id: user.id, email: user.email ?? null },
    },
  };
}
