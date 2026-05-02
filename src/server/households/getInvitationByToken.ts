"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import type {
  ActionResult,
  HouseholdRole,
  InvitationSummary,
} from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

/**
 * Public read of an invitation by token. Backed by the SECURITY DEFINER
 * function `public.get_invitation_by_token(uuid)` so unauthenticated
 * callers can render the acceptance page (which then redirects to
 * /registrer if no session is present).
 *
 * Returns only the safe public-facing fields; the token itself is the
 * capability and is never leaked back to a different user.
 */
export async function getInvitationByToken(
  token: string,
): Promise<ActionResult<InvitationSummary>> {
  if (!token) return err("Mangler token");

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc("get_invitation_by_token", {
    p_token: token,
  });

  if (error) return err(error.message);
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return err("Fant ikke invitasjonen");
  }

  // RPCs returning a SET return an array; pick the first row.
  type RpcRow = {
    id: string;
    household_id: string;
    household_name: string;
    inviter_id: string;
    role: HouseholdRole;
    expires_at: string;
    accepted_by: string | null;
  };
  const row = (Array.isArray(data) ? data[0] : data) as RpcRow;

  return ok({
    id: row.id,
    household_id: row.household_id,
    household_name: row.household_name,
    inviter_id: row.inviter_id,
    role: row.role,
    expires_at: row.expires_at,
    accepted_by: row.accepted_by,
  } satisfies InvitationSummary);
}
