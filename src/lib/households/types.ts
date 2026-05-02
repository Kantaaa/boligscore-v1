/**
 * Shared TypeScript types for the households capability.
 *
 * Kept deliberately small and free of any Supabase-specific imports so
 * both server actions and client components can depend on them.
 */

export type HouseholdRole = "owner" | "member" | "viewer";

export const HOUSEHOLD_ROLES: readonly HouseholdRole[] = [
  "owner",
  "member",
  "viewer",
] as const;

export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  comparison_disagreement_threshold: number;
}

export interface HouseholdMembership {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
  last_accessed_at: string;
}

/** Row shape returned by `listMyHouseholds()` — joined household + membership. */
export interface HouseholdSummary {
  id: string;
  name: string;
  role: HouseholdRole;
  joined_at: string;
  last_accessed_at: string;
}

/** Row shape returned by `getHousehold()` — household + member list. */
export interface HouseholdWithMembers {
  household: Household;
  members: Array<{
    user_id: string;
    email: string | null;
    role: HouseholdRole;
    joined_at: string;
  }>;
}

export interface HouseholdInvitation {
  id: string;
  household_id: string;
  token: string;
  invited_email: string | null;
  role: HouseholdRole;
  expires_at: string;
  accepted_by: string | null;
  created_by: string;
  created_at: string;
}

/** Public shape of an invitation, returned via `get_invitation_by_token()`. */
export interface InvitationSummary {
  id: string;
  household_id: string;
  household_name: string;
  inviter_id: string;
  role: HouseholdRole;
  expires_at: string;
  accepted_by: string | null;
}

/** Discriminated result type used by every server action. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function err(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

// -----------------------------------------------------------------------------
// User-facing message constants used by both server actions and UI.
// Kept in this non-"use server" module so they can be `import`ed from
// client components without tripping the Next.js "use server" rule that
// only async functions may be exported from server-action files.
// -----------------------------------------------------------------------------

/** Spec-locked Norwegian message: viewing an invitation already accepted. */
export const ALREADY_ACCEPTED_MESSAGE = "Denne invitasjonen er allerede brukt";

/** Spec-locked Norwegian message: viewing an invitation past its expiry. */
export const EXPIRED_MESSAGE = "Denne lenken har utløpt. Be om en ny.";

/** Spec-locked Norwegian message: visiting an invite for an existing membership. */
export const ALREADY_MEMBER_MESSAGE =
  "Du er allerede medlem av denne husholdningen";

/** Spec-locked Norwegian message: sole owner attempting to leave. */
export const SOLE_OWNER_LEAVE_MESSAGE =
  "Du må først gjøre noen andre til eier før du kan forlate husholdningen";
