"use server";

import { revalidatePath } from "next/cache";

import {
  FELLES_SAVE_FAILED_MESSAGE,
  VIEWER_FELLES_DENIED_MESSAGE,
  err,
  ok,
} from "@/lib/comparison/types";
import type {
  ActionResult,
  SetFellesScoreResult,
} from "@/lib/comparison/types";
import { validateFellesScore } from "@/lib/comparison/math";

import { requireUser } from "./_auth";

/**
 * Upsert the household's agreed-upon felles score for
 * (propertyId × criterionId).
 *
 * Always operates on `auth.uid()` for `updated_by` — the server-side
 * trigger AND the WITH CHECK clause both enforce this. Viewers and
 * non-members are denied at RLS.
 *
 * Returns the upserted row + the new `felles_total` so the client can
 * update the totalscore panel without a full refetch (D6 — refetch is
 * still triggered after the await for completeness).
 */
export async function setFellesScore(
  propertyId: string,
  criterionId: string,
  score: number,
): Promise<ActionResult<SetFellesScoreResult>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const v = validateFellesScore(score);
  if (!v.ok) return err(v.error);

  const { data, error } = await supabase
    .from("property_felles_scores")
    .upsert(
      {
        property_id: propertyId,
        criterion_id: criterionId,
        score: v.value,
        updated_by: user.id,
      },
      { onConflict: "property_id,criterion_id" },
    )
    .select("property_id, criterion_id, score, updated_by, updated_at")
    .single();

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_FELLES_DENIED_MESSAGE);
    }
    return err(FELLES_SAVE_FAILED_MESSAGE);
  }
  if (!data) return err(FELLES_SAVE_FAILED_MESSAGE);

  // Recompute the felles total via the SQL function so the client can
  // update its panel optimistically — but the canonical refetch on
  // focus / after edit is still the server's source of truth.
  const { data: totalData, error: totalError } = await supabase.rpc(
    "compute_felles_total",
    { p_property_id: propertyId },
  );
  if (totalError) {
    return err(FELLES_SAVE_FAILED_MESSAGE);
  }

  revalidatePath(`/app/bolig/${propertyId}/sammenligning`);
  return ok({
    felles_score: {
      property_id: data.property_id,
      criterion_id: data.criterion_id,
      score: data.score,
      updated_by: data.updated_by,
      updated_at: data.updated_at,
    },
    felles_total: (totalData as number | null) ?? null,
  });
}
