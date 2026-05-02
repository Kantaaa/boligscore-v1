import * as cheerio from "cheerio";

import type { ParsedListing, ParsedListingKey } from "./types";

/**
 * Parse a FINN listing HTML string into a partial `ParsedListing`.
 *
 * Strategy (D1, "JSON-LD-first"):
 *   1. Look for any `<script type="application/ld+json">` blocks. Walk
 *      every contained object (top-level, `@graph`-nested, arrays of
 *      objects) and pick the first whose `@type` matches our candidate
 *      list (Product, Place, Residence, RealEstateListing, …). FINN
 *      historically uses `Product` for ad pages.
 *   2. For fields the JSON-LD didn't fill in, fall back to CSS selectors
 *      on the rendered HTML. These selectors are brittle (FINN renames
 *      classes regularly) — every selector tries multiple strategies and
 *      gracefully returns null on a miss.
 *   3. NEVER throw. A parse error on one field must not abort the rest.
 *      `extracted_fields` reflects what we actually populated.
 *
 * The function is async to keep room for future extensions (e.g.
 * fetching nested resources). Today it is synchronous internally.
 */
export async function parseFinnHtml(
  html: string,
  finnLink: string,
): Promise<ParsedListing> {
  const $ = cheerio.load(html);
  const fromJsonLd = extractFromJsonLd($);
  const merged: Omit<ParsedListing, "extracted_fields" | "finn_link"> = {
    address: fromJsonLd.address ?? extractAddress($),
    price: fromJsonLd.price ?? extractPrice($),
    bra: fromJsonLd.bra ?? extractBra($),
    primary_rooms: fromJsonLd.primary_rooms ?? extractPrimaryRooms($),
    bedrooms: fromJsonLd.bedrooms ?? extractBedrooms($),
    bathrooms: fromJsonLd.bathrooms ?? extractBathrooms($),
    year_built: fromJsonLd.year_built ?? extractYearBuilt($),
    property_type: fromJsonLd.property_type ?? extractPropertyType($),
    image_url: fromJsonLd.image_url ?? extractImageUrl($),
  };

  const extracted_fields = (
    Object.keys(merged) as ParsedListingKey[]
  ).filter((k) => merged[k] !== null && merged[k] !== undefined);

  return {
    ...merged,
    finn_link: finnLink,
    extracted_fields,
  };
}

// ---------------------------------------------------------------------------
// JSON-LD extraction
// ---------------------------------------------------------------------------

/** `@type` values we treat as candidate listings. FINN uses `Product`. */
const CANDIDATE_TYPES = new Set<string>([
  "Product",
  "Place",
  "Residence",
  "RealEstateListing",
  "Apartment",
  "House",
  "SingleFamilyResidence",
  "Accommodation",
]);

/**
 * Walk every JSON-LD block, flatten `@graph` arrays, return the first
 * object whose `@type` matches a candidate. We also keep going even
 * when one block parses to nonsense — FINN sometimes ships multiple
 * blocks (Organization, BreadcrumbList, etc.).
 */
function extractFromJsonLd($: cheerio.CheerioAPI): Partial<
  Omit<ParsedListing, "extracted_fields" | "finn_link">
> {
  const result: Partial<Omit<ParsedListing, "extracted_fields" | "finn_link">> = {};

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Some sites embed multiple JSON objects in one script — ignore
      // and move on.
      return;
    }

    for (const node of flattenJsonLd(parsed)) {
      if (!isObject(node)) continue;
      const type = node["@type"];
      const types = Array.isArray(type) ? type : [type];
      const match = types.some(
        (t) => typeof t === "string" && CANDIDATE_TYPES.has(t),
      );
      if (!match) continue;

      mergeFromJsonLdNode(node, result);
    }
  });

  return result;
}

function* flattenJsonLd(input: unknown): Iterable<unknown> {
  if (input == null) return;
  if (Array.isArray(input)) {
    for (const item of input) yield* flattenJsonLd(item);
    return;
  }
  if (isObject(input)) {
    yield input;
    const graph = input["@graph"];
    if (Array.isArray(graph)) {
      for (const item of graph) yield* flattenJsonLd(item);
    }
  }
}

