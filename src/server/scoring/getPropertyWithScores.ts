"use server";

import type {
  ActionResult,
  PropertyWithScoresRow,
} from "@/lib/scoring/types";
import { err, ok } from "@/lib/scoring/types";

import { requireUser } from "./_auth";

/**
 * Wrapper around the `get_property_with_scores(p_property_id, p_viewer_id)`
 * SQL function. Returns the property + viewer's score count + partner's
 * score count (NOT individual partner scores — those are deliberately
 * withheld per spec).
 *
 * Returns `err("Bolig ikke funnet")` if the function returns no rows
 * (either the property doesn't exist OR the caller isn't a member of
 * its household — we deliberately collapse those into one error so we
 * don't leak existence to non-members).
 */
export async function getPropertyWithScores(
  propertyId: string,
): Promise<ActionResult<PropertyWithScoresRow>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { data, error } = await supabase.rpc("get_property_with_scores", {
    p_property_id: propertyId,
    p_viewer_id: user.id,
  });

  if (error) return err(error.message);
  const rows = (data ?? []) as PropertyWithScoresRow[];
  if (rows.length === 0) return err("Bolig ikke funnet");

  return ok(rows[0]);
}
