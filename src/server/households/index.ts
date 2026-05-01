/**
 * Barrel export for household server actions.
 *
 * Note: this file does NOT have "use server" — Next.js server actions
 * must each export from a file marked `"use server"`. Re-exports keep
 * those markers; the barrel just re-shapes the import path.
 */

export { createHousehold } from "./createHousehold";
export { renameHousehold } from "./renameHousehold";
export { deleteHousehold } from "./deleteHousehold";
export { listMyHouseholds } from "./listMyHouseholds";
export { getHousehold } from "./getHousehold";
export { setMemberRole } from "./setMemberRole";
export { removeMember } from "./removeMember";
export { leaveHousehold } from "./leaveHousehold";
export { createInvitation } from "./createInvitation";
export { getInvitationByToken } from "./getInvitationByToken";
export { acceptInvitation } from "./acceptInvitation";
export { revokeInvitation } from "./revokeInvitation";
export { listInvitations } from "./listInvitations";
export { touchHousehold } from "./touchHousehold";

// Spec-locked message constants — re-export for convenience. The actual
// values live in @/lib/households/types so client components can import
// them without a "use server" file boundary issue.
export {
  ALREADY_ACCEPTED_MESSAGE,
  ALREADY_MEMBER_MESSAGE,
  EXPIRED_MESSAGE,
  SOLE_OWNER_LEAVE_MESSAGE,
} from "@/lib/households/types";
