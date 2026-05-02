import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Spec mapping:
 *   - "FINN URL parsing" — happy path returns ok: true with the parsed data.
 *   - "URL allowlist" — non-FINN URLs return ok: false / 400.
 *   - "Authentication required" — unauthenticated returns 401.
 *   - "Network failure" — fetch errors degrade to ok: false.
 *
 * The route handler imports `createSupabaseServerClient` and our fetch
 * + parse helpers; we mock the Supabase factory and the fetch module
 * to stage each scenario without spinning up a real server.
 */

// We mock these BEFORE importing the route, so that the route picks up
// the mocked exports.
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("@/lib/finn/fetch", async () => {
  const actual = await vi.importActual<typeof import("@/lib/finn/fetch")>(
    "@/lib/finn/fetch",
  );
  return {
    ...actual,
    fetchFinnHtml: vi.fn(),
  };
});

import { fetchFinnHtml, FinnFetchError } from "@/lib/finn/fetch";
import { FINN_ERROR_MESSAGES } from "@/lib/finn/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { POST } from "./route";

function loadFixture(name: string): string {
  return readFileSync(
    resolve(__dirname, "../../../../../tests/fixtures/finn", name),
    "utf8",
  );
}

interface MockedSupabaseClient {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
}

function makeAuthedClient(): MockedSupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
  };
}

function makeUnauthedClient(): MockedSupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  };
}

function makeRequest(body: unknown): Request {
  return new Request("https://test.local/api/properties/parse-finn", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/properties/parse-finn", () => {
  const mockedSupabase = vi.mocked(createSupabaseServerClient);
  const mockedFetch = vi.mocked(fetchFinnHtml);

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok=true with the parsed data on the happy path", async () => {
    mockedSupabase.mockReturnValue(
      makeAuthedClient() as unknown as ReturnType<
        typeof createSupabaseServerClient
      >,
    );
    mockedFetch.mockResolvedValue(loadFixture("listing-1.html"));

    const res = await POST(
      makeRequest({
        url: "https://www.finn.no/realestate/homes/ad.html?finnkode=1",
      }) as Parameters<typeof POST>[0],
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.address).toBe("Storgata 1, 0182 Oslo");
    expect(body.data.price).toBe(5_250_000);
    expect(body.data.extracted_fields).toEqual(
      expect.arrayContaining(["address", "price", "bra"]),
    );
  });

  it("returns 401 when no Supabase session is present", async () => {
    mockedSupabase.mockReturnValue(
      makeUnauthedClient() as unknown as ReturnType<
        typeof createSupabaseServerClient
      >,
    );

    const res = await POST(
      makeRequest({
        url: "https://www.finn.no/realestate/homes/ad.html?finnkode=1",
      }) as Parameters<typeof POST>[0],
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      error: FINN_ERROR_MESSAGES.unauthenticated,
    });
    // No outbound fetch should have happened.
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("returns 400 with notFinnUrl on a non-FINN host", async () => {
    mockedSupabase.mockReturnValue(
      makeAuthedClient() as unknown as ReturnType<
        typeof createSupabaseServerClient
      >,
    );

    const res = await POST(
      makeRequest({ url: "https://example.com/anything" }) as Parameters<
        typeof POST
      >[0],
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      error: FINN_ERROR_MESSAGES.notFinnUrl,
    });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("returns 400 on a malformed URL", async () => {
    mockedSupabase.mockReturnValue(
      makeAuthedClient() as unknown as ReturnType<
        typeof createSupabaseServerClient
      >,
    );

    const res = await POST(
      makeRequest({ url: "not a url" }) as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 400 when url field is missing", async () => {
    mockedSupabase.mockReturnValue(
      makeAuthedClient() as unknown as ReturnType<
        typeof createSupabaseServerClient
      >,
    );

    const res = await POST(
      makeRequest({}) as Parameters<typeof POST>[0],
    );
    expect(res.status).toBe(400);
  });

  it("returns ok=false (not 500) on fetch failure", async () => {
    mockedSupabase.mockReturnValue(
      makeAuthedClient() as unknown as ReturnType<
        typeof createSupabaseServerClient
      >,
    );
    mockedFetch.mockRejectedValue(
      new FinnFetchError(FINN_ERROR_MESSAGES.fetchTimeout),
    );

    const res = await POST(
      makeRequest({
        url: "https://www.finn.no/realestate/homes/ad.html?finnkode=1",
      }) as Parameters<typeof POST>[0],
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      error: FINN_ERROR_MESSAGES.fetchTimeout,
    });
  });

  it("collapses unexpected throws to a controlled ok=false", async () => {
    mockedSupabase.mockReturnValue(
      makeAuthedClient() as unknown as ReturnType<
        typeof createSupabaseServerClient
      >,
    );
    mockedFetch.mockRejectedValue(new Error("kaboom"));

    const res = await POST(
      makeRequest({
        url: "https://www.finn.no/realestate/homes/ad.html?finnkode=1",
      }) as Parameters<typeof POST>[0],
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      error: FINN_ERROR_MESSAGES.unexpected,
    });
  });
});
