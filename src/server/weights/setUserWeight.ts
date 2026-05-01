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
 * Update the caller's own personal weight for a single criterion.
 *
 * No `userId` argument: the action ALWAYS operates on `auth.uid()`'s
 * row. Cross-user writes are not exposed; the UI never needs to set
 * someone else's personal weight.
 *
 * Authz:
 *   - Owner / member of the household can update.
 *   - Viewer denied at RLS.
 *   - Non-members denied at RLS.
 */
export async function setUserWeight(
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
    .from("user_weights")
    .update({
      weight: v.value,
      updated_at: new Date().toISOString(),
    })
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .eq("criterion_id", criterionId)
    .select("household_id");

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
