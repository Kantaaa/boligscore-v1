/**
 * Shared TypeScript types for the properties capability.
 *
 * Kept free of Supabase-specific imports so server actions and client
 * components can both depend on them.
 */

import type { ActionResult } from "@/lib/households/types";
export type { ActionResult } from "@/lib/households/types";
export { err, ok } from "@/lib/households/types";

/** Lookup row in `property_statuses`. */
export interface PropertyStatus {
  id: string;
  household_id: string | null;
  label: string;
  color: string;
  icon: string;
  is_terminal: boolean;
  sort_order: number;
}

/** A single property record (matches DB columns 1:1). */
export interface Property {
  id: string;
  household_id: string;
  address: string;
  finn_link: string | null;
  price: number | null;
  costs: number | null;
  monthly_costs: number | null;
  bra: number | null;
  primary_rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  year_built: number | null;
  property_type: string | null;
  floor: string | null;
  status_id: string;
  added_by: string;
  created_at: string;
  updated_at: string;
  /** Primary image URL — populated by the FINN parser when available. */
  image_url: string | null;
}

/** Joined row returned by `get_property_list()`. */
export interface PropertyListRow extends Property {
  status_label: string;
  status_color: string;
  status_icon: string;
  status_is_terminal: boolean;
  felles_total: number | null;
  your_total: number | null;
  partner_id: string | null;
  partner_total: number | null;
  your_score_count: number;
  /**
   * Resolved image URL for direct rendering. The server action signs
   * Storage paths and passes external (FINN) URLs through unchanged
   * before returning. NULL when the row has no image. The raw
   * `image_url` column remains available for branching on the
   * value's shape if a caller needs it.
   */
  resolved_image_url: string | null;
}

export type PropertySort = "felles" | "price" | "newest" | "your";

export interface PropertyFilters {
  /** Status ids to include. Empty array means "all statuses". */
  statusIds?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  braMin?: number | null;
  braMax?: number | null;
  /** Free-text match against `address` (substring, case-insensitive). */
  area?: string | null;
}

export interface ListPropertiesInput {
  householdId: string;
  sort?: PropertySort;
  filters?: PropertyFilters;
  /** Top-of-list search input (separate from filters.area per spec). */
  search?: string;
}

export interface CreatePropertyInput {
  householdId: string;
  address: string;
  finn_link?: string | null;
  price?: number | null;
  costs?: number | null;
  monthly_costs?: number | null;
  bra?: number | null;
  primary_rooms?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  year_built?: number | null;
  property_type?: string | null;
  floor?: string | null;
  status_id?: string | null;
  /** Primary image URL — populated by the FINN parser. Optional. */
  image_url?: string | null;
}

export type PropertyPatch = Partial<
  Omit<
    CreatePropertyInput,
    "householdId"
  >
>;

/** Spec-locked Norwegian message used when RLS blocks a viewer write. */
export const VIEWER_WRITE_DENIED_MESSAGE =
  "Du har ikke tilgang til å legge til boliger";

/** Spec-locked Norwegian message used when address is empty. */
export const EMPTY_ADDRESS_MESSAGE = "Adresse er påkrevd";

/** Spec-locked Norwegian message used when status is in use and cannot be deleted. */
export const STATUS_IN_USE_MESSAGE =
  "Du må flytte boligene til en annen status før du sletter denne";

/** Spec-locked Norwegian message used when the typed delete keyword is wrong. */
export const DELETE_KEYWORD = "slett";
export const DELETE_KEYWORD_WRONG_MESSAGE = `Du må skrive "${DELETE_KEYWORD}" for å bekrefte`;

/** Re-export of ActionResult for direct import without dual paths. */
export type { ActionResult as PropertyActionResult };
void ({} as ActionResult<unknown>);
