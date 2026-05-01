import { describe, expect, it } from "vitest";

import {
  findMissingCriteriaIds,
  isValidWeight,
  sumWeights,
  validateWeight,
  weightSetIsAllZero,
} from "./validation";

describe("isValidWeight", () => {
  it("accepts integers 0..10", () => {
    for (let i = 0; i <= 10; i++) {
      expect(isValidWeight(i)).toBe(true);
    }
  });

  it("rejects -1 and 11", () => {
    expect(isValidWeight(-1)).toBe(false);
    expect(isValidWeight(11)).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(isValidWeight(5.5)).toBe(false);
    expect(isValidWeight(0.1)).toBe(false);
  });

  it("rejects non-numbers", () => {
    expect(isValidWeight("5")).toBe(false);
    expect(isValidWeight(null)).toBe(false);
    expect(isValidWeight(undefined)).toBe(false);
    expect(isValidWeight(NaN)).toBe(false);
    expect(isValidWeight(Infinity)).toBe(false);
  });
});

describe("validateWeight", () => {
  it("accepts valid integers", () => {
    expect(validateWeight(5)).toEqual({ ok: true, value: 5 });
    expect(validateWeight(0)).toEqual({ ok: true, value: 0 });
    expect(validateWeight(10)).toEqual({ ok: true, value: 10 });
  });

  it("accepts numeric strings", () => {
    expect(validateWeight("7")).toEqual({ ok: true, value: 7 });
  });

  it("rejects out-of-range and non-integers", () => {
    expect(validateWeight(11)).toMatchObject({ ok: false });
    expect(validateWeight(-1)).toMatchObject({ ok: false });
    expect(validateWeight(5.5)).toMatchObject({ ok: false });
  });

  it("rejects empty / nullish inputs", () => {
    expect(validateWeight(undefined)).toMatchObject({ ok: false });
    expect(validateWeight(null)).toMatchObject({ ok: false });
    expect(validateWeight("")).toMatchObject({ ok: false });
    expect(validateWeight("  ")).toMatchObject({ ok: false });
  });
});

describe("weightSetIsAllZero", () => {
  it("treats empty as all-zero", () => {
    expect(weightSetIsAllZero([])).toBe(true);
  });

  it("returns true for all zeros", () => {
    expect(
      weightSetIsAllZero([{ weight: 0 }, { weight: 0 }, { weight: 0 }]),
    ).toBe(true);
  });

  it("returns false when at least one is non-zero", () => {
    expect(
      weightSetIsAllZero([{ weight: 0 }, { weight: 1 }, { weight: 0 }]),
    ).toBe(false);
  });

  it("returns false for the default (all 5s)", () => {
    const rows = Array.from({ length: 22 }, () => ({ weight: 5 }));
    expect(weightSetIsAllZero(rows)).toBe(false);
  });
});

describe("sumWeights", () => {
  it("returns 0 for empty input", () => {
    expect(sumWeights([])).toBe(0);
  });

  it("sums correctly", () => {
    expect(sumWeights([{ weight: 1 }, { weight: 2 }, { weight: 3 }])).toBe(6);
  });

  it("returns 0 when everything is zero", () => {
    expect(sumWeights([{ weight: 0 }, { weight: 0 }])).toBe(0);
  });
});

describe("findMissingCriteriaIds", () => {
  it("returns empty when complete", () => {
    const rows = [
      { household_id: "h", criterion_id: "a", weight: 5, updated_at: "" } as never,
      { household_id: "h", criterion_id: "b", weight: 5, updated_at: "" } as never,
    ];
    expect(findMissingCriteriaIds(rows, ["a", "b"])).toEqual([]);
  });

  it("returns the missing ids", () => {
    const rows = [
      { household_id: "h", criterion_id: "a", weight: 5, updated_at: "" } as never,
    ];
    expect(findMissingCriteriaIds(rows, ["a", "b", "c"])).toEqual(["b", "c"]);
  });

  it("handles all-missing", () => {
    expect(findMissingCriteriaIds([], ["a", "b"])).toEqual(["a", "b"]);
  });
});
