/**
 * Shared TypeScript types for the properties-images capability.
 *
 * Free of Supabase / DOM-specific imports so the types can be consumed
 * from both server actions and client components.
 */

/** Output shape of `compressImage()` — JPEG-encoded blob plus metadata. */
export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
  mimeType: "image/jpeg";
}

/** Options accepted by `compressImage()`. */
export interface CompressImageOptions {
  /** Longest-side cap in pixels (no upscale). Default 1920. */
  maxDimension?: number;
  /** JPEG encode quality (0..1). Default 0.85. */
  quality?: number;
}

/** Allowed MIME types for upload. Mirrors the bucket allowlist (D8). */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** Defense-in-depth pre-compression cap (D12). 8 MB. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Spec-locked Norwegian error strings. */
export const IMAGE_ERROR_TOO_LARGE =
  "Bildet er for stort \u2014 maks 8 MB f\u00f8r komprimering";
export const IMAGE_ERROR_UNSUPPORTED_TYPE =
  "Bare bildefiler er st\u00f8ttet (JPEG, PNG, WebP, HEIC)";
export const IMAGE_ERROR_DECODE_FAILED =
  "Kunne ikke lese bildet. Pr\u00f8v et annet.";
export const IMAGE_ERROR_UPLOAD_FAILED =
  "Kunne ikke laste opp bildet. Pr\u00f8v igjen.";
export const IMAGE_ERROR_DELETE_FAILED =
  "Kunne ikke slette bildet. Pr\u00f8v igjen.";
