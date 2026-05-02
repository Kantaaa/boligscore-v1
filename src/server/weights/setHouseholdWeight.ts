"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/weights/types";
import {
  VIEWER_WEIGHT_DENIED_MESSAGE,
  err,
  ok,
} from "@/lib/weights/types";
import { validateWeight } from "@/lib/weights/validation";

import { requireUser } from "./_auth";

/**
 * Update a single felles weight for the household.
 *
 * Validation:
 *   - weight is an integer in [0, 10] (CHECK + client validator).
 *
 * Authz:
 *   - Owner / member can update; viewer denied at RLS.
 *   - Non-members denied at RLS (no row visible to UPDATE).
 *
 * Always sets `updated_by = auth.uid()` so the UI can show who last
 * touched the slider (D-side reference for the comparison view's
 * "last edited by" display).
 */
export async function setHouseholdWeight(
  householdId: string,
  criterionId: string,
  weight: number,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const v = validateWeight(weight);
  if (!v.ok) return err(v.error);

  const { data, error } = await supabase
    .from("household_weights")
    .update({
      weight: v.value,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("household_id", householdId)
    .eq("criterion_id", criterionId)
    .select("household_id");

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_WEIGHT_DENIED_MESSAGE);
    }
    return err(error.message);
  }
  if (!data || data.length === 0) {
    // RLS filtered the row (non-member or viewer with no UPDATE policy).
    return err(VIEWER_WEIGHT_DENIED_MESSAGE);
  }

  revalidatePath("/app/vekter");
  return ok(undefined);
}