function mergeFromJsonLdNode(
  node: Record<string, unknown>,
  out: Partial<Omit<ParsedListing, "extracted_fields" | "finn_link">>,
): void {
  // address — `address.streetAddress` or top-level `name` (which on FINN
  // is often the address itself)
  if (out.address == null) {
    const addr = node["address"];
    if (isObject(addr)) {
      const street = pickString(addr, ["streetAddress"]);
      const postalCode = pickString(addr, ["postalCode"]);
      const locality = pickString(addr, [
        "addressLocality",
        "addressRegion",
      ]);
      const composed = [street, [postalCode, locality].filter(Boolean).join(" ")]
        .filter((s): s is string => Boolean(s && s.trim()))
        .join(", ");
      if (composed) out.address = composed;
    }
    if (out.address == null) {
      const name = pickString(node, ["name"]);
      if (name) out.address = name;
    }
  }

  // price — `offers.price`, `offers.priceSpecification.price`
  if (out.price == null) {
    const offers = node["offers"];
    const offerNodes = Array.isArray(offers)
      ? offers
      : isObject(offers)
        ? [offers]
        : [];
    for (const offer of offerNodes) {
      if (!isObject(offer)) continue;
      const direct = coerceNumber(offer["price"]);
      if (direct != null) {
        out.price = direct;
        break;
      }
      const spec = offer["priceSpecification"];
      if (isObject(spec)) {
        const specPrice = coerceNumber(spec["price"]);
        if (specPrice != null) {
          out.price = specPrice;
          break;
        }
      }
    }
  }

  // BRA / floorSize
  if (out.bra == null) {
    const floorSize = node["floorSize"];
    if (isObject(floorSize)) {
      const value = coerceNumber(floorSize["value"]);
      if (value != null) out.bra = value;
    } else {
      const direct = coerceNumber(floorSize);
      if (direct != null) out.bra = direct;
    }
  }

  // numberOfBedrooms — sometimes on Apartment/House nodes
  if (out.bedrooms == null) {
    const bedrooms = coerceInt(node["numberOfBedrooms"]);
    if (bedrooms != null) out.bedrooms = bedrooms;
  }
  if (out.bathrooms == null) {
    const baths = coerceNumber(node["numberOfBathroomsTotal"] ?? node["numberOfBathrooms"]);
    if (baths != null) out.bathrooms = baths;
  }
  if (out.primary_rooms == null) {
    const rooms = coerceNumber(node["numberOfRooms"]);
    if (rooms != null) out.primary_rooms = rooms;
  }

  // image — string or array of strings/objects
  if (out.image_url == null) {
    const image = node["image"];
    const candidate = pickImageUrl(image);
    if (candidate) out.image_url = candidate;
  }

  // year built — yearBuilt / dateCreated (fall back to 4-digit text)
  if (out.year_built == null) {
    const yb = coerceInt(node["yearBuilt"]);
    if (yb != null) out.year_built = yb;
  }

  // property_type — `category` or `@type` itself when the node is e.g.
  // `Apartment`. Keep the JSON-LD value verbatim so the manual form
  // surfaces what FINN classified it as.
  if (out.property_type == null) {
    const category = pickString(node, ["category"]);
    if (category) out.property_type = category;
  }
}

// ---------------------------------------------------------------------------
// CSS-selector fallbacks
// ---------------------------------------------------------------------------
//
// These selectors are intentionally conservative — they look for common
// label patterns ("BRA", "Byggeår", …) rather than depending on stable
// class names. They will degrade when FINN changes copy, but that's a
// less frequent event than CSS refactors.

function extractAddress($: cheerio.CheerioAPI): string | null {
  // FINN typically renders the address as the page H1. We accept any
  // first-level heading whose text contains a digit (a postal code or
  // street number) to filter out generic labels like "Bolig til salgs".
  const candidates = $("h1");
  for (const el of candidates.toArray()) {
    const text = $(el).text().trim();
    if (text.length > 5 && text.length < 200 && /\d/.test(text)) {
      return text;
    }
  }
  return null;
}

function extractPrice($: cheerio.CheerioAPI): number | null {
  // Try an explicit price label first.
  const labelled = findLabelledValue($, [
    "Prisantydning",
    "Totalpris",
    "Pris",
  ]);
  if (labelled) {
    const parsed = parseNorwegianInt(labelled);
    if (parsed != null) return parsed;
  }
  // Fall back to any element containing "kr" + digits.
  const krMatch = $("body")
    .text()
    .match(/(\d[\d\s\u00A0]{2,})\s*(?:kr|NOK|,-)/);
  if (krMatch) {
    const parsed = parseNorwegianInt(krMatch[1]!);
    if (parsed != null) return parsed;
  }
  return null;
}

