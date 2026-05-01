"use server";

import { revalidatePath } from "next/cache";

import type {
  ActionResult,
  PropertyPatch,
} from "@/lib/properties/types";
import { VIEWER_WRITE_DENIED_MESSAGE, err, ok } from "@/lib/properties/types";
import { isValidYearBuilt, validateAddress } from "@/lib/properties/validation";

import { requireUser } from "./_auth";

/**
 * Update a property. Only owner/member roles can write (RLS enforced).
 * `household_id`, `added_by`, `created_at` are immutable (DB trigger
 * `properties_prevent_immutable_update`).
 */
export async function updateProperty(
  id: string,
  patch: PropertyPatch,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  // Validate address only if it's being changed.
  if (patch.address !== undefined) {
    const v = validateAddress(patch.address);
    if (!v.ok) return err(v.error);
    patch.address = v.value;
  }

  if (patch.year_built !== undefined && patch.year_built !== null) {
    if (!isValidYearBuilt(patch.year_built)) {
      return err("Ugyldig byggeår");
    }
  }

  // Strip undefined and disallowed fields client-side as defence in depth.
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (k === "householdId" || k === "household_id") continue;
    if (k === "added_by" || k === "created_at" || k === "id") continue;
    update[k] = v;
  }

  if (Object.keys(update).length === 0) {
    return ok(undefined);
  }

  const { data, error } = await supabase
    .from("properties")
    .update(update)
    .eq("id", id)
    .select("id");

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_WRITE_DENIED_MESSAGE);
    }
    if (error.message?.includes("immutable")) {
      return err("Dette feltet kan ikke endres");
    }
    return err(error.message);
  }
  if (!data || data.length === 0) {
    // No row updated → either RLS hid the row or it doesn't exist.
    return err("Du har ikke tilgang til å endre denne boligen");
  }

  revalidatePath("/app");
  revalidatePath(`/app/bolig/${id}`);
  revalidatePath(`/app/bolig/${id}/oversikt`);
  return ok(undefined);
}
