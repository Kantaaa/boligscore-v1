import { describe, expect, it } from "vitest";

import { FINN_ERROR_MESSAGES } from "./types";
import { validateFinnUrl } from "./validateFinnUrl";

/**
 * Spec mapping (openspec/changes/properties-finn-import/specs/properties-finn-import/spec.md):
 *   - "URL allowlist" — non-FINN host rejected, malformed URL rejected,
 *     both `finn.no` and `www.finn.no` accepted.
 *
 * Decision matrix this exercise covers:
 *   ┌──────────────────────┬─────────┐
 *   │ input                 │ result  │
 *   ├──────────────────────┼─────────┤
 *   │ valid www.finn.no    │ ok      │
 *   │ valid finn.no        │ ok      │
 *   │ subdomain.finn.no    │ reject  │
 *   │ http (not https)     │ reject  │
 *   │ other host           │ reject  │
 *   │ malformed string     │ reject  │
 *   │ empty / whitespace   │ reject  │
 *   │ non-string           │ reject  │
 *   └──────────────────────┴─────────┘
 */

describe("validateFinnUrl", () => {
  it("accepts a real FINN listing URL on www.finn.no", () => {
    const r = validateFinnUrl(
      "https://www.finn.no/realestate/homes/ad.html?finnkode=123456789",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url.hostname).toBe("www.finn.no");
  });

  it("accepts the bare finn.no apex domain", () => {
    const r = validateFinnUrl("https://finn.no/realestate/homes/ad.html");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url.hostname).toBe("finn.no");
  });

  it("rejects subdomains other than www", () => {
    const r = validateFinnUrl("https://m.finn.no/realestate/homes/ad.html");
    expect(r).toEqual({ ok: false, error: FINN_ERROR_MESSAGES.notFinnUrl });
  });

  it("rejects http:// (only https is allowed)", () => {
    const r = validateFinnUrl("http://www.finn.no/realestate/homes/ad.html");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(FINN_ERROR_MESSAGES.notFinnUrl);
  });

  it("rejects unrelated hosts with the same path", () => {
    const r = validateFinnUrl(
      "https://example.com/realestate/homes/ad.html?finnkode=123",
    );
    expect(r).toEqual({ ok: false, error: FINN_ERROR_MESSAGES.notFinnUrl });
  });

  it("rejects look-alike domains (typosquatting / suffix tricks)", () => {
    expect(validateFinnUrl("https://finn.no.example.com/abc")).toMatchObject({
      ok: false,
    });
    expect(validateFinnUrl("https://finn-no.com/abc")).toMatchObject({
      ok: false,
    });
  });

  it("rejects malformed URLs", () => {
    expect(validateFinnUrl("not a url")).toMatchObject({ ok: false });
    expect(validateFinnUrl("htt p:/broken")).toMatchObject({ ok: false });
    expect(validateFinnUrl("javascript:alert(1)")).toMatchObject({
      ok: false,
    });
  });

  it("rejects empty / whitespace input", () => {
    expect(validateFinnUrl("")).toMatchObject({ ok: false });
    expect(validateFinnUrl("   ")).toMatchObject({ ok: false });
    expect(validateFinnUrl("\t\n")).toMatchObject({ ok: false });
  });

  it("rejects non-string input", () => {
    expect(validateFinnUrl(undefined)).toMatchObject({ ok: false });
    expect(validateFinnUrl(null)).toMatchObject({ ok: false });
    expect(validateFinnUrl(42)).toMatchObject({ ok: false });
    expect(validateFinnUrl({ url: "https://finn.no" })).toMatchObject({
      ok: false,
    });
  });

  it("trims surrounding whitespace before parsing", () => {
    const r = validateFinnUrl(
      "  https://www.finn.no/realestate/homes/ad.html  ",
    );
    expect(r.ok).toBe(true);
  });
});
