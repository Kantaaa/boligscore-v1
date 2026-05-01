import { describe, expect, it } from "vitest";

import {
  chipPickerDefault,
  computeFellesTotal,
  computeUserTotal,
  countMissingFelles,
  isDisagreement,
  isValidFellesScore,
  isValidThreshold,
  snitt,
  validateFellesScore,
  validateThreshold,
} from "./math";
import type { ComparisonRow } from "./types";

// -- helpers ------------------------------------------------------------------

function fellesRow(
  felles: number | null,
  weight: number,
): { felles_score: number | null; weight: number } {
  return { felles_score: felles, weight };
}

function userRow(
  score: number | null,
  weight: number,
): { score: number | null; weight: number } {
  return { score, weight };
}

function comparisonRow(
  overrides: Partial<ComparisonRow> = {},
): ComparisonRow {
  return {
    criterion_id: "c-1",
    criterion_key: "k",
    criterion_label: "Kjøkken",
    criterion_sort_order: 10,
    section_id: "s-1",
    section_key: "bolig_innvendig",
    section_label: "Bolig innvendig",
    section_sort_order: 1,
    your_score: null,
    partner_score: null,
    partner_user_id: null,
    snitt: null,
    felles_score: null,
    felles_set: false,
    ...overrides,
  };
}

// -- isValidFellesScore -------------------------------------------------------

describe("isValidFellesScore", () => {
  it("accepts integers 0..10", () => {
    for (let i = 0; i <= 10; i++) {
      expect(isValidFellesScore(i)).toBe(true);
    }
  });

  it("rejects -1 and 11", () => {
    expect(isValidFellesScore(-1)).toBe(false);
    expect(isValidFellesScore(11)).toBe(false);
  });

  it("rejects non-integers and non-numbers", () => {
    expect(isValidFellesScore(5.5)).toBe(false);
    expect(isValidFellesScore("5")).toBe(false);
    expect(isValidFellesScore(null)).toBe(false);
    expect(isValidFellesScore(undefined)).toBe(false);
    expect(isValidFellesScore(NaN)).toBe(false);
  });
});

describe("validateFellesScore", () => {
  it("accepts numeric strings", () => {
    expect(validateFellesScore("7")).toEqual({ ok: true, value: 7 });
  });

  it("rejects empty inputs", () => {
    expect(validateFellesScore(undefined)).toMatchObject({ ok: false });
    expect(validateFellesScore("")).toMatchObject({ ok: false });
  });
});

// -- isValidThreshold ---------------------------------------------------------

describe("isValidThreshold", () => {
  it("accepts integers 1..10", () => {
    for (let i = 1; i <= 10; i++) {
      expect(isValidThreshold(i)).toBe(true);
    }
  });

  it("rejects 0 and 11", () => {
    expect(isValidThreshold(0)).toBe(false);
    expect(isValidThreshold(11)).toBe(false);
  });
});

describe("validateThreshold", () => {
  it("accepts numeric strings", () => {
    expect(validateThreshold("3")).toEqual({ ok: true, value: 3 });
  });

  it("rejects 0", () => {
    expect(validateThreshold(0)).toMatchObject({ ok: false });
  });
});

// -- isDisagreement -----------------------------------------------------------

describe("isDisagreement", () => {
  it("flags |a-b| >= threshold", () => {
    expect(isDisagreement(8, 5, 3)).toBe(true);
    expect(isDisagreement(5, 8, 3)).toBe(true);
  });

  it("does not flag |a-b| < threshold", () => {
    expect(isDisagreement(8, 6, 3)).toBe(false);
    expect(isDisagreement(7, 7, 3)).toBe(false);
  });

  it("flags exact threshold (boundary)", () => {
    expect(isDisagreement(7, 4, 3)).toBe(true);
    expect(isDisagreement(2, 5, 3)).toBe(true);
  });

  it("returns false when either value is null", () => {
    expect(isDisagreement(null, 5, 3)).toBe(false);
    expect(isDisagreement(8, null, 3)).toBe(false);
    expect(isDisagreement(null, null, 3)).toBe(false);
  });

  it("respects custom threshold (1..10)", () => {
    expect(isDisagreement(5, 4, 1)).toBe(true);
    expect(isDisagreement(10, 0, 10)).toBe(true);
  });
});

// -- computeFellesTotal -------------------------------------------------------

