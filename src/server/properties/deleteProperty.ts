"use server";

import { revalidatePath } from "next/cache";

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

  revalidatePath("/app");
  return ok(undefined);
}
