import { describe, expect, it, vi } from "vitest";

import {
  getImageSrc,
  getImageSrcMany,
  isExternalImageUrl,
} from "./imageUrl";

/**
 * Spec mapping (openspec/changes/properties-images/specs/properties-images/spec.md):
 *   - "Storage-backed image renders"  \u2192 path \u2192 createSignedUrl.
 *   - "External URL renders directly" \u2192 http(s) URL passed through.
 *   - "Placeholder fallback"          \u2192 null/empty \u2192 null.
 *
 * The Supabase client is mocked end-to-end \u2014 we only need to assert
 * that the right method gets called with the right path/TTL. The
 * `as never` casts let us pass the minimal shape without rebuilding
 * the SupabaseClient type.
 */

function mockSupabase(opts: {
  signedUrl?: string;
  signedUrls?: Array<{ signedUrl: string | null }>;
  error?: { message: string };
}) {
  const createSignedUrl = vi
    .fn()
    .mockResolvedValue({
      data: opts.signedUrl ? { signedUrl: opts.signedUrl } : null,
      error: opts.error ?? null,
    });
  const createSignedUrls = vi.fn().mockResolvedValue({
    data: opts.signedUrls ?? null,
    error: opts.error ?? null,
  });
  return {
    client: {
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl,
          createSignedUrls,
        }),
      },
    } as never,
    createSignedUrl,
    createSignedUrls,
  };
}

describe("isExternalImageUrl", () => {
  it("returns true for http(s) URLs", () => {
    expect(isExternalImageUrl("http://example.com/x.jpg")).toBe(true);
    expect(isExternalImageUrl("https://images.finn.no/foo.jpg")).toBe(true);
    expect(isExternalImageUrl("HTTPS://CAPS.example/x")).toBe(true);
  });

  it("returns false for Storage paths", () => {
    expect(isExternalImageUrl("households/abc/properties/def/x.jpg")).toBe(false);
  });

  it("returns false for empty / null / undefined", () => {
    expect(isExternalImageUrl(null)).toBe(false);
    expect(isExternalImageUrl(undefined)).toBe(false);
    expect(isExternalImageUrl("")).toBe(false);
  });
});

describe("getImageSrc", () => {
  it("returns null for null input without touching supabase", async () => {
    const { client, createSignedUrl } = mockSupabase({});
    expect(await getImageSrc(client, null)).toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("returns null for empty string", async () => {
    const { client, createSignedUrl } = mockSupabase({});
    expect(await getImageSrc(client, "")).toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("passes external http(s) URLs through unchanged", async () => {
    const { client, createSignedUrl } = mockSupabase({});
    const url = "https://images.finn.no/abc.jpg";
    expect(await getImageSrc(client, url)).toBe(url);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it("signs Storage paths with the 1h TTL", async () => {
    const { client, createSignedUrl } = mockSupabase({
      signedUrl: "https://signed.example/x.jpg?token=abc",
    });
    const r = await getImageSrc(
      client,
      "households/h/properties/p/abc.jpg",
    );
    expect(r).toBe("https://signed.example/x.jpg?token=abc");
    expect(createSignedUrl).toHaveBeenCalledWith(
      "households/h/properties/p/abc.jpg",
      3600,
    );
  });

  it("returns null when signing fails", async () => {
    const { client } = mockSupabase({ error: { message: "boom" } });
    const r = await getImageSrc(
      client,
      "households/h/properties/p/abc.jpg",
    );
    expect(r).toBeNull();
  });
});

describe("getImageSrcMany", () => {
  it("preserves order and bulk-signs Storage paths", async () => {
    const { client, createSignedUrls } = mockSupabase({
      signedUrls: [
        { signedUrl: "https://signed/a" },
        { signedUrl: "https://signed/b" },
      ],
    });

    const result = await getImageSrcMany(client, [
      null,
      "https://images.finn.no/external.jpg",
      "households/h/properties/p1/a.jpg",
      "",
      "households/h/properties/p2/b.jpg",
    ]);

    expect(result).toEqual([
      null,
      "https://images.finn.no/external.jpg",
      "https://signed/a",
      null,
      "https://signed/b",
    ]);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls).toHaveBeenCalledWith(
      [
        "households/h/properties/p1/a.jpg",
        "households/h/properties/p2/b.jpg",
      ],
      3600,
    );
  });

  it("does not call signing API when nothing needs signing", async () => {
    const { client, createSignedUrls } = mockSupabase({});
    const r = await getImageSrcMany(client, [
      null,
      "https://example.com/x.jpg",
    ]);
    expect(r).toEqual([null, "https://example.com/x.jpg"]);
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  it("returns nulls when bulk-sign errors", async () => {
    const { client } = mockSupabase({ error: { message: "boom" } });
    const r = await getImageSrcMany(client, [
      "households/h/properties/p1/a.jpg",
    ]);
    expect(r).toEqual([null]);
  });
});
