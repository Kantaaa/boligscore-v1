"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult, PropertyStatus } from "@/lib/properties/types";
import { err, ok } from "@/lib/properties/types";

import { requireUser } from "./_auth";

interface CreateStatusInput {
  householdId: string;
  label: string;
  color: string;
  icon: string;
  is_terminal?: boolean;
  sort_order?: number;
}

/**
 * Create a household-scoped status. Cannot create global rows from the
 * application — RLS enforces (household_id IS NOT NULL) on INSERT.
 */
export async function createStatus(
  input: CreateStatusInput,
): Promise<ActionResult<PropertyStatus>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const trimmed = input.label.trim();
  if (trimmed.length === 0) {
    return err("Statusnavn er påkrevd");
  }

  const { data, error } = await supabase
    .from("property_statuses")
    .insert({
      household_id: input.householdId,
      label: trimmed,
      color: input.color,
      icon: input.icon,
      is_terminal: input.is_terminal ?? false,
      sort_order: input.sort_order ?? 100,
    })
    .select(
      "id, household_id, label, color, icon, is_terminal, sort_order",
    )
    .single();

  if (error || !data) {
    return err(error?.message ?? "Kunne ikke opprette status");
  }

  revalidatePath("/app");
  return ok(data as PropertyStatus);
}
