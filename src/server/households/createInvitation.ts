"use server";

import { revalidatePath } from "next/cache";

import { isHouseholdRole } from "@/lib/households/roles";
import type { ActionResult, HouseholdRole } from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

interface CreateInvitationInput {
  householdId: string;
  role?: HouseholdRole;
  invitedEmail?: string | null;
}

/**
 * Create an invitation row and return the token + invitation id. The
 * 7-day expiry is set by the table default (design D4). Authorisation
 * is enforced by the RLS INSERT policy: only owner/member of the
 * target household can insert.
 *
 * MVP: copy-link only. The `invitedEmail` field is stored for future
 * email-send (deferred change `households-email-invitations`) but
 * nothing is sent here.
 */
export async function createInvitation({
  householdId,
  role = "member",
  invitedEmail = null,
}: CreateInvitationInput): Promise<
  ActionResult<{ id: string; token: string; expiresAt: string }>
> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  if (!isHouseholdRole(role)) {
    return err("Ugyldig rolle for invitasjon");
  }

  const cleanEmail =
    typeof invitedEmail === "string" && invitedEmail.trim().length > 0
      ? invitedEmail.trim().toLowerCase()
      : null;

  const { data, error } = await supabase
    .from("household_invitations")
    .insert({
      household_id: householdId,
      role,
      invited_email: cleanEmail,
      created_by: user.id,
    })
    .select("id, token, expires_at")
    .single();

  if (error || !data) {
    return err(error?.message ?? "Kunne ikke opprette invitasjon");
  }

  revalidatePath("/app/husstand");
  return ok({
    id: data.id,
    token: data.token,
    expiresAt: data.expires_at,
  });
}
