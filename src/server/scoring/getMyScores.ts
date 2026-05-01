"use server";

import type { ActionResult, PropertyScore } from "@/lib/scoring/types";
import { err, ok } from "@/lib/scoring/types";

import { requireUser } from "./_auth";

/**
 * Returns every score the calling user has on `propertyId`. Rows for
 * unscored criteria are NOT returned — the client renders unscored as
 * "no row in the result set", so a missing entry == "ikke scoret".
 *
 * RLS already restricts to (property's household member); we further
 * filter by `user_id = auth.uid()` so the result only includes the
 * caller's own scores. The partner's scores are NOT exposed here —
 * use `get_property_with_scores` for the partner's count.
 */
export async function getMyScores(
  propertyId: string,
): Promise<ActionResult<PropertyScore[]>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { data, error } = await supabase
    .from("property_scores")
    .select("property_id, user_id, criterion_id, score, updated_at")
    .eq("property_id", propertyId)
    .eq("user_id", user.id);

  if (error) return err(error.message);

  return ok((data ?? []) as PropertyScore[]);
}
