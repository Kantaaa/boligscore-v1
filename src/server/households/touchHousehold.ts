"use server";

import type { ActionResult } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/**
 * Bump `household_members.last_accessed_at = now()` for the current
 * user. Called from the household switcher when a different household
 * is selected, so the "first login defaults to most recent" rule has
 * a meaningful signal.
 *
 * Silent on failure: this is a best-effort write — if RLS or network
 * fails we don't block the navigation.
 */
export async function touchHousehold(
  householdId: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { error } = await supabase
    .from("household_members")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("household_id", householdId)
    .eq("user_id", user.id);

  if (error) return err(error.message);
  return ok(undefined);
}
