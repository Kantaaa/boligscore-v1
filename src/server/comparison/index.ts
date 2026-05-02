/**
 * Barrel export for comparison server actions.
 *
 * Note: this file does NOT have "use server". Each action file marks
 * itself with "use server"; the barrel preserves those markers via
 * named re-exports.
 */

export { setFellesScore } from "./setFellesScore";
export { clearFellesScore } from "./clearFellesScore";
export { getComparison } from "./getComparison";
export { setDisagreementThreshold } from "./setDisagreementThreshold";
