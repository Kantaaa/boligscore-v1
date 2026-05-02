/**
 * Barrel export for properties server actions.
 *
 * Note: this file does NOT have "use server". Each action file marks
 * itself with "use server"; the barrel preserves those markers via
 * named re-exports.
 */

export { createProperty } from "./createProperty";
export { updateProperty } from "./updateProperty";
export { deleteProperty } from "./deleteProperty";
export { listProperties } from "./listProperties";
export { getProperty } from "./getProperty";
export type { GetPropertyResult } from "./getProperty";
export { listStatuses } from "./listStatuses";
export { createStatus } from "./createStatus";
export { setPropertyStatus } from "./setPropertyStatus";
export { setPropertyImagePath } from "./setPropertyImagePath";
export { clearPropertyImage } from "./clearPropertyImage";
