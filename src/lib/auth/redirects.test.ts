import { describe, expect, it } from "vitest";

import { safeNextParam } from "./redirects";

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

  it("rejects paths outside /app", () => {
    expect(safeNextParam("/")).toBeNull();
    expect(safeNextParam("/logg-inn")).toBeNull();
    expect(safeNextParam("/registrer")).toBeNull();
    expect(safeNextParam("/applepie")).toBeNull(); // /app- prefix attack
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
});
