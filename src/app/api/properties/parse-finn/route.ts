import { NextResponse, type NextRequest } from "next/server";

import { fetchFinnHtml, FinnFetchError } from "@/lib/finn/fetch";
import { parseFinnHtml } from "@/lib/finn/parse";
import { FINN_ERROR_MESSAGES, type ParseResult } from "@/lib/finn/types";
import { validateFinnUrl } from "@/lib/finn/validateFinnUrl";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * `POST /api/properties/parse-finn`
 *
 * Body: `{ url: string }` — a public FINN listing URL.
 * Response: structured `ParseResult` discriminated union — never throws
 * an unhandled error. Status codes:
 *   - 401: no Supabase session.
 *   - 400: malformed body / non-FINN URL.
 *   - 200: successful parse OR controlled fetch/parse failure
 *     (`{ ok: false, error }`). The UI is structured-result-oriented;
 *     the user-actionable failure paths all flow through the body, not
 *     the HTTP status.
 *
 * TODO(monitoring): when we have a logging backend, instrument here:
 * fire a metric/log when `extracted_fields.length < 3`, so we can spot
 * FINN markup changes silently breaking the CSS fallback path before
 * users complain.
 *
 * Spec mapping:
 *   - "FINN URL parsing" — happy & partial paths land here.
 *   - "URL allowlist" — D4 enforced via validateFinnUrl.
 *   - "Authentication required" — D5 enforced via getUser.
 *   - "Resource limits" — D6 enforced inside fetchFinnHtml.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Read the body defensively — a missing or non-JSON body shouldn't
  // crash the route. Always return JSON.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(FINN_ERROR_MESSAGES.malformedUrl, 400);
  }

  const url = isObject(body) ? body["url"] : undefined;
  if (typeof url !== "string" || url.trim().length === 0) {
    return jsonError(FINN_ERROR_MESSAGES.missingUrl, 400);
  }

  // Auth check (D5). 401 if no session.
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonError(FINN_ERROR_MESSAGES.unauthenticated, 401);
  }

  // URL validation (D4). 400 on bad input.
  const validation = validateFinnUrl(url);
  if (!validation.ok) {
    return jsonError(validation.error, 400);
  }

  // Fetch + parse. Both are wrapped — any unexpected throw degrades to
  // a controlled `ok: false` so the UI never sees a 500.
  try {
    const html = await fetchFinnHtml(validation.url.toString());
    const data = await parseFinnHtml(html, validation.url.toString());
    const success: ParseResult = { ok: true, data };
    return NextResponse.json(success, { status: 200 });
  } catch (error) {
    if (error instanceof FinnFetchError) {
      return jsonError(error.userMessage, 200);
    }
    return jsonError(FINN_ERROR_MESSAGES.unexpected, 200);
  }
}

function jsonError(message: string, status: number): NextResponse {
  const body: ParseResult = { ok: false, error: message };
  return NextResponse.json(body, { status });
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
