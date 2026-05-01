/**
 * Pure helpers for the read-only Fakta section on Min vurdering.
 *
 * D6, D10 (design.md): Fakta values are computed on the fly, never
 * stored. Missing inputs render as a literal em-dash.
 *
 * Locale: nb-NO (Norwegian bokmål) for thousand separators.
 */

const PLACEHOLDER = "—";

/**
 * Pris/kvm — formatted as `<thousand-separated> kr` or "—".
 *
 * Returns "—" when:
 *  - price is null or non-positive,
 *  - bra is null or non-positive (can't divide by zero / a missing
 *    surface area is meaningless).
 */
export function formatPrisPerKvm(
  price: number | null,
  bra: number | null,
): string {
  if (price == null || bra == null) return PLACEHOLDER;
  if (!Number.isFinite(price) || !Number.isFinite(bra)) return PLACEHOLDER;
  if (price <= 0 || bra <= 0) return PLACEHOLDER;
  const value = Math.round(price / bra);
  return `${formatNumberNo(value)} kr`;
}

/**
 * Størrelse — formatted as `<bra> m²` or "—". `bra` is the BRA
 * (bruksareal) field on the property.
 */
export function formatStorrelse(bra: number | null): string {
  if (bra == null || !Number.isFinite(bra) || bra <= 0) return PLACEHOLDER;
  // Bra may be fractional (70.5 m²); strip trailing zeros.
  const formatted = Number.isInteger(bra)
    ? formatNumberNo(bra)
    : formatNumberNo(Number(bra.toFixed(1)));
  return `${formatted} m²`;
}

/**
 * Alder — number of full years between `year_built` and `currentYear`.
 *
 * Returns "—" when:
 *  - year_built is null,
 *  - year_built is in the future by more than 5 years (data error
 *    guard — a brand-new build can be `currentYear + 1` for off-plan,
 *    but `+ 6` is suspicious),
 *  - the diff is negative beyond the +5 cushion.
 *
 * `0 år` is a legitimate answer for new builds.
 */
export function formatAlder(
  yearBuilt: number | null,
  currentYear: number = new Date().getFullYear(),
): string {
  if (yearBuilt == null || !Number.isFinite(yearBuilt)) return PLACEHOLDER;
  if (yearBuilt > currentYear + 5) return PLACEHOLDER;
  const diff = currentYear - yearBuilt;
  if (diff < 0) return "0 år"; // off-plan; treat near-future as 0.
  return `${diff} år`;
}

function formatNumberNo(n: number): string {
  // nb-NO uses non-breaking space as thousand separator (U+00A0).
  // Intl.NumberFormat returns it on most runtimes; fall back to a
  // manual implementation if the runtime lacks Intl support.
  try {
    return new Intl.NumberFormat("nb-NO").format(n);
  } catch {
    const sign = n < 0 ? "-" : "";
    const abs = Math.abs(Math.trunc(n));
    return sign + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  }
}
