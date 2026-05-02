"use server";

import { revalidatePath } from "next/cache";

import type {
  ActionResult,
  CreatePropertyInput,
  Property,
} from "@/lib/properties/types";
import { VIEWER_WRITE_DENIED_MESSAGE, err, ok } from "@/lib/properties/types";
import { isValidYearBuilt, validateAddress } from "@/lib/properties/validation";

import { requireUser } from "./_auth";

/**
 * Create a property in the active household.
 *
 * Spec — "Property creation":
 *   - address required, non-empty (DB CHECK + client validator).
 *   - default status = `vurderer` (D8) if no `status_id` supplied.
 *   - added_by = caller (RLS WITH CHECK enforces this).
 *   - Viewer denied at RLS; the action surfaces the spec-locked message.
 */
export async function createProperty(
  input: CreatePropertyInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const addressValidation = validateAddress(input.address);
  if (!addressValidation.ok) return err(addressValidation.error);

  if (input.year_built !== undefined && input.year_built !== null) {
    if (!isValidYearBuilt(input.year_built)) {
      return err("Ugyldig byggeår");
    }
  }

  // Resolve status id: prefer the caller-supplied one, otherwise look
  // up the global `vurderer` row.
  let statusId = input.status_id ?? null;
  if (!statusId) {
    const { data: vurderer, error: lookupErr } = await supabase
      .from("property_statuses")
      .select("id")
      .is("household_id", null)
      .eq("label", "vurderer")
      .single();
    if (lookupErr || !vurderer) {
      return err("Standardstatus 'vurderer' mangler — kontakt support");
    }
    statusId = vurderer.id;
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({
      household_id: input.householdId,
      address: addressValidation.value,
      finn_link: input.finn_link ?? null,
      price: input.price ?? null,
      costs: input.costs ?? null,
      monthly_costs: input.monthly_costs ?? null,
      bra: input.bra ?? null,
      primary_rooms: input.primary_rooms ?? null,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      year_built: input.year_built ?? null,
      property_type: input.property_type ?? null,
      floor: input.floor ?? null,
      status_id: statusId,
      added_by: user.id,
      image_url: input.image_url ?? null,
    })
    .select("id")
    .single<Pick<Property, "id">>();

  if (error || !data) {
    // RLS-denied insert returns a generic Postgres error mentioning
    // "row-level security" — surface the spec-locked viewer message.
    if (error?.message?.toLowerCase().includes("row-level security")) {
      return err(VIEWER_WRITE_DENIED_MESSAGE);
    }
    return err(error?.message ?? "Kunne ikke opprette bolig");
  }

  revalidatePath("/app");
  return ok({ id: data.id });
}
