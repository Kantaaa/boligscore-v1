"use server";

import { revalidatePath } from "next/cache";

import { validateHouseholdName } from "@/lib/households/roles";
import type { ActionResult } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/**
 * Owner-only rename. Authorisation is enforced by RLS UPDATE policy on
 * `households` (`has_household_role(id, ['owner'])`) — non-owner gets
 * "no rows updated", which we surface as an authorisation error.
 */
export async function renameHousehold(
  id: string,
  name: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const validation = validateHouseholdName(name);
  if (!validation.ok) return err(validation.error);

  const { data, error } = await supabase
    .from("households")
    .update({ name: validation.value })
    .eq("id", id)
    .select("id");

  if (error) return err(error.message);
  if (!data || data.length === 0) {
    return err("Du har ikke tillatelse til å endre navnet på husholdningen");
  }

  revalidatePath("/app/husstand");
  return ok(undefined);
}
