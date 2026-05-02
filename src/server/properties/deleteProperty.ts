"use server";

import { revalidatePath } from "next/cache";

import { BUCKET_NAME } from "@/lib/properties/images";
import { isExternalImageUrl } from "@/lib/properties/imageUrl";
import type { ActionResult } from "@/lib/properties/types";
import {
  DELETE_KEYWORD,
  DELETE_KEYWORD_WRONG_MESSAGE,
  VIEWER_WRITE_DENIED_MESSAGE,
  err,
  ok,
} from "@/lib/properties/types";

import { requireUser } from "./_auth";

/**
 * Hard delete a property. Cascades to dependent rows (scores,
 * felles-scores, notes) via FK ON DELETE CASCADE on those tables.
 *
 * Spec — D9: typed-keyword confirmation. Caller must pass the literal
 * string `slett` (Norwegian for "delete") as `confirmKeyword`. The
 * keyword is server-checked to defend against malicious clients
 * skipping the modal.
 *
 * Image cascade (properties-images): if the property has an uploaded
 * image (a Storage path, not a FINN external URL) we best-effort
 * delete the Storage object BEFORE deleting the row. A storage
 * failure does NOT block the property delete — the orphan is
 * recoverable later, but a phantom property would be worse.
 */
export async function deleteProperty(
  propertyId: string,
  confirmKeyword: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  if (
    typeof confirmKeyword !== "string" ||
    confirmKeyword.trim().toLowerCase() !== DELETE_KEYWORD
  ) {
    return err(DELETE_KEYWORD_WRONG_MESSAGE);
  }

  // Resolve image_url first so we can best-effort cascade-delete the
  // Storage object. Read failure is non-fatal — proceed to the row
  // delete and let RLS / NotFound paths take over.
  const { data: prevRow } = await supabase
    .from("properties")
    .select("image_url")
    .eq("id", propertyId)
    .maybeSingle();
  const imagePath: string | null = prevRow?.image_url ?? null;

  const { data, error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .select("id");

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_WRITE_DENIED_MESSAGE);
    }
    return err(error.message);
  }
  if (!data || data.length === 0) {
    return err("Du har ikke tilgang til å slette denne boligen");
  }

  // Best-effort cascade — only when the column held an uploaded
  // Storage path (FINN external URLs are owned by FINN, not us).
  if (imagePath && !isExternalImageUrl(imagePath)) {
    await supabase.storage.from(BUCKET_NAME).remove([imagePath]);
  }

  revalidatePath("/app");
  return ok(undefined);
}
