> Conventions: see `openspec/conventions.md`.

## Why

The MVP `properties` capability ships manual entry only — adding a property means typing in 10+ fields (address, price, costs, BRA, primary rooms, bedrooms, bathrooms, year built, type, floor). The original Stitch design brief calls FINN-import the **default** path because the primary use-case is "I just saw a listing on FINN and want to score it." Manual entry is friction users will route around (or just stop using the app).

User feedback after the first launch confirms this: the first piece of feedback received was that "fakta som kan hentes av FINN annonsen burde bli lagt inn selv". Auto-fill is the highest-leverage UX win.

## What Changes

- New **server-side FINN parser** that accepts a FINN listing URL and returns a structured object with the fields it could extract.
- Activate the **"Fra FINN-lenke" tab** in `NyBoligForm` (currently hidden per `properties` D10). The tab gets a single URL input, a "Hent fra FINN"-knapp, and on success prefills the manual form (which is reused — same component, same validation, same submit). User can review/edit anything before saving.
- **Failure path**: parse errors fall back to the manual form with whatever was extracted (often address + image_url even when prices are weird). Always non-blocking — a parse error never prevents adding the property manually.
- Store the source FINN URL on `properties.finn_link` (already exists) and the listing's primary image URL on a new `properties.image_url` column (also already exists in schema, currently always null).
- The parser is invoked via a Next.js Route Handler (`/api/properties/parse-finn`) so the heavy work runs server-side and we can add per-user rate limiting later.
- **No image storage** — we only store the URL pointing at FINN's CDN. If FINN later expires or moves the image, we degrade gracefully to the placeholder. Real photo upload comes in a separate `properties-images` capability.

## Out of MVP scope (future)

- **Photo upload** — store user-uploaded photos in Supabase Storage. Separate change `properties-images`.
- **Re-parse on URL change** — the parser runs once when the user pastes the URL; updating the FINN-link later doesn't re-trigger it. If a listing changes price/details, the user re-imports manually.
- **FINN account integration** — no API key, no scraped private data. Public listing pages only.
- **Bulk import** — single-URL entry only.
- **Caching** — every parse is a fresh HTTP fetch. If we hit rate-limits or want to amortize cost, add a Redis cache later.
- **Deep field extraction** — fields beyond the basics (e.g. `omkostninger`, `felleskostnader`, primærrom split) are best-effort. Anything we can't reliably extract is left blank for the user to fill in.

## Capabilities

### New Capabilities
- `properties-finn-import`: server-side FINN HTML parser, parse-FINN Route Handler, "Fra FINN-lenke" tab UI, prefill flow into NyBoligForm.

### Modified Capabilities
- `properties`: the "Fra FINN-lenke" tab is no longer hidden (D10 reversed). Surface a tab switcher above the form. The default tab depends on whether `image_url` should be displayed in `OversiktView` (out of scope for this change — list-card placeholder thumbnail stays).

## Impact

- **Backend**: new `src/lib/finn/parse.ts` module + `src/app/api/properties/parse-finn/route.ts` handler. Adds `cheerio` (or `node-html-parser`) as a runtime dependency.
- **UI**: `NyBoligForm` gets a tab switcher and a URL input mode. Reuses the existing manual fields for review/edit.
- **Database**: `properties.image_url` column already exists (text, nullable). No schema change required.
- **Network**: every parse triggers an outbound HTTPS GET to `https://www.finn.no/...`. No auth; user-agent set politely. Errors handled (timeout, 404, redirect, blocked) without crashing the page.
- **Rate limiting**: not in this change — start without it, add a per-user counter later if abuse appears.
- **Tests**: parser tests with checked-in FINN HTML fixtures (so tests are offline). UI test for the prefill round-trip.
- **Robustness caveat**: FINN can change their HTML at any time. The parser must degrade gracefully — extract what it can, leave the rest empty, never crash. A monitoring/alerting story comes later.
