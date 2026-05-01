"use server";

import type {
  ActionResult,
  HouseholdRole,
  HouseholdSummary,
} from "@/lib/households/types";
import { err, ok } from "@/lib/households/types";

import { requireUser } from "./_auth";

/**
 * List every household the current user is a member of, with role and
 * timestamps. Sorted by `last_accessed_at DESC` so the switcher and
 * "first login default" both pick the most recent household.
 */
export async function listMyHouseholds(): Promise<
  ActionResult<HouseholdSummary[]>
> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { data, error } = await supabase
    .from("household_members")
    .select(
      "role, joined_at, last_accessed_at, household:households(id, name)",
    )
    .eq("user_id", user.id)
    .order("last_accessed_at", { ascending: false });

  if (error) return err(error.message);

  type Row = {
    role: HouseholdRole;
    joined_at: string;
    last_accessed_at: string;
    household: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const summaries: HouseholdSummary[] = ((data ?? []) as Row[])
    .map((row) => {
      const h = Array.isArray(row.household) ? row.household[0] : row.household;
      if (!h) return null;
      return {
        id: h.id,
        name: h.name,
        role: row.role,
        joined_at: row.joined_at,
        last_accessed_at: row.last_accessed_at,
      } satisfies HouseholdSummary;
    })
    .filter((x): x is HouseholdSummary => x !== null);

  return ok(summaries);
}
