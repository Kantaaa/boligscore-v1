/**
 * Barrel export for scoring server actions.
 *
 * Note: this file does NOT have "use server". Each action file marks
 * itself with "use server"; the barrel preserves those markers via
 * named re-exports.
 */

export { setScore } from "./setScore";
export { clearScore } from "./clearScore";
export { getMyScores } from "./getMyScores";
export { getMyNotes } from "./getMyNotes";
export { setNote } from "./setNote";
export { getPropertyWithScores } from "./getPropertyWithScores";
