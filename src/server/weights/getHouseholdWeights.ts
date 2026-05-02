"use server";

import type { ActionResult, HouseholdWeight } from "@/lib/weights/types";
import { err, ok } from "@/lib/weights/types";

import { requireUser } from "./_auth";

/**
 * Returns all 22 felles weights for a household. RLS filters at SELECT
 * so non-members get an empty array regardless of the householdId
 * argument; the server returns ok([]) in that case.
 */
export async function getHouseholdWeights(
  householdId: string,
): Promise<ActionResult<HouseholdWeight[]>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const { data, error } = await supabase
    .from("household_weights")
    .select("household_id, criterion_id, weight, updated_at, updated_by")
    .eq("household_id", householdId);

  if (error) return err(error.message);
  return ok((data ?? []) as HouseholdWeight[]);
}