function extractBra($: cheerio.CheerioAPI): number | null {
  const v = findLabelledValue($, [
    "Bruksareal",
    "BRA",
    "Bruksareal (BRA)",
    "Internt bruksareal",
  ]);
  if (!v) return null;
  return parseSquareMeters(v);
}

function extractPrimaryRooms($: cheerio.CheerioAPI): number | null {
  const v = findLabelledValue($, ["Primærrom", "P-rom"]);
  if (!v) return null;
  return parseSquareMeters(v);
}

function extractBedrooms($: cheerio.CheerioAPI): number | null {
  const v = findLabelledValue($, ["Soverom"]);
  if (!v) return null;
  const n = parseInt(v.replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function extractBathrooms($: cheerio.CheerioAPI): number | null {
  const v = findLabelledValue($, ["Bad", "Bad/wc"]);
  if (!v) return null;
  const n = Number(v.replace(/[^\d.,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function extractYearBuilt($: cheerio.CheerioAPI): number | null {
  const v = findLabelledValue($, ["Byggeår"]);
  if (!v) return null;
  const m = v.match(/(\d{4})/);
  if (!m) return null;
  const year = Number(m[1]);
  if (!Number.isFinite(year) || year < 1500 || year > 2100) return null;
  return year;
}

function extractPropertyType($: cheerio.CheerioAPI): string | null {
  const v = findLabelledValue($, ["Boligtype"]);
  return v ? v.trim() : null;
}

function extractImageUrl($: cheerio.CheerioAPI): string | null {
  // Prefer Open Graph — it's what FINN sets for share previews.
  const og = $('meta[property="og:image"]').attr("content");
  if (og && og.startsWith("https://")) return og;
  // First gallery image, fallback.
  const firstImg = $('img[src^="https://"]').first().attr("src");
  return firstImg ?? null;
}

/**
 * Find a `<dl>` label or a generic "label cell + value cell" pair where
 * the label text matches one of `labels` (case-insensitive). Returns
 * the trimmed value text, or null.
 */
function findLabelledValue(
  $: cheerio.CheerioAPI,
  labels: string[],
): string | null {
  const wanted = labels.map((l) => l.toLowerCase());

  // <dl><dt>label</dt><dd>value</dd></dl>
  const dts = $("dt");
  for (const el of dts.toArray()) {
    const text = $(el).text().trim().toLowerCase();
    if (wanted.includes(text)) {
      const dd = $(el).next("dd");
      if (dd.length) return dd.text().trim();
    }
  }

  // generic table-row pattern: <th>label</th><td>value</td>
  const ths = $("th");
  for (const el of ths.toArray()) {
    const text = $(el).text().trim().toLowerCase();
    if (wanted.includes(text)) {
      const td = $(el).next("td");
      if (td.length) return td.text().trim();
    }
  }

  // generic "label" + "value" sibling spans / divs.
  const allLabelled = $('[data-testid], [class*="label"], [class*="Label"]');
  for (const el of allLabelled.toArray()) {
    const text = $(el).text().trim().toLowerCase();
    if (!wanted.includes(text)) continue;
    const next = $(el).next();
    if (next.length) {
      const v = next.text().trim();
      if (v) return v;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Number coercion helpers
// ---------------------------------------------------------------------------

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function pickImageUrl(value: unknown): string | null {
  if (typeof value === "string" && value.startsWith("http")) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = pickImageUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (isObject(value)) {
    const direct = pickString(value, ["url", "contentUrl"]);
    if (direct) return direct;
  }
  return null;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.,-]/g, "").replace(/\s/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function coerceInt(value: unknown): number | null {
  const n = coerceNumber(value);
  return n == null ? null : Math.trunc(n);
}

/** Parse a Norwegian-formatted integer ("4 250 000", "4.250.000"). */
function parseNorwegianInt(input: string): number | null {
  const cleaned = input.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Parse a "70 m²" / "70,5 m²" string to a number. */
function parseSquareMeters(input: string): number | null {
  const m = input.match(/([\d.,\s\u00A0]+)/);
  if (!m) return null;
  const cleaned = m[1]!.replace(/\s|\u00A0/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
