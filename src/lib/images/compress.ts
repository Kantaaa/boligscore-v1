/**
 * Browser-side image compression (D4, D5).
 *
 * Pipeline:
 *   1. `createImageBitmap(file)` decodes the file (handles JPEG / PNG /
 *      WebP universally; HEIC support varies — we surface a clear error
 *      when decode fails).
 *   2. Compute the target dimensions: scale so the longest side is
 *      \u2264 `maxDimension`, never upscale.
 *   3. Draw onto an `OffscreenCanvas` when available (worker-friendly,
 *      slightly faster) or fall back to `HTMLCanvasElement`.
 *   4. Export as JPEG via `canvas.convertToBlob` / `canvas.toBlob` at
 *      `quality` (default 0.85).
 *
 * The function deliberately does NOT preserve EXIF or alpha. Phone
 * cameras now embed orientation upright (EXIF-rotate is essentially a
 * legacy concern); transparent PNGs become JPEGs with a white
 * background, acceptable for property photos.
 *
 * Failure modes:
 *   - Decode failure (e.g. corrupted file, unsupported HEIC on Firefox):
 *     throws an Error with the user-facing Norwegian string.
 *   - No 2D context (extreme edge case, e.g. canvas disabled): same.
 */

import {
  IMAGE_ERROR_DECODE_FAILED,
  type CompressImageOptions,
  type CompressedImage,
} from "./types";

const DEFAULT_MAX_DIMENSION = 1920;
const DEFAULT_QUALITY = 0.85;
const OUTPUT_MIME = "image/jpeg" as const;

interface CanvasLike {
  width: number;
  height: number;
  toBlob?: (cb: (b: Blob | null) => void, type: string, quality: number) => void;
  convertToBlob?: (opts: { type: string; quality: number }) => Promise<Blob>;
  getContext: (
    kind: "2d",
  ) => CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
}

/**
 * Compress an image File to JPEG \u2264 maxDimension on the longest side.
 * Throws Error(IMAGE_ERROR_DECODE_FAILED) when the input cannot be
 * decoded as an image (HEIC on browsers without support, corrupted
 * bytes, etc.). Caller renders the message inline.
 */
export async function compressImage(
  file: File,
  opts: CompressImageOptions = {},
): Promise<CompressedImage> {
  const maxDimension = opts.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = opts.quality ?? DEFAULT_QUALITY;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(IMAGE_ERROR_DECODE_FAILED);
  }

  const { width, height } = computeTargetSize(
    bitmap.width,
    bitmap.height,
    maxDimension,
  );

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error(IMAGE_ERROR_DECODE_FAILED);
  }

  // Draw the source bitmap scaled to the target dimensions. The 2D
  // context's drawImage handles the resampling.
  (ctx as CanvasRenderingContext2D).drawImage(
    bitmap as unknown as CanvasImageSource,
    0,
    0,
    width,
    height,
  );
  bitmap.close?.();

  const blob = await canvasToJpegBlob(canvas, quality);
  if (!blob) {
    throw new Error(IMAGE_ERROR_DECODE_FAILED);
  }

  return {
    blob,
    width,
    height,
    bytes: blob.size,
    mimeType: OUTPUT_MIME,
  };
}

/**
 * Compute the target size: scale so the longest side equals
 * `maxDimension` exactly, but never upscale. Width/height are rounded
 * to integers because canvas dimensions cannot be fractional.
 */
export function computeTargetSize(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number,
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: srcWidth, height: srcHeight };
  }
  const longest = Math.max(srcWidth, srcHeight);
  if (longest <= maxDimension) {
    return { width: srcWidth, height: srcHeight };
  }
  const scale = maxDimension / longest;
  return {
    width: Math.round(srcWidth * scale),
    height: Math.round(srcHeight * scale),
  };
}

/**
 * Pick the best canvas implementation available. OffscreenCanvas is
 * the modern path; the HTMLCanvasElement fallback covers older Safari
 * + jsdom test environments. We type both as the same minimal
 * structural interface so downstream code stays uniform.
 */
function createCanvas(width: number, height: number): CanvasLike {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height) as unknown as CanvasLike;
  }
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    return c as unknown as CanvasLike;
  }
  throw new Error(IMAGE_ERROR_DECODE_FAILED);
}

/**
 * Encode the canvas to a JPEG Blob via whichever API is available.
 * OffscreenCanvas exposes `convertToBlob` (Promise-returning);
 * HTMLCanvasElement exposes the older callback-style `toBlob`.
 */
async function canvasToJpegBlob(
  canvas: CanvasLike,
  quality: number,
): Promise<Blob | null> {
  if (typeof canvas.convertToBlob === "function") {
    try {
      return await canvas.convertToBlob({ type: OUTPUT_MIME, quality });
    } catch {
      return null;
    }
  }
  if (typeof canvas.toBlob === "function") {
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob!((b) => resolve(b), OUTPUT_MIME, quality);
    });
  }
  return null;
}
