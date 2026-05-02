/**
 * Shared constants + path helpers for the properties-images capability.
 *
 * Kept free of Supabase imports so client components can use them
 * without dragging the SDK into shared modules.
 */

/** Private bucket name (D1). */
export const BUCKET_NAME = "property-images";

/** TTL applied to signed URLs at render time (D2). 1 hour. */
export const SIGNED_URL_TTL_SECONDS = 3600;

/** Cache-Control header set on uploaded objects (D11). 7 days in seconds. */
export const UPLOAD_CACHE_CONTROL_SECONDS = 604_800;

/**
 * Build the Storage object path for a property image.
 * Mirrors the pattern enforced by the storage RLS helper:
 *   households/{household_id}/properties/{property_id}/{uuid}.{ext}
 */
export function buildPropertyImagePath(input: {
  householdId: string;
  propertyId: string;
  fileId: string;
  ext: string;
}): string {
  const ext = input.ext.replace(/^\./, "").toLowerCase();
  return `households/${input.householdId}/properties/${input.propertyId}/${input.fileId}.${ext}`;
}

/**
 * Pick a file extension for a JPEG-encoded upload. The compressor
 * always emits image/jpeg, so we always use .jpg \u2014 simpler than
 * round-tripping the input MIME.
 */
export function jpegExtension(): "jpg" {
  return "jpg";
}
