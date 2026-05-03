/**
 * `image_url` rendering helpers.
 *
 * Per design D3 the `properties.image_url` text column carries one of
 * two value shapes:
 *   - External URL    \u2014 starts with `http`, used as-is (legacy + FINN-import).
 *   - Storage path    \u2014 anything else, signed before render via the
 *                      private `property-images` bucket (1h TTL).
 *
 * Branching on `startsWith('http')` keeps the contract simple. A future
 * change can split into separate columns if the dual-shape becomes a
 * footgun; today it lets the FINN-import flow keep working unchanged.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { BUCKET_NAME, SIGNED_URL_TTL_SECONDS } from "./images";

/** True when `image_url` is an external (http(s)) URL rather than a Storage path. */
export function isExternalImageUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/**
 * Resolve `properties.image_url` to a renderable URL.
 *   - null            \u2192 null
 *   - http(s) URL     \u2192 returned as-is.
 *   - Storage path    \u2192 signed URL with 1h TTL, or null on failure.
 *
 * Used by both server components (preferred) and Oversikt initial paint.
 */
export async function getImageSrc(
  supabase: SupabaseClient,
  imageUrl: string | null | undefined,
): Promise<string | null> {
  if (imageUrl == null || imageUrl.length === 0) return null;
  if (isExternalImageUrl(imageUrl)) return imageUrl;
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(imageUrl, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Bulk-sign Storage paths in one round (NPlus1 elimination for the list
 * page). External URLs pass through untouched; nulls stay null. The
 * return shape preserves the input array order so callers can zip the
 * result back into the row collection.
 */
export async function getImageSrcMany(
  supabase: SupabaseClient,
  imageUrls: Array<string | null | undefined>,
): Promise<Array<string | null>> {
  const result: Array<string | null> = new Array(imageUrls.length).fill(null);
  const pathsToSign: Array<{ index: number; path: string }> = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const v = imageUrls[i];
    if (v == null || v.length === 0) continue;
    if (isExternalImageUrl(v)) {
      result[i] = v;
      continue;
    }
    pathsToSign.push({ index: i, path: v });
  }

  if (pathsToSign.length === 0) return result;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrls(
      pathsToSign.map((p) => p.path),
      SIGNED_URL_TTL_SECONDS,
    );
  if (error || !data) return result;

  for (let i = 0; i < pathsToSign.length; i++) {
    const entry = data[i];
    if (entry?.signedUrl) {
      result[pathsToSign[i].index] = entry.signedUrl;
    }
  }
  return result;
}
