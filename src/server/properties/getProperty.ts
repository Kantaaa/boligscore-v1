"use server";

import type {
  ActionResult,
  Property,
  PropertyStatus,
} from "@/lib/properties/types";
import { err, ok } from "@/lib/properties/types";

import { requireUser } from "./_auth";

export interface GetPropertyResult {
  property: Property;
  status: PropertyStatus;
  /** Email of the `added_by` user, if available. */
  added_by_email: string | null;
}

/**
 * Fetch a single property + joined status + added_by email.
 * Returns NotFound err when the row is hidden by RLS or does not exist
 * (we deliberately collapse those into one error so we don't leak
 * existence to non-members).
 */
export async function getProperty(
  id: string,
): Promise<ActionResult<GetPropertyResult>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const { data, error } = await supabase
    .from("properties")
    .select(
      `
      id, household_id, address, finn_link, price, costs, monthly_costs,
      bra, primary_rooms, bedrooms, bathrooms, year_built, property_type,
      floor, status_id, added_by, created_at, updated_at,
      status:property_statuses!inner(
        id, household_id, label, color, icon, is_terminal, sort_order
      )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return err(error.message);
  if (!data) return err("Bolig ikke funnet");

  // Resolve added_by email best-effort. If the user has been removed
  // or the membership view doesn't expose them, fall back to null —
  // the UI shows "Lagt til av tidligere medlem" in that case.
  let addedByEmail: string | null = null;
  const { data: memberRow } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", data.household_id)
    .eq("user_id", data.added_by)
    .maybeSingle();
  if (memberRow) {
    // We don't have a direct join on auth.users without the service
    // role. Email is filled in by a downstream profile fetch later;
    // for MVP the UI shows the user id segment. Keep null here so the
    // UI can apply its own placeholder.
    addedByEmail = null;
  }

  // Supabase typing returns the joined row as an array | object depending
  // on cardinality; coerce to single object.
  const statusRaw = (data as { status: PropertyStatus | PropertyStatus[] }).status;
  const status = Array.isArray(statusRaw) ? statusRaw[0] : statusRaw;

  const { status: _omit, ...rest } = data as { status: unknown } & Property;
  void _omit;
  return ok({
    property: rest as Property,
    status: status as PropertyStatus,
    added_by_email: addedByEmail,
  });
}
