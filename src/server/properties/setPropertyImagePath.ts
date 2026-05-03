"use server";

import { revalidatePath } from "next/cache";

import { BUCKET_NAME } from "@/lib/properties/images";
import { isExternalImageUrl } from "@/lib/properties/imageUrl";
import type { ActionResult } from "@/lib/properties/types";
import { VIEWER_WRITE_DENIED_MESSAGE, err, ok } from "@/lib/properties/types";

import { requireUser } from "./_auth";

/**
 * Persist an uploaded image path on a property.
 *
 * Flow (D6 \u2014 upload-new \u2192 update \u2192 delete-old):
 *   1. Client (browser) uploads the compressed JPEG directly via
 *      `supabase.storage.from('property-images').upload(path, blob)`.
 *      The storage policy enforces household membership; RLS-style
 *      denial there keeps a viewer / non-member from ever reaching
 *      this action with a real path.
 *   2. Client calls this action with the new `path`.
 *   3. We update `properties.image_url = path`. RLS on `properties`
 *      already restricts UPDATE to owner/member, so a viewer cannot
 *      land here either.
 *   4. We best-effort delete any previous Storage object that the
 *      property used to point at (only when the previous value was a
 *      Storage path, NOT an external FINN URL).
 *
 * Storage delete failure is non-fatal \u2014 it leaves an orphan file
 * recoverable by a future cleanup job (out of MVP scope).
 */
export async function setPropertyImagePath(
  propertyId: string,
  path: string,
): Promise<ActionResult<{ path: string }>> {
  if (typeof path !== "string" || path.length === 0) {
    return err("Ugyldig bildebane");
  }
  if (isExternalImageUrl(path)) {
    // External URLs are written by the FINN parser only \u2014 not via
    // user upload. Reject defensively so this action's contract stays
    // narrow.
    return err("Ugyldig bildebane");
  }

  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  // Read the previous image_url so we can clean it up on success.
  const { data: prevRow, error: prevError } = await supabase
    .from("properties")
    .select("image_url")
    .eq("id", propertyId)
    .maybeSingle();

  if (prevError) return err(prevError.message);
  if (!prevRow) {
    return err("Bolig ikke funnet");
  }
  const previous: string | null = prevRow.image_url ?? null;

  // Update the row. RLS denies viewers; collapse that into a friendly
  // Norwegian message.
  const { data: updated, error: updateError } = await supabase
    .from("properties")
    .update({ image_url: path })
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

  // Best-effort delete the previous Storage object. We only attempt
  // this when the previous value looked like a Storage path; FINN
  // external URLs are left untouched.
  if (previous && !isExternalImageUrl(previous) && previous !== path) {
    await supabase.storage.from(BUCKET_NAME).remove([previous]);
    // We deliberately ignore the result \u2014 a transient Storage
    // failure leaves an orphan, recoverable by a future cleanup job.
  }

  revalidatePath("/app");
  revalidatePath(`/app/bolig/${propertyId}/oversikt`);
  return ok({ path });
}
