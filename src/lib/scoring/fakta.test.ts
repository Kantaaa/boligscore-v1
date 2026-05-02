import { describe, expect, it } from "vitest";

import { formatAlder, formatPrisPerKvm, formatStorrelse } from "./fakta";

/**
 * Unit tests for the read-only Fakta helpers (D6, D10).
 *
 * Spec mapping (openspec/changes/scoring/specs/scoring/spec.md —
 * "Fakta section presentation"):
 *   - All inputs available → formatted values.
 *   - Missing price → Pris/kvm = "—".
 *   - Missing bra → Pris/kvm and Størrelse = "—".
 *   - Missing year_built → Alder = "—".
 */

describe("formatPrisPerKvm", () => {
  it("computes price/bra and formats with nb-NO thousands", () => {
    // 5_000_000 / 70 = 71428.57… → rounds to 71429.
    const out = formatPrisPerKvm(5_000_000, 70);
    // Allow either NBSP (U+00A0) or narrow NBSP (U+202F) per Intl
    // version, and strip them for the assertion. Keep "kr" suffix.
    expect(out.endsWith(" kr")).toBe(true);
    expect(out.replace(/[\s\u00A0\u202F]/g, "")).toBe("71429kr");
  });

  it("returns em-dash when price is null", () => {
    expect(formatPrisPerKvm(null, 70)).toBe("—");
  });

  it("returns em-dash when bra is null", () => {
    expect(formatPrisPerKvm(5_000_000, null)).toBe("—");
  });

  it("returns em-dash when bra is 0", () => {
    expect(formatPrisPerKvm(5_000_000, 0)).toBe("—");
  });

  it("returns em-dash when price is 0 or negative", () => {
    expect(formatPrisPerKvm(0, 70)).toBe("—");
    expect(formatPrisPerKvm(-100, 70)).toBe("—");
  });

  it("rounds to nearest integer kroner", () => {
    // 5_000_001 / 70 = 71428.5857 → rounds to 71429.
    const out = formatPrisPerKvm(5_000_001, 70);
    expect(out.replace(/[\s\u00A0\u202F]/g, "")).toBe("71429kr");
  });
});

describe("formatStorrelse", () => {
  it("formats integer bra with m²", () => {
    expect(formatStorrelse(70)).toBe("70 m²");
  });

  it("formats fractional bra with one decimal", () => {
    expect(formatStorrelse(70.5)).toBe("70,5 m²");
  });

  it("returns em-dash when bra is null", () => {
    expect(formatStorrelse(null)).toBe("—");
  });

  it("returns em-dash when bra is 0", () => {
    expect(formatStorrelse(0)).toBe("—");
  });

  it("returns em-dash when bra is negative", () => {
    expect(formatStorrelse(-1)).toBe("—");
  });
});

describe("formatAlder", () => {
  it("computes age from year_built", () => {
    expect(formatAlder(2010, 2026)).toBe("16 år");
  });

  it("returns 0 år for current year", () => {
    expect(formatAlder(2026, 2026)).toBe("0 år");
  });

  it("returns 0 år for off-plan (next year)", () => {
    expect(formatAlder(2027, 2026)).toBe("0 år");
  });

  it("returns em-dash when year_built > currentYear + 5", () => {
    expect(formatAlder(2032, 2026)).toBe("—");
  });

  it("returns em-dash when year_built is null", () => {
    expect(formatAlder(null, 2026)).toBe("—");
  });

  it("uses current year by default", () => {
    const result = formatAlder(2000);
    expect(result.endsWith(" år")).toBe(true);
  });
});
