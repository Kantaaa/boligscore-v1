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
 * Reset the caller's 22 personal weights for the active household to `5`.
 *
 * Always operates on `auth.uid()`'s rows; cross-user resets are not
 * exposed.
 */
export async function resetUserWeights(
  householdId: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { data, error } = await supabase
    .from("user_weights")
    .update({
      weight: 5,
      updated_at: new Date().toISOString(),
    })
    .eq("household_id", householdId)
    .eq("user_id", user.id)
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
