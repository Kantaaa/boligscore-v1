"use server";

import type {
  ActionResult,
  Household,
  HouseholdRole,
  HouseholdWithMembers,
} from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/**
 * Fetch a single household plus its member list. RLS guarantees the
 * caller is a member; non-members get a "not found" response.
 *
 * Member email lookups go through Supabase's `auth.admin.getUserById`,
 * which requires the service-role key. In local dev (no service-role
 * configured) we fall back to returning `null` emails — the UI shows
 * the user_id then. This trade-off keeps the action functional in
 * environments without a service-role key.
 */
export async function getHousehold(
  id: string,
): Promise<ActionResult<HouseholdWithMembers>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const { data: household, error: hhError } = await supabase
    .from("households")
    .select("id, name, created_by, created_at, comparison_disagreement_threshold")
    .eq("id", id)
    .single();

  if (hhError || !household) {
    return err("Fant ikke husholdningen");
  }

  const { data: memberRows, error: mError } = await supabase
    .from("household_members")
    .select("user_id, role, joined_at")
    .eq("household_id", id)
    .order("joined_at", { ascending: true });

  if (mError) return err(mError.message);

  // Best-effort email enrichment. Service-role key is server-only and
  // optional in dev; if absent, emails are null.
  const members = await Promise.all(
    (memberRows ?? []).map(async (row) => {
      let email: string | null = null;
      try {
        // Cast: auth.admin is only present when the client was built
        // with a service-role key; the regular cookie-bound client used
        // here will throw a permission error, which we swallow.
        const { data } = await (supabase.auth as unknown as {
          admin: {
            getUserById(id: string): Promise<{
              data: { user: { email: string | null } | null };
            }>;
          };
        }).admin.getUserById(row.user_id);
        email = data?.user?.email ?? null;
      } catch {
        email = null;
      }
      return {
        user_id: row.user_id,
        email,
        role: row.role as HouseholdRole,
        joined_at: row.joined_at,
      };
    }),
  );

  return ok({
    household: household as Household,
    members,
  });
}
