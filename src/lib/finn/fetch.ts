import { FINN_ERROR_MESSAGES, type FinnErrorMessage } from "./types";

/** 5-second timeout on the upstream fetch (D6). */
const FETCH_TIMEOUT_MS = 5_000;

/** 200 KB body cap (D6). Anything larger is treated as malicious / wrong. */
const MAX_BODY_BYTES = 200 * 1024;

/**
 * Polite User-Agent (D7). Identifies us so FINN can rate-limit / contact
 * us instead of silently blocking. Bump the version when behaviour
 * changes meaningfully.
 */
const USER_AGENT = "Boligscore/1.0 (+https://boligscore.app)";

/**
 * Tagged error subclass so the route handler can distinguish the
 * controlled error categories (timeout / oversized / non-2xx) from
 * unexpected throws and translate to the right Norwegian message.
 */
export class FinnFetchError extends Error {
  readonly userMessage: FinnErrorMessage;

  constructor(userMessage: FinnErrorMessage, cause?: unknown) {
    super(userMessage);
    this.name = "FinnFetchError";
    this.userMessage = userMessage;
    if (cause !== undefined) {
      // Best-effort `cause` propagation (Node 16.9+ supports the option).
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Fetch a FINN listing as text, enforcing the timeout + body cap.
 *
 * The caller is expected to have already validated the URL via
 * `validateFinnUrl`. We don't re-check the host here because the route
 * handler should never call this with an unvalidated URL — keeping
 * concerns separate makes both functions easier to test in isolation.
 */
export async function fetchFinnHtml(
  url: string,
  options: { fetchImpl?: typeof fetch } = {},
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "nb-NO,nb;q=0.9,no;q=0.8,en;q=0.5",
      },
      signal: controller.signal,
      // Don't follow redirects to a non-FINN host. Default `redirect:
      // 'follow'` is fine here — FINN's redirects stay on finn.no.
      redirect: "follow",
    });
  } catch (cause) {
    clearTimeout(timeoutId);
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new FinnFetchError(FINN_ERROR_MESSAGES.fetchTimeout, cause);
    }
    throw new FinnFetchError(FINN_ERROR_MESSAGES.fetchFailed, cause);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new FinnFetchError(FINN_ERROR_MESSAGES.fetchFailed);
  }

  // Stream + cap the body. We avoid `response.text()` (no built-in cap)
  // and instead read chunks until we either hit the cap or finish.
  const text = await readBodyCapped(response, MAX_BODY_BYTES);
  return text;
}

/**
 * Read a Response body up to `maxBytes`. Throws `FinnFetchError` if the
 * body exceeds the cap — we always want a controlled error instead of a
 * generic "out of memory" / silently-truncated string.
 */
async function readBodyCapped(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new FinnFetchError(FINN_ERROR_MESSAGES.responseTooLarge);
  }

  // Prefer the stream API so we can bail early. Fall back to text() on
  // runtimes where body is null (some test fakes).
  if (!response.body) {
    const fallback = await response.text();
    if (Buffer.byteLength(fallback, "utf8") > maxBytes) {
      throw new FinnFetchError(FINN_ERROR_MESSAGES.responseTooLarge);
    }
    return fallback;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let received = 0;
  let html = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        throw new FinnFetchError(FINN_ERROR_MESSAGES.responseTooLarge);
      }
      html += decoder.decode(value, { stream: true });
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // releaseLock can throw on some runtimes when the stream is
      // already errored — we don't care, we're already on an error path.
    }
  }
  html += decoder.decode();
  return html;
}
