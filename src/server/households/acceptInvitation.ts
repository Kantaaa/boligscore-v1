"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult, HouseholdRole } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

export const ALREADY_MEMBER_MESSAGE =
  "Du er allerede medlem av denne husholdningen";
export const EXPIRED_MESSAGE = "Denne lenken har utløpt. Be om en ny.";
export const ALREADY_ACCEPTED_MESSAGE =
  "Denne invitasjonen er allerede brukt";

/**
 * Accept an invitation atomically.
 *
 * Race-safety strategy (spec — concurrent-acceptance scenario): the
 * single UPDATE statement uses `WHERE token = ... AND accepted_by IS NULL
 * AND expires_at > now()` so two simultaneous callers cannot both
 * succeed. The loser sees zero rows updated and is told the invitation
 * is already used.
 *
 * Already-member short-circuit: if the user is already in the
 * household, we DO NOT mark the invitation accepted — leaving it
 * usable for someone else (per spec).
 */
export async function acceptInvitation(
  token: string,
): Promise<
  ActionResult<{ household_id: string; role: HouseholdRole; alreadyMember?: boolean }>
> {
  if (!token) return err("Mangler token");

  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  // Look the invitation up by token to gate on expiry/acceptance and
  // detect "already-member" before we mutate anything.
  const { data: invRows, error: invErr } = await supabase.rpc(
    "get_invitation_by_token",
    { p_token: token },
  );
  if (invErr) return err(invErr.message);

  type RpcRow = {
    household_id: string;
    role: HouseholdRole;
    expires_at: string;
    accepted_by: string | null;
  };
  const inv = (Array.isArray(invRows) ? invRows[0] : invRows) as
    | RpcRow
    | undefined;
  if (!inv) return err("Fant ikke invitasjonen");

  // Already accepted (by anyone) ----------------------------------------------
  if (inv.accepted_by) {
    return err(ALREADY_ACCEPTED_MESSAGE);
  }

  // Expired -------------------------------------------------------------------
  if (new Date(inv.expires_at).getTime() <= Date.now()) {
    return err(EXPIRED_MESSAGE);
  }

  // Already a member of the household ----------------------------------------
  const { data: existingMember } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", inv.household_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMember) {
    return ok({
      household_id: inv.household_id,
      role: inv.role,
      alreadyMember: true,
    });
  }

  // Atomic claim: only the row that still has accepted_by = NULL wins.
  const { data: claimed, error: claimErr } = await supabase
    .from("household_invitations")
    .update({ accepted_by: user.id })
    .eq("token", token)
    .is("accepted_by", null)
    .gt("expires_at", new Date().toISOString())
    .select("household_id, role");

  if (claimErr) return err(claimErr.message);
  if (!claimed || claimed.length === 0) {
    // Lost the race or expired between read and write.
    return err(ALREADY_ACCEPTED_MESSAGE);
  }

  const winner = claimed[0] as { household_id: string; role: HouseholdRole };

  // Insert the membership row. Self-insert is allowed by RLS.
  const { error: memberErr } = await supabase
    .from("household_members")
    .insert({
      household_id: winner.household_id,
      user_id: user.id,
      role: winner.role,
    });

  if (memberErr) {
    // The membership insert can fail only if the user actually was
    // already a member (race) — surface the friendlier message.
    return err(memberErr.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/husstand");

  return ok({
    household_id: winner.household_id,
    role: winner.role,
  });
}
