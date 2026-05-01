"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/properties/types";
import { VIEWER_WRITE_DENIED_MESSAGE, err, ok } from "@/lib/properties/types";

import { requireUser } from "./_auth";

/**
 * Convenience wrapper for the inline status picker on the list cards
 * and the Oversikt tab. Equivalent to `updateProperty(id, { status_id })`
 * but with a tighter surface so callers don't accidentally pass other
 * fields when the user only meant to change the status.
 */
export async function setPropertyStatus(
  propertyId: string,
  statusId: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const { data, error } = await supabase
    .from("properties")
    .update({ status_id: statusId })
    .eq("id", propertyId)
    .select("id");

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_WRITE_DENIED_MESSAGE);
    }
    return err(error.message);
  }
  if (!data || data.length === 0) {
    return err("Du har ikke tilgang til å endre statusen");
  }

  revalidatePath("/app");
  revalidatePath(`/app/bolig/${propertyId}/oversikt`);
  return ok(undefined);
}
