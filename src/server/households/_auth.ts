import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ActionResult } from "@/lib/households/types";
import { err } from "@/lib/households/types";

/**
 * Internal helper used by every household server action. Returns the
 * Supabase server client bound to the current cookies AND the
 * authenticated user, OR an `err()` ActionResult to propagate.
 *
 * Servers actions read like:
 *
 *     const ctx = await requireUser();
 *     if (!ctx.ok) return ctx;
 *     const { supabase, user } = ctx.data;
 *     ...
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
