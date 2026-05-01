"use server";

import type { ActionResult, PropertyStatus } from "@/lib/properties/types";
import { err, ok } from "@/lib/properties/types";

import { requireUser } from "./_auth";

/**
 * Return all statuses visible to the caller for the given household:
 * the seven global rows plus any household-specific custom statuses.
 *
 * Sorted by sort_order then label so the UI is stable.
 *
 * RLS does the actual access control — this just funnels the query.
 */
export async function listStatuses(
  householdId: string | null,
): Promise<ActionResult<PropertyStatus[]>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  let query = supabase
    .from("property_statuses")
    .select(
      "id, household_id, label, color, icon, is_terminal, sort_order",
    );

  if (householdId) {
    // Globals OR rows for this household. Two `.is()` / `.eq()` cannot
    // be OR'd via the JS client; use an `.or()` filter.
    query = query.or(`household_id.is.null,household_id.eq.${householdId}`);
  } else {
    query = query.is("household_id", null);
  }

  const { data, error } = await query
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) return err(error.message);
  return ok((data ?? []) as PropertyStatus[]);
}
