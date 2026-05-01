"use server";

import { revalidatePath } from "next/cache";

import {
  THRESHOLD_DENIED_MESSAGE,
  err,
  ok,
} from "@/lib/comparison/types";
import type { ActionResult } from "@/lib/comparison/types";
import { validateThreshold } from "@/lib/comparison/math";

import { requireUser } from "./_auth";

/**
 * Owner-only: update `households.comparison_disagreement_threshold`.
 * Authorisation is enforced by the existing RLS UPDATE policy on
 * `households` (`has_household_role(id, ['owner'])`) — non-owners get
 * "no rows updated", which we surface as a Norwegian error.
 *
 * The threshold change does NOT immediately re-render existing
 * comparison views: clients refetch on focus, so disagreement
 * highlighting catches up on next visit.
 */
export async function setDisagreementThreshold(
  householdId: string,
  threshold: number,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const v = validateThreshold(threshold);
  if (!v.ok) return err(v.error);

  const { data, error } = await supabase
    .from("households")
    .update({ comparison_disagreement_threshold: v.value })
    .eq("id", householdId)
    .select("id");

  if (error) return err(error.message);
  if (!data || data.length === 0) {
    return err(THRESHOLD_DENIED_MESSAGE);
  }

  revalidatePath("/app/husstand");
  return ok(undefined);
}
