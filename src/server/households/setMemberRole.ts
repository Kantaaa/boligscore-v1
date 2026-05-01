"use server";

import { revalidatePath } from "next/cache";

import { isHouseholdRole, isSoleOwner } from "@/lib/households/roles";
import type { ActionResult, HouseholdRole } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/**
 * Owner-only role change. Validates the new role, checks that we don't
 * demote the last owner of the household (server-side defence in
 * depth — the UI also pre-flights this).
 */
export async function setMemberRole(
  householdId: string,
  userId: string,
  role: HouseholdRole,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  if (!isHouseholdRole(role)) {
    return err("Ugyldig rolle");
  }

  // Sole-owner check: if we're changing this user away from owner and
  // they're the only owner, refuse.
  if (role !== "owner") {
    const { data: members, error: readErr } = await supabase
      .from("household_members")
      .select("user_id, role")
      .eq("household_id", householdId);

    if (readErr) return err(readErr.message);

    if (
      isSoleOwner({
        members: (members ?? []) as { user_id: string; role: HouseholdRole }[],
        userId,
      })
    ) {
      return err(
        "Kan ikke fjerne rollen som eier — det må alltid være minst én eier",
      );
    }
  }

  const { data, error } = await supabase
    .from("household_members")
    .update({ role })
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .select("user_id");

  if (error) return err(error.message);
  if (!data || data.length === 0) {
    return err("Du har ikke tillatelse til å endre roller");
  }

  revalidatePath("/app/husstand");
  return ok(undefined);
}
