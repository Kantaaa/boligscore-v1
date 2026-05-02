"use server";

import type {
  ActionResult,
  ComparisonRow,
  PropertyComparison,
} from "@/lib/comparison/types";
import { err, ok } from "@/lib/comparison/types";

import { requireUser } from "./_auth";

/**
 * Wrap the `get_property_comparison(p_property_id, p_viewer_id)` SQL
 * function. Returns the property + threshold + member count + per-row
 * matrix data + the three totalscores in a single round-trip.
 *
 * Returns `err("Bolig ikke funnet")` if the function returns no rows
 * (property doesn't exist OR viewer isn't a member — collapsed into
 * one error per the same pattern in `getPropertyWithScores`).
 */
export async function getComparison(
  propertyId: string,
): Promise<ActionResult<PropertyComparison>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { data, error } = await supabase.rpc("get_property_comparison", {
    p_property_id: propertyId,
    p_viewer_id: user.id,
  });

  if (error) return err(error.message);
  const rows = (data ?? []) as Array<{
    property_id: string;
    household_id: string;
    address: string;
    threshold: number;
    member_count: number;
    partner_user_id: string | null;
    rows: ComparisonRow[] | null;
    felles_total: number | null;
    your_total: number | null;
    partner_total: number | null;
  }>;

  if (rows.length === 0) return err("Bolig ikke funnet");
  const row = rows[0];

  // The `rows` field is a jsonb column; supabase-js returns it parsed
  // already, but defend against null / string just in case.
  let parsedRows: ComparisonRow[];
  if (Array.isArray(row.rows)) {
    parsedRows = row.rows as ComparisonRow[];
  } else if (typeof row.rows === "string") {
    try {
      parsedRows = JSON.parse(row.rows) as ComparisonRow[];
    } catch {
      parsedRows = [];
    }
  } else {
    parsedRows = [];
  }

  const result: PropertyComparison = {
    property_id: row.property_id,
    household_id: row.household_id,
    address: row.address,
    threshold: row.threshold,
    member_count: row.member_count,
    partner_user_id: row.partner_user_id,
    rows: parsedRows,
    felles_total: row.felles_total,
    your_total: row.your_total,
    partner_total: row.partner_total,
  };

  return ok(result);
}
