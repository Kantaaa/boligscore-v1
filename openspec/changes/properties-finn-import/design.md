> Conventions: see `openspec/conventions.md`.

## Context

User pastes a FINN listing URL (e.g. `https://www.finn.no/realestate/homes/ad.html?finnkode=123456789`). We need to fetch the page server-side, extract the fields the user would otherwise type by hand, and prefill the manual form. The user reviews and saves.

Constraints:
- **CORS**: browsers can't fetch FINN directly from the client. Server-side only.
- **Robustness**: FINN's HTML changes. We can't depend on stable selectors. Two-tier extraction (JSON-LD primary, CSS fallback) reduces breakage rate.
- **Politeness**: identify ourselves with a User-Agent string. Respect robots.txt (FINN allows scraping ad pages last I checked, but verify).
- **No silent failures**: if parsing breaks, surface what we got + a clear "kunne ikke hente alle felter" notice; never block the user.

## Goals / Non-Goals

**Goals:**
- Extract address, price, BRA, primærrom, bedrooms, year_built, property_type, image_url from a public FINN listing.
- Surface partial extraction with a notice — never block the manual form.
- Tab switcher in `NyBoligForm` between FINN and Manual input, FINN as default.
- Server-side route handler (`/api/properties/parse-finn`) gated by authenticated session.
- Tests run offline against checked-in HTML fixtures.

**Non-Goals:**
- Photo download / upload — only the FINN-hosted URL is stored.
- Floor plan / nabolag / detailed amenities — too brittle, not worth.
- Re-parse on URL update.
- Multi-language listings — Norwegian-only.
- Caching / rate-limiting — premature for v1; revisit if abuse appears.
- Authenticated FINN scraping — public ads only.

## Decisions

### D1. Parse JSON-LD first, fall back to CSS selectors

**Choice**: FINN embeds product/listing data as JSON-LD (`<script type="application/ld+json">`) on most ad pages. Try parsing that first. If it's missing or malformed, fall back to CSS selector–based extraction.

**Rationale**: JSON-LD is structured and stable across markup refactors. CSS selectors work too but break when FINN renames classes. Two-tier extraction is more durable.

### D2. Use `cheerio` for HTML parsing

**Choice**: `cheerio` for HTML traversal. Fast, jQuery-like API, well-maintained.

**Alternative considered**: `node-html-parser` (lighter), `linkedom` (DOM-compatible), `parse5`.

**Rationale**: `cheerio` is the de-facto standard for server-side HTML scraping in Node. The API is approachable and the bundle cost only matters server-side anyway. We bundle one extra dep but gain much faster development.

### D3. Parser runs in a Next.js Route Handler, not a Server Action

**Choice**: `src/app/api/properties/parse-finn/route.ts` POST handler that accepts `{ url: string }` and returns `{ ok: true, data: ParsedListing }` or `{ ok: false, error: string }`.

**Alternative considered**: Server Action invoked directly from `NyBoligForm`.

**Rationale**: a Route Handler keeps the parser's runtime decoupled from React's render cycle. Easier to add rate limiting, easier to call from tests, can be moved to an Edge Function later. Server Actions are great for mutations bound to a form; this is a *read* triggered by a button.

### D4. URL whitelist — only `finn.no` hosts

**Choice**: validate `new URL(input).hostname === 'www.finn.no' || === 'finn.no'`. Reject everything else.

**Rationale**: prevents the parser from being abused as a generic SSRF — someone POSTing `http://internal-service:8080/secrets` would otherwise give them whatever that returns. Hostname allowlist closes the obvious hole.

### D5. Authenticated callers only

**Choice**: the route handler reads the Supabase session via `createSupabaseServerClient()` and rejects unauthenticated callers with 401.

**Rationale**: this is a write-adjacent action that costs network bandwidth on our side. Unauthenticated random-internet calls are abuse. Session check is one-line.

### D6. 5-second fetch timeout, 200KB response cap

**Choice**: `fetch()` with `AbortController`, timeout 5 seconds. Read body up to 200KB and bail. Return a clear error if exceeded.

**Rationale**: defends against (a) FINN being slow/down (we want fast UI feedback), (b) malicious URLs returning huge responses, (c) accidentally proxying a non-HTML URL.

### D7. User-Agent identifies us

**Choice**: `User-Agent: Boligscore/1.0 (+https://boligscore.app)`.

**Rationale**: standard scraper etiquette. Lets FINN identify and contact us if they want.

### D8. Partial-success path

**Choice**: parser returns `{ ok: true, data: { address, price, bra, ..., extracted_fields: ['address', 'price'] } }` even when some fields are missing. UI shows a notice listing which fields were prefilled and which were left blank.

**Rationale**: a 30%-extracted listing is still 30% less typing. Don't let the perfect be the enemy of the good.

### D9. The manual form remains the source of truth

**Choice**: after a successful parse, the prefilled values land in `NyBoligForm` form state — **not** auto-submitted. The user reviews, edits, and submits. Same `createProperty` server action as before.

**Rationale**: parsing can be wrong (mislabeled rooms, price in NOK vs kr, etc.). Always letting the user review prevents bad data and keeps the user in control.

### D10. Fixtures-based tests

**Choice**: check in 2–3 anonymized FINN listing HTML files at `tests/fixtures/finn/`. Parser tests run against those. CI never hits the real FINN.

**Rationale**: deterministic, fast, doesn't depend on FINN being up. Re-record fixtures when the parser breaks against a real listing.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| FINN changes HTML, parser breaks silently | JSON-LD-first reduces breakage. Manual fallback always works. Add a Sentry/log alert when CSS path returns < 3 fields, so we notice. |
| FINN blocks our user-agent / IP | Polite UA. If blocked, fall back to "kunne ikke hente — fyll inn manuelt". User-facing impact is clear. |
| User pastes a non-FINN URL | Hostname allowlist (D4) rejects with a clear Norwegian error. |
| Parser becomes brittle and noisy | Each extracted field is best-effort, optional. Missing fields render `—` in the form, user fills in. |
| Slow FINN responses block the UI | 5s timeout (D6); UI shows spinner with cancel-button affordance. |
| Image URL expires after FINN takes the listing down | Property card already falls back to placeholder when `image_url` is null OR fails to load. Acceptable. |
| Server gets DDOS'd via parse-finn | Authenticated callers only (D5). Add a per-user rate limit if abuse shows up. |

## Resolved decisions

### D11. Tab order: FINN as default

**Choice**: when the user lands on `Ny bolig`, the FINN tab is selected and focused. Manual is one tap away.

**Rationale**: matches the brief ("Fra FINN-lenke (default, anbefalt)"). Most users will arrive with a URL in mind; manual is the fallback.
