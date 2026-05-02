import { describe, expect, it } from "vitest";

import {
  canManage,
  canRead,
  canWrite,
  isHouseholdRole,
  isInvitationAccepted,
  isInvitationExpired,
  isSoleOwner,
  roleIcon,
  roleLabel,
  validateHouseholdName,
} from "./roles";

describe("isHouseholdRole", () => {
  it("accepts the three legal values", () => {
    expect(isHouseholdRole("owner")).toBe(true);
    expect(isHouseholdRole("member")).toBe(true);
    expect(isHouseholdRole("viewer")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isHouseholdRole("admin")).toBe(false);
    expect(isHouseholdRole("")).toBe(false);
    expect(isHouseholdRole(null)).toBe(false);
    expect(isHouseholdRole(undefined)).toBe(false);
    expect(isHouseholdRole(42)).toBe(false);
  });
});

describe("canWrite / canManage / canRead", () => {
  it("owner: read + write + manage", () => {
    expect(canRead("owner")).toBe(true);
    expect(canWrite("owner")).toBe(true);
    expect(canManage("owner")).toBe(true);
  });

  it("member: read + write, NOT manage", () => {
    expect(canRead("member")).toBe(true);
    expect(canWrite("member")).toBe(true);
    expect(canManage("member")).toBe(false);
  });

  it("viewer: read only — never write or manage", () => {
    expect(canRead("viewer")).toBe(true);
    expect(canWrite("viewer")).toBe(false);
    expect(canManage("viewer")).toBe(false);
  });
});

describe("roleLabel & roleIcon", () => {
  it("returns Norwegian labels", () => {
    expect(roleLabel("owner")).toBe("Eier");
    expect(roleLabel("member")).toBe("Medlem");
    expect(roleLabel("viewer")).toBe("Observatør");
  });

  it("returns a non-empty icon for every role", () => {
    expect(roleIcon("owner").length).toBeGreaterThan(0);
    expect(roleIcon("member").length).toBeGreaterThan(0);
    expect(roleIcon("viewer").length).toBeGreaterThan(0);
  });
});

describe("isSoleOwner", () => {
  it("true when the user is the only owner", () => {
    expect(
      isSoleOwner({
        members: [
          { user_id: "u1", role: "owner" },
          { user_id: "u2", role: "member" },
          { user_id: "u3", role: "viewer" },
        ],
        userId: "u1",
      }),
    ).toBe(true);
  });

  it("false when another owner exists", () => {
    expect(
      isSoleOwner({
        members: [
          { user_id: "u1", role: "owner" },
          { user_id: "u2", role: "owner" },
        ],
        userId: "u1",
      }),
    ).toBe(false);
  });

  it("false when the user is not the owner", () => {
    expect(
      isSoleOwner({
        members: [
          { user_id: "u1", role: "owner" },
          { user_id: "u2", role: "member" },
        ],
        userId: "u2",
      }),
    ).toBe(false);
  });

  it("false when the user is not even a member", () => {
    expect(
      isSoleOwner({
        members: [{ user_id: "u1", role: "owner" }],
        userId: "u9",
      }),
    ).toBe(false);
  });
});

describe("validateHouseholdName", () => {
  it("accepts a normal name", () => {
    expect(validateHouseholdName("Ine & Kanta")).toEqual({
      ok: true,
      value: "Ine & Kanta",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(validateHouseholdName("  Hjem  ")).toEqual({ ok: true, value: "Hjem" });
  });

  it("rejects empty string and whitespace-only", () => {
    expect(validateHouseholdName("")).toMatchObject({ ok: false });
    expect(validateHouseholdName("   ")).toMatchObject({ ok: false });
    expect(validateHouseholdName("\t\n")).toMatchObject({ ok: false });
  });

  it("rejects non-strings", () => {
    expect(validateHouseholdName(undefined)).toMatchObject({ ok: false });
    expect(validateHouseholdName(null)).toMatchObject({ ok: false });
    expect(validateHouseholdName(42)).toMatchObject({ ok: false });
  });

  it("rejects names longer than 80 chars", () => {
    expect(validateHouseholdName("x".repeat(81))).toMatchObject({ ok: false });
  });

  it("error string is in Norwegian", () => {
    const r = validateHouseholdName("");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("Navn er påkrevd");
    }
  });
});

describe("isInvitationExpired", () => {
  it("true when expires_at is in the past", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isInvitationExpired(past)).toBe(true);
  });

  it("false when expires_at is in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isInvitationExpired(future)).toBe(false);
  });

  it("treats exact equality as expired (boundary)", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    expect(isInvitationExpired(now.toISOString(), now)).toBe(true);
  });
});

describe("isInvitationAccepted", () => {
  it("true when accepted_by is a uuid string", () => {
    expect(isInvitationAccepted("00000000-0000-0000-0000-000000000001")).toBe(
      true,
    );
  });

  it("false when null or empty", () => {
    expect(isInvitationAccepted(null)).toBe(false);
    expect(isInvitationAccepted(undefined)).toBe(false);
    expect(isInvitationAccepted("")).toBe(false);
  });
});
