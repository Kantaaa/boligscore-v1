import { describe, expect, it } from "vitest";

import {
  IMAGE_ERROR_TOO_LARGE,
  IMAGE_ERROR_UNSUPPORTED_TYPE,
  MAX_UPLOAD_BYTES,
} from "./types";
import { validateImageFile } from "./validate";

/**
 * Spec mapping (openspec/changes/properties-images/specs/properties-images/spec.md):
 *   - "Allowed types accepted"
 *   - "Disallowed type rejected"
 *   - "Oversized file rejected"
 *
 * The minimal `File` polyfill below avoids needing jsdom — node 20+ has
 * a global Blob, and File extends Blob with `name` + `type`. We keep
 * everything offline and synchronous.
 */

interface FakeFileShape {
  name: string;
  type: string;
  size: number;
}

function fakeFile(shape: FakeFileShape): File {
  // The validator only reads .type and .size, so we synthesise a
  // minimal File-like object via Object.assign on a Blob. Tests stay
  // green even when the runtime's File constructor is missing.
  const blob = new Blob([new Uint8Array(shape.size)], { type: shape.type });
  return Object.assign(blob, {
    name: shape.name,
    lastModified: Date.now(),
    webkitRelativePath: "",
  }) as unknown as File;
}

describe("validateImageFile", () => {
  it("accepts JPEG under the size cap", () => {
    const r = validateImageFile(
      fakeFile({ name: "a.jpg", type: "image/jpeg", size: 1_000_000 }),
    );
    expect(r).toEqual({ ok: true, mimeType: "image/jpeg" });
  });

  it("accepts PNG", () => {
    const r = validateImageFile(
      fakeFile({ name: "a.png", type: "image/png", size: 1000 }),
    );
    expect(r).toEqual({ ok: true, mimeType: "image/png" });
  });

  it("accepts WebP", () => {
    const r = validateImageFile(
      fakeFile({ name: "a.webp", type: "image/webp", size: 1000 }),
    );
    expect(r).toEqual({ ok: true, mimeType: "image/webp" });
  });

  it("accepts HEIC", () => {
    const r = validateImageFile(
      fakeFile({ name: "a.heic", type: "image/heic", size: 1000 }),
    );
    expect(r).toEqual({ ok: true, mimeType: "image/heic" });
  });

  it("rejects PDF with the unsupported-type message", () => {
    const r = validateImageFile(
      fakeFile({ name: "a.pdf", type: "application/pdf", size: 1000 }),
    );
    expect(r).toEqual({ ok: false, error: IMAGE_ERROR_UNSUPPORTED_TYPE });
  });

  it("rejects MP4 with the unsupported-type message", () => {
    const r = validateImageFile(
      fakeFile({ name: "a.mp4", type: "video/mp4", size: 1000 }),
    );
    expect(r).toEqual({ ok: false, error: IMAGE_ERROR_UNSUPPORTED_TYPE });
  });

  it("rejects empty MIME type", () => {
    const r = validateImageFile(
      fakeFile({ name: "a", type: "", size: 1000 }),
    );
    expect(r).toMatchObject({ ok: false });
  });

  it("rejects files > 8 MB pre-compression", () => {
    const r = validateImageFile(
      fakeFile({
        name: "huge.jpg",
        type: "image/jpeg",
        size: MAX_UPLOAD_BYTES + 1,
      }),
    );
    expect(r).toEqual({ ok: false, error: IMAGE_ERROR_TOO_LARGE });
  });

  it("accepts a file at exactly the size cap", () => {
    const r = validateImageFile(
      fakeFile({
        name: "edge.jpg",
        type: "image/jpeg",
        size: MAX_UPLOAD_BYTES,
      }),
    );
    expect(r).toMatchObject({ ok: true });
  });
});
