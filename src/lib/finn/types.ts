/**
 * Shared types for the FINN parser pipeline.
 *
 * `ParsedListing` is the structured-but-partial result of parsing a FINN
 * listing page. Every field is optional (null) — the parser is allowed
 * to surface a 30%-extracted listing instead of failing the whole call.
 *
 * `ParseResult` is the discriminated union the route handler returns to
 * the client. The success variant always carries the partial listing
 * with an `extracted_fields` array reflecting what was actually found.
 */

/** Fields the parser tries to populate from a FINN listing. */
export interface ParsedListing {
  address: string | null;
  price: number | null;
  /** Bruksareal (m²) — `floorSize` in JSON-LD or "BRA" label fallback. */
  bra: number | null;
  /** Primærrom (m²). */
  primary_rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  year_built: number | null;
  property_type: string | null;
  image_url: string | null;
  /** The original FINN URL — echoed back so the client doesn't re-derive. */
  finn_link: string;
  /**
   * Names of keys (excluding `finn_link` and `extracted_fields`) that the
   * parser successfully populated. Mirrors the spec's "Successful parse"
   * scenario.
   */
  extracted_fields: ParsedListingKey[];
}

export type ParsedListingKey =
  | "address"
  | "price"
  | "bra"
  | "primary_rooms"
  | "bedrooms"
  | "bathrooms"
  | "year_built"
  | "property_type"
  | "image_url";

/** Discriminated union returned by the route handler. */
export type ParseResult =
  | { ok: true; data: ParsedListing }
  | { ok: false; error: string };

/** Result of `validateFinnUrl` — a tiny pre-fetch validator. */
export type FinnUrlValidation =
  | { ok: true; url: URL }
  | { ok: false; error: string };

/** User-facing Norwegian error messages used by the route handler. */
export const FINN_ERROR_MESSAGES = {
  /** Invalid / non-FINN host — surfaces as 400. */
  notFinnUrl: "URL må være en FINN-annonse",
  /** Malformed URL string. */
  malformedUrl: "Ugyldig URL",
  /** Empty body / no URL field. */
  missingUrl: "URL mangler",
  /** Auth missing — surfaces as 401. */
  unauthenticated: "Du må være logget inn",
  /** Upstream timeout. */
  fetchTimeout:
    "FINN svarer ikke — prøv igjen senere eller fyll inn manuelt",
  /** Upstream non-2xx (4xx, 5xx). */
  fetchFailed:
    "Kunne ikke hente fra FINN — prøv igjen senere eller fyll inn manuelt",
  /** Body exceeded 200 KB cap. */
  responseTooLarge:
    "FINN-siden er for stor — prøv en annen lenke eller fyll inn manuelt",
  /** Generic fallback. */
  unexpected:
    "Uventet feil ved henting fra FINN — fyll inn manuelt",
} as const;

export type FinnErrorMessage =
  (typeof FINN_ERROR_MESSAGES)[keyof typeof FINN_ERROR_MESSAGES];
