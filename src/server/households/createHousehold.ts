"use server";

import { revalidatePath } from "next/cache";

import { validateHouseholdName } from "@/lib/households/roles";
import type { ActionResult } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/**
 * Create a household and the first-owner membership row.
 *
 * Spec: Requirement "Household creation" — the calling user becomes
 * the owner; empty / whitespace names are rejected; unauthenticated
 * callers get an auth error.
 *
 * Atomicity: we don't have a transaction across two table inserts here
 * because Supabase JS doesn't expose multi-statement TX. If the second
 * insert fails after the first, the household exists with no members
 * and the user can re-create. The rare failure mode is acceptable for
 * MVP; a future iteration could move this into a SECURITY DEFINER
 * SQL function for true atomicity.
 */
export async function createHousehold(
  name: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const validation = validateHouseholdName(name);
  if (!validation.ok) return err(validation.error);

  const { data: household, error: insertError } = await supabase
    .from("households")
    .insert({ name: validation.value, created_by: user.id })
    .select("id")
    .single();

  if (insertError || !household) {
    return err(insertError?.message ?? "Kunne ikke opprette husholdning");
  }

  const { error: memberError } = await supabase
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    // Best-effort cleanup of the orphaned household row. RLS allows the
    // creator to delete their own household via has_household_role.
    await supabase.from("households").delete().eq("id", household.id);
    return err(memberError.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/husstand");
  return ok({ id: household.id });
}
