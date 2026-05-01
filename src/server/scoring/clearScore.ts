"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/scoring/types";
import {
  SCORE_SAVE_FAILED_MESSAGE,
  VIEWER_SCORE_DENIED_MESSAGE,
  err,
  ok,
} from "@/lib/scoring/types";

import { requireUser } from "./_auth";

/**
 * Delete the caller's score for (propertyId, criterionId). The counter
 * decreases by 1 on success.
 *
 * RLS denies viewers and non-members. We surface the spec-locked
 * Norwegian error if the row was hidden / the delete affected 0 rows.
 *
 * Returns the post-delete counter for the caller's scores on this
 * property so the UI can update without a refetch.
 */
export async function clearScore(
  propertyId: string,
  criterionId: string,
): Promise<ActionResult<{ your_score_count: number }>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { error } = await supabase
    .from("property_scores")
    .delete()
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .eq("criterion_id", criterionId);

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_SCORE_DENIED_MESSAGE);
    }
    return err(SCORE_SAVE_FAILED_MESSAGE);
  }

  const { count, error: countError } = await supabase
    .from("property_scores")
    .select("criterion_id", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("user_id", user.id);
  if (countError) {
    return err(SCORE_SAVE_FAILED_MESSAGE);
  }

  revalidatePath(`/app/bolig/${propertyId}/min-vurdering`);
  return ok({ your_score_count: count ?? 0 });
}