describe("computeFellesTotal", () => {
  it("returns null on empty input", () => {
    expect(computeFellesTotal([])).toBeNull();
  });

  it("returns null when all weights are 0", () => {
    expect(
      computeFellesTotal([fellesRow(8, 0), fellesRow(7, 0), fellesRow(9, 0)]),
    ).toBeNull();
  });

  it("returns null when weights are all-zero (D7 — Ikke nok data)", () => {
    const rows = Array.from({ length: 22 }, () => fellesRow(5, 0));
    expect(computeFellesTotal(rows)).toBeNull();
  });

  it("computes a clean weighted-average × 10 when fully scored", () => {
    // Felles=8 across 3 criteria, equal weights → 8 × 10 = 80.
    const rows = [fellesRow(8, 5), fellesRow(8, 5), fellesRow(8, 5)];
    expect(computeFellesTotal(rows)).toBe(80);
  });

  it("computes a varied weighted average correctly", () => {
    // (10*5 + 5*5 + 0*5) / 15 = 5 → 50.
    expect(
      computeFellesTotal([fellesRow(10, 5), fellesRow(5, 5), fellesRow(0, 5)]),
    ).toBe(50);
  });

  it("punishes missing felles by leaving the weight in the denominator", () => {
    // 3 criteria, all weight=5; only 2 felles set (both 10).
    // num = 10*5 + 10*5 = 100; den = 5+5+5 = 15; (100/15)*10 = 66.67 → 67.
    expect(
      computeFellesTotal([
        fellesRow(10, 5),
        fellesRow(10, 5),
        fellesRow(null, 5),
      ]),
    ).toBe(67);
  });

  it("returns 0 when every felles is 0 (numerator = 0)", () => {
    expect(
      computeFellesTotal([fellesRow(0, 5), fellesRow(0, 5), fellesRow(0, 5)]),
    ).toBe(0);
  });

  it("rounds half-to-even-or-up consistently with Math.round", () => {
    // num = 5*5 + 5*5 + 4*5 = 70; den = 15; (70/15)*10 = 46.666... → 47.
    expect(
      computeFellesTotal([fellesRow(5, 5), fellesRow(5, 5), fellesRow(4, 5)]),
    ).toBe(47);
  });

  it("handles 0-weight skipping where set", () => {
    // When weights are mixed: w=10 with felles=8, w=0 with felles=2.
    // num = 80; den = 10; → 80.
    expect(
      computeFellesTotal([fellesRow(8, 10), fellesRow(2, 0)]),
    ).toBe(80);
  });
});

// -- computeUserTotal ---------------------------------------------------------

describe("computeUserTotal", () => {
  it("returns null on empty input", () => {
    expect(computeUserTotal([])).toBeNull();
  });

  it("returns null when user has scored nothing", () => {
    expect(
      computeUserTotal([userRow(null, 5), userRow(null, 5)]),
    ).toBeNull();
  });

  it("returns null when scored criteria all have weight 0", () => {
    expect(
      computeUserTotal([userRow(8, 0), userRow(7, 0)]),
    ).toBeNull();
  });

  it("uses ONLY scored criteria (excludes unscored from denominator)", () => {
    // 3 criteria; user scored 2 of them (both 8 with weight 5).
    // Unscored row should NOT enlarge the denominator:
    //   num = 8*5 + 8*5 = 80; den = 10 → (80/10)*10 = 80.
    // Compare to felles where unscored expands den.
    expect(
      computeUserTotal([userRow(8, 5), userRow(8, 5), userRow(null, 5)]),
    ).toBe(80);
  });

  it("computes weighted average correctly with varying weights", () => {
    // (8*3 + 6*7) = 24+42 = 66; den = 10; → 66.
    expect(
      computeUserTotal([userRow(8, 3), userRow(6, 7)]),
    ).toBe(66);
  });

  it("returns integer in 0..100 range", () => {
    const result = computeUserTotal([userRow(10, 5), userRow(10, 5)]);
    expect(result).toBe(100);
  });
});

// -- countMissingFelles -------------------------------------------------------

describe("countMissingFelles", () => {
  it("returns 0 when all set", () => {
    expect(
      countMissingFelles([
        comparisonRow({ felles_set: true }),
        comparisonRow({ felles_set: true }),
      ]),
    ).toBe(0);
  });

  it("counts only unset rows", () => {
    expect(
      countMissingFelles([
        comparisonRow({ felles_set: false }),
        comparisonRow({ felles_set: true }),
        comparisonRow({ felles_set: false }),
        comparisonRow({ felles_set: false }),
      ]),
    ).toBe(3);
  });

  it("returns 0 on empty input", () => {
    expect(countMissingFelles([])).toBe(0);
  });
});

// -- snitt --------------------------------------------------------------------

describe("snitt", () => {
  it("rounds (a+b)/2", () => {
    expect(snitt(8, 6)).toBe(7);
    expect(snitt(8, 7)).toBe(8); // Math.round(7.5) → 8
    expect(snitt(7, 4)).toBe(6); // Math.round(5.5) → 6
  });

  it("returns null when either is null", () => {
    expect(snitt(null, 5)).toBeNull();
    expect(snitt(5, null)).toBeNull();
    expect(snitt(null, null)).toBeNull();
  });

  it("handles 0/0 → 0 not null", () => {
    expect(snitt(0, 0)).toBe(0);
  });
});

// -- chipPickerDefault --------------------------------------------------------

describe("chipPickerDefault", () => {
  it("prefers existing felles_score", () => {
    expect(
      chipPickerDefault(
        comparisonRow({
          felles_score: 9,
          your_score: 7,
          partner_score: 5,
          snitt: 6,
        }),
      ),
    ).toBe(9);
  });

  it("falls back to snitt when no felles", () => {
    expect(
      chipPickerDefault(
        comparisonRow({
          felles_score: null,
          your_score: 7,
          partner_score: 5,
          snitt: 6,
        }),
      ),
    ).toBe(6);
  });

  it("falls back to your_score when no partner", () => {
    expect(
      chipPickerDefault(
        comparisonRow({
          felles_score: null,
          your_score: 8,
          partner_score: null,
          snitt: null,
        }),
      ),
    ).toBe(8);
  });

  it("returns null when nothing is scored", () => {
    expect(chipPickerDefault(comparisonRow({}))).toBeNull();
  });
});
