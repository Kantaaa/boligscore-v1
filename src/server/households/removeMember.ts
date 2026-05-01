"use server";

import { revalidatePath } from "next/cache";

import { isSoleOwner } from "@/lib/households/roles";
import type { ActionResult, HouseholdRole } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/**
 * Owner removes another member. RLS allows DELETE for self OR owner;
 * the action also blocks removing the last owner.
 */
export async function removeMember(
  householdId: string,
  userId: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  if (userId === user.id) {
    return err("Bruk «Forlat husholdning» for å fjerne deg selv");
  }

  const { data: members, error: readErr } = await supabase
    .from("household_members")
    .select("user_id, role")
    .eq("household_id", householdId);

  if (readErr) return err(readErr.message);
  const list = (members ?? []) as { user_id: string; role: HouseholdRole }[];

  if (isSoleOwner({ members: list, userId })) {
    return err(
      "Kan ikke fjerne den siste eieren — gjør noen andre til eier først",
    );
  }

  const { error: deleteErr, count } = await supabase
    .from("household_members")
    .delete({ count: "exact" })
    .eq("household_id", householdId)
    .eq("user_id", userId);

  if (deleteErr) return err(deleteErr.message);
  if (count === 0) {
    return err("Du har ikke tillatelse til å fjerne dette medlemmet");
  }

  revalidatePath("/app/husstand");
  return ok(undefined);
}
