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
