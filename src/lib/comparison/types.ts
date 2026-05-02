/**
 * Shared TypeScript types for the comparison capability.
 *
 * Free of Supabase-specific imports so server actions and client
 * components can both depend on them.
 */

import type { ActionResult } from "@/lib/households/types";
export type { ActionResult } from "@/lib/households/types";
export { err, ok } from "@/lib/households/types";

/** A row in `property_felles_scores`. */
export interface PropertyFellesScore {
  property_id: string;
  criterion_id: string;
  /** Integer in [0, 10]. */
  score: number;
  updated_by: string;
  updated_at: string;
}

/** One criterion-row in the comparison matrix. */
export interface ComparisonRow {
  criterion_id: string;
  criterion_key: string;
  criterion_label: string;
  criterion_sort_order: number;
  section_id: string;
  section_key: string;
  section_label: string;
  section_sort_order: number;
  /** Viewer's own score, null if unscored. */
  your_score: number | null;
  /** Partner's score, null if unscored or no partner (1-or-3+ households). */
  partner_score: number | null;
  /** Partner's user_id (null when no unique partner). */
  partner_user_id: string | null;
  /** round((your+partner)/2). null when either is null or no partner. */
  snitt: number | null;
  /** Stored felles score, null when no row exists in property_felles_scores. */
  felles_score: number | null;
  /** True iff a row in property_felles_scores exists for this criterion. */
  felles_set: boolean;
}

/** Top-level payload returned by `get_property_comparison`. */
export interface PropertyComparison {
  property_id: string;
  household_id: string;
  address: string;
  /** households.comparison_disagreement_threshold (1..10). */
  threshold: number;
  /** Total members in the property's household — drives UI variant. */
  member_count: number;
  /** Unique partner's user_id (only when member_count === 2). */
  partner_user_id: string | null;
  /** Per-criterion rows, sorted by section then criterion. */
  rows: ComparisonRow[];
  /** felles_total — null when no household weights or all-zero. */
  felles_total: number | null;
  /** din_total — null when viewer has no scored criteria or all-zero weights. */
  your_total: number | null;
  /** partner_total — null when no partner / no scored criteria / all-zero. */
  partner_total: number | null;
}

/** Return shape of `setFellesScore` — the upserted row + the new felles total. */
export interface SetFellesScoreResult {
  felles_score: PropertyFellesScore;
  felles_total: number | null;
}

/** Return shape of `clearFellesScore`. */
export interface ClearFellesScoreResult {
  felles_total: number | null;
}

// -----------------------------------------------------------------------------
// User-facing message constants. Norwegian bokmål, hardcoded.
// -----------------------------------------------------------------------------

export const FELLES_SAVE_FAILED_MESSAGE = "Kunne ikke lagre felles — prøv igjen";

export const VIEWER_FELLES_DENIED_MESSAGE =
  "Du har ikke tilgang til å endre felles score";

export const FELLES_OUT_OF_RANGE_MESSAGE =
  "Felles score må være et heltall mellom 0 og 10";

export const NOT_ENOUGH_DATA_MESSAGE = "Ikke nok data";

export const THRESHOLD_OUT_OF_RANGE_MESSAGE =
  "Uenighetsgrense må være et heltall mellom 1 og 10";

export const THRESHOLD_DENIED_MESSAGE =
  "Bare eieren kan endre uenighetsgrensen";

/**
 * Format the missing-felles warning. Used by the totalscore panel.
 *  example: "⚠ 3 kriterier mangler score — regnes som 0 i totalen"
 */
export function formatMissingFellesWarning(missing: number): string {
  return `⚠ ${missing} kriterier mangler score — regnes som 0 i totalen`;
}

/**
 * Format the disagreement threshold helper text on the Husstand page.
 *  example: "Rader hvor dere er uenige med 3 eller mer markeres."
 */
export function formatThresholdHelper(threshold: number): string {
  return `Rader hvor dere er uenige med ${threshold} eller mer markeres.`;
}

void ({} as ActionResult<unknown>);
