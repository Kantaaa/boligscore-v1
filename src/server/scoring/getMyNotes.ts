"use server";

import type {
  ActionResult,
  PropertySectionNote,
} from "@/lib/scoring/types";
import { err, ok } from "@/lib/scoring/types";

import { requireUser } from "./_auth";

/**
 * Returns the caller's section notes for a property — one row per
 * (property × user × section). Missing rows are NOT auto-created on
 * read (we only create on first write via `setNote`). The client
 * treats absence as an empty body and renders an empty textarea.
 *
 * RLS allows the caller's own notes (any visibility) and any partner
 * note where `visibility = 'shared'`. MVP UI doesn't write 'shared',
 * so in practice this returns the caller's own notes only.
 */
export async function getMyNotes(
  propertyId: string,
): Promise<ActionResult<PropertySectionNote[]>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { data, error } = await supabase
    .from("property_section_notes")
    .select(
      "property_id, user_id, section_id, body, visibility, updated_at",
    )
    .eq("property_id", propertyId)
    .eq("user_id", user.id);

  if (error) return err(error.message);

  return ok((data ?? []) as PropertySectionNote[]);
}
