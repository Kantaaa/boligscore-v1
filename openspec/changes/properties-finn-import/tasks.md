> Conventions: see `openspec/conventions.md`.

## 1. Dependencies + scaffolding

- [x] 1.1 Add `cheerio` to `package.json` dependencies. Also `@types/cheerio` if not already pulled in transitively.
- [x] 1.2 Verify `properties.image_url` column exists (it does — added by `properties` capability stub). If absent, add a small migration.

## 2. Parser library

- [x] 2.1 Create `src/lib/finn/types.ts` with `ParsedListing` and `ParseResult` discriminated union.
- [x] 2.2 Create `src/lib/finn/parse.ts` exporting `async parseFinnHtml(html: string): Promise<ParsedListing>`. Order:
   - Try JSON-LD extraction first (look for `<script type="application/ld+json">` containing `@type: "Product"` or `"Place"`/`"RealEstateListing"`).
   - Fall back to CSS selectors for fields not found in JSON-LD.
   - Always return a partial — never throw on missing fields.
- [x] 2.3 Create `src/lib/finn/fetch.ts` exporting `async fetchFinnHtml(url: string): Promise<string>` with the 5-second timeout, 200 KB body cap, and the polite `User-Agent`.
- [x] 2.4 URL validator helper `validateFinnUrl(input: string): { ok: true; url: URL } | { ok: false; error: string }` enforcing the hostname allowlist (D4). Reject any non-`finn.no` host.

## 3. Route Handler

- [x] 3.1 Create `src/app/api/properties/parse-finn/route.ts` exporting an async `POST` handler.
- [x] 3.2 Auth check via `createSupabaseServerClient()`; 401 if no session.
- [x] 3.3 Validate the URL via `validateFinnUrl`; 400 on bad input.
- [x] 3.4 Fetch the page via `fetchFinnHtml`; surface fetch errors with Norwegian messages.
- [x] 3.5 Parse via `parseFinnHtml`; build the `ParsedListing` response.
- [x] 3.6 Return JSON: `{ ok: true, data: ParsedListing }` or `{ ok: false, error: string }`. Never 500 on a parse problem — always a structured `ok: false`.

## 4. UI — NyBoligForm tabs

- [ ] 4.1 Add a tab strip above the form: `Fra FINN-lenke` (default, focused) | `Manuelt`. Tabs match the existing PropertyTabs style (underline + primary).
- [ ] 4.2 FINN tab body: URL input (`<input type="url" placeholder="https://www.finn.no/...">`), "Hent fra FINN" submit button, optional `<a>` to "Eller fyll inn manuelt" that switches tabs.
- [ ] 4.3 Manual tab body: existing form sections, unchanged.
- [ ] 4.4 Persist tab choice in `useState`, not URL — refreshes reset to FINN default.

## 5. UI — fetch + prefill flow

- [ ] 5.1 On "Hent fra FINN" click: client POST to `/api/properties/parse-finn` with `{ url }`. Show inline spinner.
- [ ] 5.2 On success: switch to the Manual tab with form values prefilled from the parsed data. Show a non-blocking info banner: `Hentet {N} felter fra FINN — sjekk og rediger ved behov.`
- [ ] 5.3 On failure: show an inline error with the server's Norwegian message. The user can retry with a different URL or switch to Manual.
- [ ] 5.4 On any user edit after prefill: keep the user's edit. Never re-trigger the parser unless the user explicitly clicks "Hent fra FINN" again.

## 6. Tests

- [ ] 6.1 **Unit (Vitest)**: `validateFinnUrl` — accept valid finn.no, reject other hosts, reject malformed URLs, accept both `finn.no` and `www.finn.no`.
- [ ] 6.2 **Unit**: `parseFinnHtml` against checked-in fixtures (`tests/fixtures/finn/listing-1.html`, `listing-2.html`). Cover: full extraction, partial extraction, JSON-LD missing → CSS fallback, garbage input.
- [ ] 6.3 **Unit**: `fetchFinnHtml` mock-fetch with `vi.mock('node:fetch')` (or `undici` mocks). Cover timeout, 404, 5xx, oversized body.
- [ ] 6.4 **Integration / Route**: `POST /api/properties/parse-finn` — happy path, unauthenticated 401, non-FINN URL 400, fetch failure → `ok: false`.
- [ ] 6.5 **E2E (Playwright)**: open `/app/bolig/ny` → FINN tab focused → paste URL (mocked via Playwright's `route()` interceptor) → parse → form prefills → save → property visible on `/app`.

## 7. Documentation

- [ ] 7.1 `docs/architecture/finn-import.md` — JSON-LD-first parser strategy, fixture-based tests, how to capture a new fixture when FINN's HTML changes.
- [ ] 7.2 Update `properties` proposal `## Out of MVP scope` section: remove the FINN bullet (it's no longer deferred).
- [ ] 7.3 Update `README.md` "Adding a property" section to mention the FINN paste path.

## 8. Operational

- [ ] 8.1 Add `cheerio` to `package.json` (already in 1.1 — keep one source).
- [ ] 8.2 Add a `// TODO(monitoring)` comment in the route handler noting where to add a Sentry/log call when parser extraction count drops below a threshold (e.g. < 3 fields). The actual instrumentation is deferred until we have a logging backend.
