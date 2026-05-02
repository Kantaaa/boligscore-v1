# FINN import — architecture notes

> Spec source: `openspec/changes/properties-finn-import/{proposal,design,specs/properties-finn-import/spec.md}.md`.

The `properties-finn-import` capability lets a user paste a FINN
listing URL and prefill the `Ny bolig` form with whatever the parser
could extract. The manual form remains the source of truth — D9 — so
parsing is best-effort: a 30%-extracted listing is still 30% less
typing than starting from blank.

## Architecture at a glance

```
NyBoligForm (client)
  ├─ Tab: "Fra FINN-lenke"  ──► fetch POST /api/properties/parse-finn
  │                                 │
  │                                 ▼
  │                       src/app/api/properties/parse-finn/route.ts
  │                                 │
  │                       ┌─────────┴──────────┐
  │                       ▼                    ▼
  │              validateFinnUrl()     createSupabaseServerClient()
  │              (D4 host allowlist)   (D5 auth gate)
  │                       │
  │                       ▼
  │                fetchFinnHtml()
  │              (D6 timeout + cap, D7 polite UA)
  │                       │
  │                       ▼
  │                parseFinnHtml()
  │              ┌────────┴───────┐
  │              ▼                ▼
  │   JSON-LD walker       CSS-selector fallback
  │   (D1 primary)         (D1 fallback)
  │              ▲                ▲
  │              └────────┬───────┘
  │                       │
  │                  ParsedListing
  │                  (partial — never throws)
  │                       │
  └────────◄ fetch response: { ok, data | error } ◄─┘
                       │
                       ▼
                Tab switches to "Manuelt"
                  + form fields prefilled
                  + "Hentet N felter" notice
```

## JSON-LD-first parser strategy (D1)

FINN's ad pages embed structured data as one or more
`<script type="application/ld+json">` blocks. The parser walks every
block and picks the first object whose `@type` matches a candidate
list (`Product`, `Place`, `Residence`, `RealEstateListing`,
`Apartment`, `House`, `SingleFamilyResidence`, `Accommodation`).
FINN historically uses `Product`, but the candidate list keeps the
parser working when they refactor.

For fields the JSON-LD doesn't carry (or where it's malformed), the
parser falls back to a labelled-value extractor that scans `<dl>`,
`<table>`, and generic "label + sibling" patterns for Norwegian field
names ("Bruksareal", "Byggeår", "Boligtype", …). Selectors are
deliberately label-based rather than class-based — labels change less
often than markup classes.

The parser **never throws on a missing field**. Every field is
optional; `extracted_fields` enumerates what was actually populated.

## Fixture-based tests (D10)

`tests/fixtures/finn/` holds checked-in HTML files used by the parser
unit tests. The current set is **synthetic** — modeled after FINN's
published markup but not captured from a real listing — because we
didn't capture real FINN HTML in the original implementation loop. The
file headers note this. Replace them with anonymized real captures
when convenient; the test assertions target schema.org / common label
patterns, so they should still pass.

### Capturing a new fixture

When FINN's HTML changes and the parser starts missing fields:

1. Open the listing in your browser.
2. View source / save HTML (no headless browsing — we want the static
   server response, identical to what `fetchFinnHtml` will see).
3. Anonymize:
   - Replace phone numbers with `+47 99 99 99 99`.
   - Replace agent names with `Eiendomsmegler Test`.
   - Strip any unique IDs from URLs (`finnkode=X` is fine to keep —
     it's already public).
4. Save as `tests/fixtures/finn/listing-N.html`.
5. Add a `describe` block in `src/lib/finn/parse.test.ts` for the new
   fixture.

## Resource limits (D6)

`fetchFinnHtml` enforces:

- **5-second timeout** via `AbortController`. Translates to
  `FINN_ERROR_MESSAGES.fetchTimeout` ("FINN svarer ikke …").
- **200 KB body cap**, checked first via `Content-Length` header and
  then enforced while streaming the body. Translates to
  `responseTooLarge`.

Both bail with a typed `FinnFetchError`, which the route handler maps
to a structured `{ ok: false, error: <Norwegian> }` response with
status 200 (the route is structured-result-oriented — only auth/URL
validation use 4xx codes, fetch failures are part of the success
schema).

## Future work / monitoring

- **No rate-limiting today.** Auth gating (D5) keeps random-internet
  abuse out, but a single user could still hammer the route. If we
  see abuse, add a per-user counter in Postgres (counter row keyed by
  `user_id`, reset every minute).
- **No FINN HTML monitoring.** When FINN refactors and the CSS path
  starts returning < 3 fields per call, we'd ideally alert. The route
  handler has a `TODO(monitoring)` marker for this.
- **No image storage.** We persist FINN's CDN URL on
  `properties.image_url`. If FINN expires the URL, the property card
  falls back to the placeholder. User-uploaded photos come in a
  separate `properties-images` capability.
