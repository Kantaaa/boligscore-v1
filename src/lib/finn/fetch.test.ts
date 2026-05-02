import { describe, expect, it } from "vitest";

import { FinnFetchError, fetchFinnHtml } from "./fetch";
import { FINN_ERROR_MESSAGES } from "./types";

/**
 * Spec mapping:
 *   - "Resource limits" — 5s timeout, 200KB cap.
 *   - "Network failure" — 4xx/5xx surface as FinnFetchError, never throw
 *     unhandled.
 *
 * We pass a custom `fetchImpl` rather than mocking the global so the
 * tests are deterministic and Node-runtime independent.
 */

const URL = "https://www.finn.no/realestate/homes/ad.html?finnkode=1";

function jsonResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    ...init,
  });
}

describe("fetchFinnHtml", () => {
  it("returns the body on a 200 response", async () => {
    const fetchImpl = async () => jsonResponse("<html><body>hi</body></html>");
    const r = await fetchFinnHtml(URL, { fetchImpl: fetchImpl as typeof fetch });
    expect(r).toContain("<body>hi</body>");
  });

  it("throws FinnFetchError on a 404", async () => {
    const fetchImpl = async () =>
      new Response("Not found", { status: 404 });
    await expect(
      fetchFinnHtml(URL, { fetchImpl: fetchImpl as typeof fetch }),
    ).rejects.toMatchObject({
      userMessage: FINN_ERROR_MESSAGES.fetchFailed,
    });
  });

  it("throws FinnFetchError on a 5xx", async () => {
    const fetchImpl = async () =>
      new Response("oops", { status: 503 });
    await expect(
      fetchFinnHtml(URL, { fetchImpl: fetchImpl as typeof fetch }),
    ).rejects.toBeInstanceOf(FinnFetchError);
  });

  it("translates AbortError to fetchTimeout", async () => {
    const fetchImpl = async (
      _url: string | URL | Request,
      init?: RequestInit,
    ) => {
      // Simulate the runtime behaviour: when the abort signal fires, the
      // fetch implementation rejects with an AbortError.
      return await new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    };
    await expect(
      fetchFinnHtml(URL, { fetchImpl: fetchImpl as typeof fetch }),
    ).rejects.toMatchObject({
      userMessage: FINN_ERROR_MESSAGES.fetchTimeout,
    });
  }, 10_000);

  it("rejects responses larger than 200KB up-front via content-length", async () => {
    const fetchImpl = async () =>
      new Response("x".repeat(10), {
        status: 200,
        headers: {
          "content-type": "text/html",
          "content-length": String(300 * 1024),
        },
      });
    await expect(
      fetchFinnHtml(URL, { fetchImpl: fetchImpl as typeof fetch }),
    ).rejects.toMatchObject({
      userMessage: FINN_ERROR_MESSAGES.responseTooLarge,
    });
  });

  it("rejects oversized streaming bodies even when content-length is missing", async () => {
    // 300KB of payload, no content-length advertised.
    const big = "x".repeat(300 * 1024);
    const fetchImpl = async () =>
      new Response(big, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    await expect(
      fetchFinnHtml(URL, { fetchImpl: fetchImpl as typeof fetch }),
    ).rejects.toMatchObject({
      userMessage: FINN_ERROR_MESSAGES.responseTooLarge,
    });
  });
});
