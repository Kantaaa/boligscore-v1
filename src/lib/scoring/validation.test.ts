import { describe, expect, it } from "vitest";

import { SCORE_OUT_OF_RANGE_MESSAGE } from "./types";
import { isValidScore, validateScore } from "./validation";

describe("isValidScore", () => {
  it("accepts integers 0 through 10", () => {
    for (let i = 0; i <= 10; i++) {
      expect(isValidScore(i)).toBe(true);
    }
  });

  it("rejects out-of-range integers", () => {
    expect(isValidScore(-1)).toBe(false);
    expect(isValidScore(11)).toBe(false);
    expect(isValidScore(100)).toBe(false);
  });

  it("rejects fractional numbers", () => {
    expect(isValidScore(5.5)).toBe(false);
    expect(isValidScore(0.1)).toBe(false);
  });

  it("rejects non-numbers", () => {
    expect(isValidScore("5")).toBe(false);
    expect(isValidScore(null)).toBe(false);
    expect(isValidScore(undefined)).toBe(false);
    expect(isValidScore(NaN)).toBe(false);
  });
});

describe("validateScore", () => {
  it("normalises numeric input", () => {
    const r = validateScore(7);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(7);
  });

  it("normalises numeric-string input", () => {
    const r = validateScore("8");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(8);
  });

  it("rejects out-of-range with the spec-locked Norwegian message", () => {
    const r = validateScore(11);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(SCORE_OUT_OF_RANGE_MESSAGE);
  });

  it("rejects empty string", () => {
    const r = validateScore("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(SCORE_OUT_OF_RANGE_MESSAGE);
  });

  it("rejects non-numeric input", () => {
    const r = validateScore({});
    expect(r.ok).toBe(false);
  });
});
