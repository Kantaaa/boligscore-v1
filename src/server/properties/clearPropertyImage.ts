"use server";

import { revalidatePath } from "next/cache";

import { BUCKET_NAME } from "@/lib/properties/images";
import { isExternalImageUrl } from "@/lib/properties/imageUrl";
import type { ActionResult } from "@/lib/properties/types";
import { VIEWER_WRITE_DENIED_MESSAGE, err, ok } from "@/lib/properties/types";

import { requireUser } from "./_auth";

/**
 * Clear a property's image: set `image_url` to NULL and best-effort
 * delete the Storage object. No-op when the property has no image.
 *
 * RLS on `properties.UPDATE` blocks viewers, mapped to the
 * VIEWER_WRITE_DENIED_MESSAGE for a friendly Norwegian inline error.
 */
export async function clearPropertyImage(
  propertyId: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const { data: prevRow, error: prevError } = await supabase
    .from("properties")
    .select("image_url")
    .eq("id", propertyId)
    .maybeSingle();

  if (prevError) return err(prevError.message);
  if (!prevRow) return err("Bolig ikke funnet");

  const previous: string | null = prevRow.image_url ?? null;

  const { data: updated, error: updateError } = await supabase
    .from("properties")
    .update({ image_url: null })
    .eq("id", propertyId)
    .select("id");

  if (updateError) {
    if (updateError.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_WRITE_DENIED_MESSAGE);
    }
    return err(updateError.message);
  }
  if (!updated || updated.length === 0) {
    return err("Du har ikke tilgang til \u00e5 endre bildet");
  }

  if (previous && !isExternalImageUrl(previous)) {
    await supabase.storage.from(BUCKET_NAME).remove([previous]);
    // Best-effort \u2014 ignored on failure (D6).
  }

  revalidatePath("/app");
  revalidatePath(`/app/bolig/${propertyId}/oversikt`);
  return ok(undefined);
}
