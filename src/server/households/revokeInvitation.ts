"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/**
 * Delete an unaccepted invitation. RLS DELETE policy allows the
 * original inviter or any owner of the household.
 */
export async function revokeInvitation(
  invitationId: string,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const { error, count } = await supabase
    .from("household_invitations")
    .delete({ count: "exact" })
    .eq("id", invitationId);

  if (error) return err(error.message);
  if (count === 0) {
    return err("Du har ikke tillatelse til å trekke tilbake denne invitasjonen");
  }

  revalidatePath("/app/husstand");
  return ok(undefined);
}
