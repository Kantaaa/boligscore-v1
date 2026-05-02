"use server";

import type { ActionResult, UserWeight } from "@/lib/weights/types";
import { err, ok } from "@/lib/weights/types";

import { requireUser } from "./_auth";

/**
 * Returns the caller's 22 personal weights for a household. The
 * `userId` parameter is required by the spec for clarity at the call
 * site, but the server validates that `userId === auth.uid()` (defence
 * in depth — RLS already restricts SELECT to own rows).
 *
 * Cross-user reads return an empty array (matching RLS behaviour) so
 * the UI can't accidentally render someone else's personal weights.
 */
export async function getUserWeights(
  householdId: string,
  userId: string,
): Promise<ActionResult<UserWeight[]>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  if (userId !== user.id) {
    // Defence in depth: matches RLS behaviour but returns immediately
    // without a round-trip and without leaking that the row exists.
    return ok([]);
  }

  const { data, error } = await supabase
    .from("user_weights")
    .select("household_id, user_id, criterion_id, weight, updated_at")
    .eq("household_id", householdId)
    .eq("user_id", userId);

  if (error) return err(error.message);
  return ok((data ?? []) as UserWeight[]);
}
