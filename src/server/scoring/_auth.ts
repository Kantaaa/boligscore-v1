import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ActionResult } from "@/lib/scoring/types";
import { err } from "@/lib/scoring/types";

/**
 * Mirror of `src/server/{households,properties,weights}/_auth.ts` — see
 * those files for the rationale of duplicating instead of sharing. The
 * scoring capability gets its own thin wrapper so its server actions
 * have a stable surface.
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
