import { describe, expect, it } from "vitest";

import { validateEmail, validatePassword } from "./validation";

describe("validateEmail", () => {
  it("accepts well-formed addresses", () => {
    expect(validateEmail("alice@example.com").ok).toBe(true);
    expect(validateEmail("bob+filter@test.local").ok).toBe(true);
    expect(validateEmail("a@b.co").ok).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(validateEmail("  alice@example.com  ").ok).toBe(true);
  });

  it("rejects empty / whitespace-only input", () => {
    const r = validateEmail("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("e-post");
    expect(validateEmail("   ").ok).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(validateEmail("not-an-email").ok).toBe(false);
    expect(validateEmail("missing@tld").ok).toBe(false);
    expect(validateEmail("@no-local-part.com").ok).toBe(false);
    expect(validateEmail("two@@signs.com").ok).toBe(false);
  });
});

describe("validatePassword", () => {
  it("accepts passwords of 8+ characters", () => {
    expect(validatePassword("test1234").ok).toBe(true);
    expect(validatePassword("a-very-long-passphrase").ok).toBe(true);
  });

  it("rejects empty input", () => {
    const r = validatePassword("");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("passord");
  });

  it("rejects short passwords (< 8 chars)", () => {
    const r = validatePassword("short");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("8");
    expect(validatePassword("1234567").ok).toBe(false);
  });
});
