"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult, SetScoreResult } from "@/lib/scoring/types";
import {
  SCORE_SAVE_FAILED_MESSAGE,
  VIEWER_SCORE_DENIED_MESSAGE,
  err,
  ok,
} from "@/lib/scoring/types";
import { validateScore } from "@/lib/scoring/validation";

import { requireUser } from "./_auth";

/**
 * Upsert the caller's score for (propertyId, criterionId).
 *
 * Always operates on `auth.uid()` — never accepts a `userId` argument
 * (matches the spec's "Cannot score on behalf of another user" RLS).
 *
 * Authz:
 *   - Owner / member of the property's household can score.
 *   - Viewer denied at RLS.
 *   - Non-members denied at RLS.
 *
 * Returns the upserted row + the user's updated `your_score_count` so
 * the client doesn't need a second round-trip to refresh the counter
 * (D5 — the counter is the SQL function's output).
 */
export async function setScore(
  propertyId: string,
  criterionId: string,
  score: number,
): Promise<ActionResult<SetScoreResult>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const v = validateScore(score);
  if (!v.ok) return err(v.error);

  const { data, error } = await supabase
    .from("property_scores")
    .upsert(
      {
        property_id: propertyId,
        user_id: user.id,
        criterion_id: criterionId,
        score: v.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "property_id,user_id,criterion_id" },
    )
    .select("property_id, user_id, criterion_id, score, updated_at")
    .single();

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_SCORE_DENIED_MESSAGE);
    }
    return err(SCORE_SAVE_FAILED_MESSAGE);
  }
  if (!data) return err(SCORE_SAVE_FAILED_MESSAGE);

  // Counter: cheap to recount post-upsert; avoids a second function
  // call for the canonical SQL count.
  const { count, error: countError } = await supabase
    .from("property_scores")
    .select("criterion_id", { count: "exact", head: true })
    .eq("property_id", propertyId)
    .eq("user_id", user.id);
  if (countError) {
    return err(SCORE_SAVE_FAILED_MESSAGE);
  }

  revalidatePath(`/app/bolig/${propertyId}/min-vurdering`);
  return ok({
    score: {
      property_id: data.property_id,
      user_id: data.user_id,
      criterion_id: data.criterion_id,
      score: data.score,
      updated_at: data.updated_at,
    },
    your_score_count: count ?? 0,
  });
}
