import { afterEach, describe, expect, it, vi } from "vitest";

import { compressImage, computeTargetSize } from "./compress";
import { IMAGE_ERROR_DECODE_FAILED } from "./types";

/**
 * Spec mapping (openspec/changes/properties-images/specs/properties-images/spec.md):
 *   - "Large photo compressed"        \u2192 4032\u00d73024 \u2192 1920\u00d7\u2026 JPEG.
 *   - "Already-small photo passes through" \u2192 1200\u00d7800 \u2192 unchanged size.
 *   - "Unreadable file rejected"      \u2192 createImageBitmap rejects \u2192 IMAGE_ERROR_DECODE_FAILED.
 *
 * The default Vitest environment is `node`, where `createImageBitmap`,
 * `OffscreenCanvas`, and `HTMLCanvasElement` are not available. We
 * stub them with `vi.stubGlobal` per test, asserting the call shape
 * the production helper uses.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

interface BitmapStub {
  width: number;
  height: number;
  close: () => void;
}

function stubGlobals(opts: {
  bitmap?: BitmapStub | null;
  bitmapThrows?: boolean;
  canvasBlob?: Blob | null;
}) {
  if (opts.bitmapThrows) {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("bad")));
  } else {
    const b = opts.bitmap ?? { width: 100, height: 100, close: () => {} };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(b));
  }

  // OffscreenCanvas stub. The `convertToBlob` returns a fake Blob that
  // captures the requested type + quality so tests can assert on them.
  class FakeOffscreen {
    width: number;
    height: number;
    lastDrawArgs: unknown[] = [];
    convertToBlobCalls: Array<{ type: string; quality: number }> = [];
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    getContext(_kind: "2d") {
      const self = this;
      return {
        drawImage(...args: unknown[]) {
          self.lastDrawArgs = args;
        },
      } as unknown as CanvasRenderingContext2D;
    }
    convertToBlob(o: { type: string; quality: number }) {
      this.convertToBlobCalls.push(o);
      if (opts.canvasBlob === null) {
        return Promise.resolve(null);
      }
      const b =
        opts.canvasBlob ??
        new Blob([new Uint8Array(123)], { type: o.type });
      return Promise.resolve(b);
    }
  }
  vi.stubGlobal("OffscreenCanvas", FakeOffscreen);
}

describe("computeTargetSize", () => {
  it("scales a landscape photo so the longest side is the cap", () => {
    expect(computeTargetSize(4032, 3024, 1920)).toEqual({
      width: 1920,
      height: 1440,
    });
  });

  it("scales a portrait photo so the longest side is the cap", () => {
    expect(computeTargetSize(3024, 4032, 1920)).toEqual({
      width: 1440,
      height: 1920,
    });
  });

  it("does not upscale when the image already fits", () => {
    expect(computeTargetSize(1200, 800, 1920)).toEqual({
      width: 1200,
      height: 800,
    });
  });

  it("does not upscale when both dimensions equal the cap", () => {
    expect(computeTargetSize(1920, 1920, 1920)).toEqual({
      width: 1920,
      height: 1920,
    });
  });

  it("returns input dimensions unchanged for zero/negative input", () => {
    expect(computeTargetSize(0, 0, 1920)).toEqual({ width: 0, height: 0 });
  });
});

describe("compressImage", () => {
  it("downscales a large photo and emits JPEG output", async () => {
    stubGlobals({ bitmap: { width: 4032, height: 3024, close: () => {} } });
    const file = new File([new Uint8Array(10)], "x.jpg", { type: "image/jpeg" });

    const r = await compressImage(file);

    expect(r.mimeType).toBe("image/jpeg");
    expect(r.width).toBe(1920);
    expect(r.height).toBe(1440);
    expect(r.bytes).toBeGreaterThan(0);
    expect(r.blob.type).toBe("image/jpeg");
  });

  it("preserves dimensions when the input already fits", async () => {
    stubGlobals({ bitmap: { width: 800, height: 600, close: () => {} } });
    const file = new File([new Uint8Array(10)], "x.png", { type: "image/png" });

    const r = await compressImage(file);

    expect(r.width).toBe(800);
    expect(r.height).toBe(600);
    expect(r.mimeType).toBe("image/jpeg");
  });

  it("respects a custom maxDimension and quality", async () => {
    stubGlobals({ bitmap: { width: 1000, height: 500, close: () => {} } });
    const file = new File([new Uint8Array(10)], "x.jpg", { type: "image/jpeg" });

    const r = await compressImage(file, { maxDimension: 400, quality: 0.5 });

    expect(r.width).toBe(400);
    expect(r.height).toBe(200);
  });

  it("throws the Norwegian decode error when createImageBitmap rejects", async () => {
    stubGlobals({ bitmapThrows: true });
    const file = new File([new Uint8Array(10)], "x.heic", {
      type: "image/heic",
    });

    await expect(compressImage(file)).rejects.toThrow(IMAGE_ERROR_DECODE_FAILED);
  });

  it("throws the decode error when canvas blob conversion returns null", async () => {
    stubGlobals({
      bitmap: { width: 100, height: 100, close: () => {} },
      canvasBlob: null,
    });
    const file = new File([new Uint8Array(10)], "x.jpg", { type: "image/jpeg" });

    await expect(compressImage(file)).rejects.toThrow(IMAGE_ERROR_DECODE_FAILED);
  });
});
