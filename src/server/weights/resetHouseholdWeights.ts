"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/weights/types";
import {
  VIEWER_WEIGHT_DENIED_MESSAGE,
  err,
  ok,
} from "@/lib/weights/types";

import { requireUser } from "./_auth";

/**
 * Reset every felles weight in the household back to `5`.
 *
 * D6 (design.md): "Tilbakestill alle til 5" is exposed on each
 * segmented-control view. The reset modal explicitly tells the user
 * this affects the household's shared weights, not just their own.
 *
 * Authz: owner or member only; viewer denied at RLS.
 */
export async function resetHouseholdWeights(
  householdId: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { data, error } = await supabase
    .from("household_weights")
    .update({
      weight: 5,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("household_id", householdId)
    .select("criterion_id");

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_WEIGHT_DENIED_MESSAGE);
    }
    return err(error.message);
  }
  if (!data || data.length === 0) {
    return err(VIEWER_WEIGHT_DENIED_MESSAGE);
  }

  revalidatePath("/app/vekter");
  return ok(undefined);
}
