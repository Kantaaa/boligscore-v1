/**
 * Barrel export for auth server actions.
 *
 * Note: this file does NOT have "use server" — Next.js server actions
 * must each export from a file marked `"use server"`. Re-exports keep
 * those markers; the barrel just re-shapes the import path.
 */

export { registerWithPassword } from "./registerWithPassword";
export { loginWithPassword } from "./loginWithPassword";
export { requestMagicLink } from "./requestMagicLink";
export { signOut } from "./signOut";
