/**
 * Shared TypeScript types for the weights capability.
 *
 * Kept free of Supabase-specific imports so server actions and client
 * components can both depend on them.
 */

import type { ActionResult } from "@/lib/households/types";
export type { ActionResult } from "@/lib/households/types";
export { err, ok } from "@/lib/households/types";

/** A row in `criterion_sections`. */
export interface CriterionSection {
  id: string;
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
}

/** A row in `criteria`, with the joined section. */
export interface Criterion {
  id: string;
  key: string;
  section_id: string;
  label: string;
  description: string | null;
  sort_order: number;
}

/** Combined view used by the `/app/vekter` page. */
export interface CriteriaCatalog {
  sections: CriterionSection[];
  criteria: Criterion[];
}

/** A row in `household_weights`. */
export interface HouseholdWeight {
  household_id: string;
  criterion_id: string;
  weight: number;
  updated_at: string;
  updated_by: string | null;
}

/** A row in `user_weights`. */
export interface UserWeight {
  household_id: string;
  user_id: string;
  criterion_id: string;
  weight: number;
  updated_at: string;
}

/** Spec-locked Norwegian message for viewer attempting to write. */
export const VIEWER_WEIGHT_DENIED_MESSAGE =
  "Du har ikke tilgang til å endre vekter";

/** Spec-locked Norwegian message for out-of-range weight. */
export const WEIGHT_OUT_OF_RANGE_MESSAGE =
  "Vekt må være et heltall mellom 0 og 10";

/** Spec-locked Norwegian message for missing active household context. */
export const NO_ACTIVE_HOUSEHOLD_MESSAGE =
  "Du må velge en husholdning før du kan endre vekter";

void ({} as ActionResult<unknown>);
