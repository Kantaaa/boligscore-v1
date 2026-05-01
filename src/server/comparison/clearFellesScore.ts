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
  ClearFellesScoreResult,
} from "@/lib/comparison/types";

import { requireUser } from "./_auth";

/**
 * Delete the felles score row for (propertyId × criterionId). Sparse
 * storage (D2): clearing returns the table to "not set" for that
 * criterion, which the UI renders as the snitt placeholder again.
 *
 * RLS denies viewers and non-members. Returns the new felles_total so
 * the client can update the totalscore panel without refetching.
 */
export async function clearFellesScore(
  propertyId: string,
  criterionId: string,
): Promise<ActionResult<ClearFellesScoreResult>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const { error } = await supabase
    .from("property_felles_scores")
    .delete()
    .eq("property_id", propertyId)
    .eq("criterion_id", criterionId);

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_FELLES_DENIED_MESSAGE);
    }
    return err(FELLES_SAVE_FAILED_MESSAGE);
  }

  const { data: totalData, error: totalError } = await supabase.rpc(
    "compute_felles_total",
    { p_property_id: propertyId },
  );
  if (totalError) {
    return err(FELLES_SAVE_FAILED_MESSAGE);
  }

  revalidatePath(`/app/bolig/${propertyId}/sammenligning`);
  return ok({
    felles_total: (totalData as number | null) ?? null,
  });
}
