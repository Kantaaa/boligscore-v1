import { describe, expect, it } from "vitest";

import { resolveNextOrDefault, safeNextParam } from "./redirects";

describe("safeNextParam", () => {
  it("accepts /app", () => {
    expect(safeNextParam("/app")).toBe("/app");
  });

  it("accepts a deep /app/* path", () => {
    expect(safeNextParam("/app/vekter")).toBe("/app/vekter");
    expect(safeNextParam("/app/bolig/123/oversikt")).toBe(
      "/app/bolig/123/oversikt",
    );
  });

  it("preserves query strings on /app paths", () => {
    expect(safeNextParam("/app/vekter?tab=primary")).toBe(
      "/app/vekter?tab=primary",
    );
  });

  it("rejects a missing or empty value", () => {
    expect(safeNextParam(null)).toBeNull();
    expect(safeNextParam(undefined)).toBeNull();
    expect(safeNextParam("")).toBeNull();
  });

  it("rejects paths outside /app and /invitasjon", () => {
    expect(safeNextParam("/")).toBeNull();
    expect(safeNextParam("/logg-inn")).toBeNull();
    expect(safeNextParam("/registrer")).toBeNull();
    expect(safeNextParam("/applepie")).toBeNull(); // /app- prefix attack
  });

  it("accepts /invitasjon/<token> for the households flow", () => {
    expect(safeNextParam("/invitasjon/abc-def")).toBe("/invitasjon/abc-def");
    // Bare /invitasjon (no token) is rejected — the flow always carries a token.
    expect(safeNextParam("/invitasjon")).toBeNull();
  });

  it("rejects external and protocol-relative URLs (open-redirect guard)", () => {
    expect(safeNextParam("//evil.example/app")).toBeNull();
    expect(safeNextParam("http://evil.example/app")).toBeNull();
    expect(safeNextParam("https://evil.example/app")).toBeNull();
    expect(safeNextParam("javascript:alert(1)")).toBeNull();
  });

  it("rejects relative paths", () => {
    expect(safeNextParam("app/vekter")).toBeNull();
    expect(safeNextParam("./app/vekter")).toBeNull();
  });

  it("rejects non-string inputs (defensive)", () => {
    // @ts-expect-error — intentionally pass a non-string at runtime.
    expect(safeNextParam(123)).toBeNull();
    // @ts-expect-error — intentionally pass an object.
    expect(safeNextParam({})).toBeNull();
  });
});

describe("resolveNextOrDefault", () => {
  it("returns the safe value when present", () => {
    expect(resolveNextOrDefault("/app/vekter")).toBe("/app/vekter");
    expect(resolveNextOrDefault("/invitasjon/abc")).toBe("/invitasjon/abc");
  });

  it("returns the default fallback when the value is unsafe", () => {
    expect(resolveNextOrDefault("https://evil.com/app")).toBe("/app");
    expect(resolveNextOrDefault("//evil.com/app")).toBe("/app");
    expect(resolveNextOrDefault("javascript:alert(1)")).toBe("/app");
  });

  it("returns the default fallback when the value is missing", () => {
    expect(resolveNextOrDefault(undefined)).toBe("/app");
    expect(resolveNextOrDefault(null)).toBe("/app");
    expect(resolveNextOrDefault("")).toBe("/app");
  });

  it("supports a custom fallback (e.g. /app/onboarding for register)", () => {
    expect(resolveNextOrDefault(undefined, "/app/onboarding")).toBe(
      "/app/onboarding",
    );
    expect(resolveNextOrDefault("/app/vekter", "/app/onboarding")).toBe(
      "/app/vekter",
    );
    expect(resolveNextOrDefault("https://evil.com", "/app/onboarding")).toBe(
      "/app/onboarding",
    );
  });
});
