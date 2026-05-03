/**
 * Pre-upload file validation. Pure (no DOM) so it can be unit-tested
 * with Vitest under the default node environment.
 *
 * Spec mapping:
 *   - "Oversized file rejected"           → MAX_UPLOAD_BYTES gate.
 *   - "Disallowed type rejected"          → ALLOWED_IMAGE_MIME_TYPES check.
 *   - "Allowed types accepted"            → returns ok for the allowlist.
 *
 * The validator returns Norwegian-bokm\u00e5l user-facing error strings,
 * exposed via the constants in `./types` so tests stay loose-coupled
 * from the exact wording.
 */

import {
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_ERROR_TOO_LARGE,
  IMAGE_ERROR_UNSUPPORTED_TYPE,
  MAX_UPLOAD_BYTES,
  type AllowedImageMimeType,
} from "./types";

export type ValidateImageResult =
  | { ok: true; mimeType: AllowedImageMimeType }
  | { ok: false; error: string };

/**
 * Returns ok when the file is under the size cap and one of the four
 * allowed MIME types. Type detection relies on `file.type` populated by
 * the browser's file picker — the same value the storage bucket
 * `allowed_mime_types` enforces server-side, so a divergence here is a
 * client-only false-positive rejection rather than a security hole.
 */
export function validateImageFile(file: File): ValidateImageResult {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: IMAGE_ERROR_TOO_LARGE };
  }
  const type = (file.type ?? "").toLowerCase() as AllowedImageMimeType;
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(type)) {
    return { ok: false, error: IMAGE_ERROR_UNSUPPORTED_TYPE };
  }
  return { ok: true, mimeType: type };
}
