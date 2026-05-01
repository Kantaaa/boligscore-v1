"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/**
 * Hard-cascade delete (design D11). RLS DELETE policy enforces owner.
 * The UI must require the user to type the household name as
 * confirmation; the server still verifies the typed name matches the
 * stored name as a defence-in-depth check.
 */
export async function deleteHousehold(
  id: string,
  typedName: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  // Verify the typed name matches before issuing the DELETE.
  const { data: household, error: readError } = await supabase
    .from("households")
    .select("name")
    .eq("id", id)
    .single();

  if (readError || !household) {
    return err("Fant ikke husholdningen");
  }

  if ((typedName ?? "").trim() !== household.name) {
    return err(
      "Navnet du skrev stemmer ikke med navnet på husholdningen",
    );
  }

  const { error: deleteError, count } = await supabase
    .from("households")
    .delete({ count: "exact" })
    .eq("id", id);

  if (deleteError) return err(deleteError.message);
  if (count === 0) {
    return err("Du har ikke tillatelse til å slette denne husholdningen");
  }

  revalidatePath("/app");
  revalidatePath("/app/husstand");
  return ok(undefined);
}
