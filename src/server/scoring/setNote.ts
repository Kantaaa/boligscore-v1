"use server";

import { revalidatePath } from "next/cache";

import type {
  ActionResult,
  PropertySectionNote,
} from "@/lib/scoring/types";
import {
  SCORE_SAVE_FAILED_MESSAGE,
  VIEWER_SCORE_DENIED_MESSAGE,
  err,
  ok,
} from "@/lib/scoring/types";

import { requireUser } from "./_auth";

/** Maximum body length — MVP cap to keep notes a "huskelapp" not an essay. */
const MAX_NOTE_LENGTH = 4000;

/**
 * Upsert a section note for the caller. Always operates on
 * `auth.uid()`. visibility stays 'private' on every write — D4 says
 * the schema supports 'shared' but no MVP UI sets it.
 */
export async function setNote(
  propertyId: string,
  sectionId: string,
  body: string,
): Promise<ActionResult<PropertySectionNote>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  if (typeof body !== "string") {
    return err(SCORE_SAVE_FAILED_MESSAGE);
  }
  // Truncate-and-trim defensively so a paste of huge text doesn't fail
  // at the DB level. We don't trim the body itself (whitespace can be
  // intentional in a note) — only enforce length.
  const safeBody = body.length > MAX_NOTE_LENGTH
    ? body.slice(0, MAX_NOTE_LENGTH)
    : body;

  const { data, error } = await supabase
    .from("property_section_notes")
    .upsert(
      {
        property_id: propertyId,
        user_id: user.id,
        section_id: sectionId,
        body: safeBody,
        visibility: "private",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "property_id,user_id,section_id" },
    )
    .select(
      "property_id, user_id, section_id, body, visibility, updated_at",
    )
    .single();

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_SCORE_DENIED_MESSAGE);
    }
    return err(SCORE_SAVE_FAILED_MESSAGE);
  }
  if (!data) return err(SCORE_SAVE_FAILED_MESSAGE);

  revalidatePath(`/app/bolig/${propertyId}/min-vurdering`);
  return ok(data as PropertySectionNote);
}
