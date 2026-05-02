/**
 * Shared TypeScript types for the scoring capability.
 *
 * Free of Supabase-specific imports so server actions and client
 * components can both depend on them.
 */

import type { ActionResult } from "@/lib/households/types";
export type { ActionResult } from "@/lib/households/types";
export { err, ok } from "@/lib/households/types";

/** A row in `property_scores`. */
export interface PropertyScore {
  property_id: string;
  user_id: string;
  criterion_id: string;
  /** Integer in [0, 10]. */
  score: number;
  updated_at: string;
}

/** A row in `property_section_notes`. */
export interface PropertySectionNote {
  property_id: string;
  user_id: string;
  section_id: string;
  body: string;
  visibility: "private" | "shared";
  updated_at: string;
}

/** Aggregate counters returned by `get_property_with_scores`. */
export interface PropertyWithScoresRow {
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
  your_score_count: number;
  partner_id: string | null;
  partner_score_count: number | null;
  total_criteria: number;
}

/** Return shape of `setScore` — the new score row + the updated counter. */
export interface SetScoreResult {
  score: PropertyScore;
  your_score_count: number;
}

/** Spec-locked Norwegian message: optimistic save failed. */
export const SCORE_SAVE_FAILED_MESSAGE = "Kunne ikke lagre — prøv igjen";

/** Spec-locked Norwegian message: viewer attempting to score. */
export const VIEWER_SCORE_DENIED_MESSAGE =
  "Du har ikke tilgang til å score boliger";

/** Spec-locked Norwegian message: score out of range. */
export const SCORE_OUT_OF_RANGE_MESSAGE =
  "Score må være et heltall mellom 0 og 10";

/** Counter format helper — Norwegian. */
export function formatScoreCounter(scored: number, total: number): string {
  return `${scored} av ${total} kriterier scoret`;
}

/** Indicator labels for the notes textarea autosave. */
export const NOTES_SAVING_LABEL = "lagrer...";
export const NOTES_SAVED_LABEL = "lagret";

void ({} as ActionResult<unknown>);
