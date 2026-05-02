import { describe, expect, it } from "vitest";

import {
  isValidYearBuilt,
  parseOptionalInt,
  parseOptionalNumber,
  parseOptionalString,
  pricePerKvm,
  validateAddress,
} from "./validation";

describe("validateAddress", () => {
  it("accepts a normal address", () => {
    expect(validateAddress("Storgata 1, 0182 Oslo")).toEqual({
      ok: true,
      value: "Storgata 1, 0182 Oslo",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(validateAddress("  Storgata 1  ")).toEqual({
      ok: true,
      value: "Storgata 1",
    });
  });

  it("rejects empty string and whitespace-only", () => {
    expect(validateAddress("")).toMatchObject({ ok: false });
    expect(validateAddress("   ")).toMatchObject({ ok: false });
    expect(validateAddress("\t\n")).toMatchObject({ ok: false });
  });

  it("rejects non-strings", () => {
    expect(validateAddress(undefined)).toMatchObject({ ok: false });
    expect(validateAddress(null)).toMatchObject({ ok: false });
    expect(validateAddress(42)).toMatchObject({ ok: false });
  });

  it("rejects addresses longer than 500 chars", () => {
    expect(validateAddress("x".repeat(501))).toMatchObject({ ok: false });
  });

  it("returns Norwegian error for empty input", () => {
    const r = validateAddress("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Adresse er påkrevd");
  });
});

describe("isValidYearBuilt", () => {
  // Mock the clock by passing a fixed Date.
  const FIXED = new Date("2026-04-30T00:00:00Z");

  it("accepts null/undefined (optional)", () => {
    expect(isValidYearBuilt(null, FIXED)).toBe(true);
    expect(isValidYearBuilt(undefined, FIXED)).toBe(true);
  });

  it("accepts the lower bound 1800", () => {
    expect(isValidYearBuilt(1800, FIXED)).toBe(true);
  });

  it("rejects 1799", () => {
    expect(isValidYearBuilt(1799, FIXED)).toBe(false);
  });

  it("accepts current_year + 5 (under-construction listings)", () => {
    expect(isValidYearBuilt(2031, FIXED)).toBe(true);
  });

  it("rejects current_year + 6", () => {
    expect(isValidYearBuilt(2032, FIXED)).toBe(false);
  });

  it("rejects non-integers", () => {
    expect(isValidYearBuilt(2020.5, FIXED)).toBe(false);
    expect(isValidYearBuilt("2020", FIXED)).toBe(false);
  });
});

describe("parseOptionalInt", () => {
  it("handles null/undefined/empty", () => {
    expect(parseOptionalInt(null)).toBeNull();
    expect(parseOptionalInt(undefined)).toBeNull();
    expect(parseOptionalInt("")).toBeNull();
    expect(parseOptionalInt("   ")).toBeNull();
  });

  it("parses string integers", () => {
    expect(parseOptionalInt("42")).toBe(42);
    expect(parseOptionalInt("  42  ")).toBe(42);
  });

  it("truncates floats to integers", () => {
    expect(parseOptionalInt("42.7")).toBe(42);
    expect(parseOptionalInt(42.7)).toBe(42);
  });

  it("returns null on garbage", () => {
    expect(parseOptionalInt("abc")).toBeNull();
  });
});

describe("parseOptionalNumber", () => {
  it("handles comma decimals (Norwegian style)", () => {
    expect(parseOptionalNumber("70,5")).toBe(70.5);
    expect(parseOptionalNumber("70.5")).toBe(70.5);
  });

  it("handles null/empty", () => {
    expect(parseOptionalNumber("")).toBeNull();
    expect(parseOptionalNumber(null)).toBeNull();
  });
});

describe("parseOptionalString", () => {
  it("returns null for empty input", () => {
    expect(parseOptionalString("")).toBeNull();
    expect(parseOptionalString("   ")).toBeNull();
    expect(parseOptionalString(null)).toBeNull();
  });

  it("trims non-empty input", () => {
    expect(parseOptionalString("  Leilighet  ")).toBe("Leilighet");
  });
});

describe("pricePerKvm", () => {
  it("computes the integer price-per-square-meter", () => {
    expect(pricePerKvm(5_000_000, 70)).toBe(71_429);
  });

  it("returns null when price is missing", () => {
    expect(pricePerKvm(null, 70)).toBeNull();
    expect(pricePerKvm(undefined, 70)).toBeNull();
  });

  it("returns null when bra is missing or zero", () => {
    expect(pricePerKvm(5_000_000, null)).toBeNull();
    expect(pricePerKvm(5_000_000, 0)).toBeNull();
  });
});
