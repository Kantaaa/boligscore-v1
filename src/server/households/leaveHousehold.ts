"use server";

import { revalidatePath } from "next/cache";

import { isSoleOwner } from "@/lib/households/roles";
import type { ActionResult, HouseholdRole } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/** Sole-owner refusal message (Norwegian copy locked in by spec). */
export const SOLE_OWNER_LEAVE_MESSAGE =
  "Du må først gjøre noen andre til eier før du kan forlate husholdningen";

/**
 * Self-leave. Blocked when the caller is the only owner — the user
 * must promote another member to owner first.
 */
export async function leaveHousehold(
  householdId: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { data: members, error: readErr } = await supabase
    .from("household_members")
    .select("user_id, role")
    .eq("household_id", householdId);

  if (readErr) return err(readErr.message);
  const list = (members ?? []) as { user_id: string; role: HouseholdRole }[];

  if (isSoleOwner({ members: list, userId: user.id })) {
    return err(SOLE_OWNER_LEAVE_MESSAGE);
  }

  const { error: deleteErr, count } = await supabase
    .from("household_members")
    .delete({ count: "exact" })
    .eq("household_id", householdId)
    .eq("user_id", user.id);

  if (deleteErr) return err(deleteErr.message);
  if (count === 0) {
    return err("Du er ikke medlem av denne husholdningen");
  }

  revalidatePath("/app");
  revalidatePath("/app/husstand");
  return ok(undefined);
}
