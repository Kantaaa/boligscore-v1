import type { HouseholdRole } from "./types";
import { HOUSEHOLD_ROLES } from "./types";

/**
 * Pure helpers around `HouseholdRole`. Tested as unit tests — no DB.
 */

export function isHouseholdRole(value: unknown): value is HouseholdRole {
  return (
    typeof value === "string" &&
    (HOUSEHOLD_ROLES as readonly string[]).includes(value)
  );
}

/** Owner and member can write; viewer cannot. Mirrors the RLS rule. */
export function canWrite(role: HouseholdRole): boolean {
  return role === "owner" || role === "member";
}

/** Only owners can manage members, rename, delete, change roles. */
export function canManage(role: HouseholdRole): boolean {
  return role === "owner";
}

/** Anyone (owner, member, viewer) can read. */
export function canRead(_role: HouseholdRole): boolean {
  return true;
}

/**
 * Norwegian-bokmål label for a role badge. UI strings live here so the
 * badge component can render `${icon} ${label}` from a role value.
 */
export function roleLabel(role: HouseholdRole): string {
  switch (role) {
    case "owner":
      return "Eier";
    case "member":
      return "Medlem";
    case "viewer":
      return "Observatør";
  }
}

/** Status icon for a role badge. Icon + text + color (a11y). */
export function roleIcon(role: HouseholdRole): string {
  switch (role) {
    case "owner":
      return "★";
    case "member":
      return "●";
    case "viewer":
      return "👁";
  }
}

export interface SoleOwnerCheckInput {
  /** All members of the household. */
  members: Array<{ user_id: string; role: HouseholdRole }>;
  /** The user the action is being performed on (e.g. the leaver). */
  userId: string;
}

/**
 * Returns true when `userId` is the only `owner` in the membership list.
 * Used by `leaveHousehold` and `setMemberRole` to block the last-owner
 * footgun (design D2) before sending the request to the DB.
 */
export function isSoleOwner({ members, userId }: SoleOwnerCheckInput): boolean {
  const owners = members.filter((m) => m.role === "owner");
  return owners.length === 1 && owners[0].user_id === userId;
}

/** Trim+nonempty validator for a household name. Norwegian error string. */
export function validateHouseholdName(input: unknown): {
  ok: true;
  value: string;
} | {
  ok: false;
  error: string;
} {
  if (typeof input !== "string") {
    return { ok: false, error: "Navn er påkrevd" };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Navn er påkrevd" };
  }
  if (trimmed.length > 80) {
    return { ok: false, error: "Navnet er for langt (maks 80 tegn)" };
  }
  return { ok: true, value: trimmed };
}

/** True when the invitation expires_at is strictly in the past. */
export function isInvitationExpired(
  expiresAt: string | Date,
  now: Date = new Date(),
): boolean {
  const expires =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return expires.getTime() <= now.getTime();
}

/** True when the invitation has already been accepted. */
export function isInvitationAccepted(
  accepted_by: string | null | undefined,
): boolean {
  return typeof accepted_by === "string" && accepted_by.length > 0;
}
