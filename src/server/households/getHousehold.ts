"use server";

import type {
  ActionResult,
  Household,
  HouseholdRole,
  HouseholdWithMembers,
} from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { requireUser } from "./_auth";

/**
 * Fetch a single household plus its member list. RLS guarantees the
 * caller is a member; non-members get a "not found" response.
 *
 * Member email lookups go through Supabase's `auth.admin.getUserById` on a
 * service-role client. Without the key the emails come back null and the UI
 * falls back to the user_id, so the action stays functional either way.
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

  // Best-effort email enrichment. Needs the service-role key: `auth.admin`
  // is an admin API, and the cookie-bound anon client this action otherwise
  // uses can never satisfy it. When the key is absent the emails stay null
  // and the UI falls back to the user_id, which keeps this action working in
  // environments without one.
  const admin = createSupabaseAdminClient();

  const members = await Promise.all(
    (memberRows ?? []).map(async (row) => {
      let email: string | null = null;
      if (admin) {
        try {
          const { data } = await admin.auth.admin.getUserById(row.user_id);
          email = data?.user?.email ?? null;
        } catch {
          email = null;
        }
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
