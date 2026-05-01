"use server";

import type {
  ActionResult,
  HouseholdInvitation,
} from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/**
 * List invitations for a household. RLS SELECT policy allows any member
 * to read; non-members get an empty result.
 *
 * Returns both pending and accepted invitations so the UI can show the
 * "pending" list separately. Sorted newest first.
 */
export async function listInvitations(
  householdId: string,
): Promise<ActionResult<HouseholdInvitation[]>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const { data, error } = await supabase
    .from("household_invitations")
    .select(
      "id, household_id, token, invited_email, role, expires_at, accepted_by, created_by, created_at",
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  if (error) return err(error.message);
  return ok((data ?? []) as HouseholdInvitation[]);
}
