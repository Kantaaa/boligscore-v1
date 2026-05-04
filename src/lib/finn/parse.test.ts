import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseFinnHtml } from "./parse";

/**
 * Spec mapping (openspec/changes/properties-finn-import/specs/properties-finn-import/spec.md):
 *   - "FINN URL parsing" — successful, partial, and never-throws paths.
 *
 * Fixtures live in `tests/fixtures/finn/` (D10). They are SYNTHETIC at
 * the time of writing — modeled after FINN's published markup but not
 * captured from a real listing. Replace with anonymized real captures
 * when available; the test assertions should still hold because they
 * target schema.org / common label patterns.
 */
function loadFixture(name: string): string {
  return readFileSync(
    resolve(__dirname, "../../../tests/fixtures/finn", name),
    "utf8",
  );
}

const FAKE_URL =
  "https://www.finn.no/realestate/homes/ad.html?finnkode=123456789";

describe("parseFinnHtml — JSON-LD extraction", () => {
  it("extracts every field from a well-formed JSON-LD block", async () => {
    const html = loadFixture("listing-1.html");
    const r = await parseFinnHtml(html, FAKE_URL);

    expect(r.address).toBe("Storgata 1, 0182 Oslo");
    expect(r.price).toBe(5_250_000);
    expect(r.bra).toBe(72.5);
    expect(r.bedrooms).toBe(2);
    expect(r.primary_rooms).toBe(3);
    expect(r.year_built).toBe(1932);
    expect(r.property_type).toBe("Leilighet");
    expect(r.image_url).toBe(
      "https://images.finncdn.no/dynamic/example/listing-1.jpg",
    );
    expect(r.finn_link).toBe(FAKE_URL);
  });

  it("populates extracted_fields with every successfully-set key", async () => {
    const html = loadFixture("listing-1.html");
    const r = await parseFinnHtml(html, FAKE_URL);

    expect(r.extracted_fields).toEqual(
      expect.arrayContaining([
        "address",
        "price",
        "bra",
        "primary_rooms",
        "bedrooms",
        "year_built",
        "property_type",
        "image_url",
        "felleskostnader",
        "omkostninger",
        "fellesgjeld",
        "etasje",
        "energimerke_letter",
        "energimerke_color",
        "finnkode",
      ]),
    );
  });

  it("extracts the new budget + energi + finnkode fields", async () => {
    const html = loadFixture("listing-1.html");
    const r = await parseFinnHtml(html, FAKE_URL);

    expect(r.felleskostnader).toBe(3_200);
    expect(r.omkostninger).toBe(148_890);
    expect(r.fellesgjeld).toBe(119_100);
    expect(r.etasje).toBe("3");
    expect(r.energimerke_letter).toBe("B");
    expect(r.energimerke_color).toBe("light_green");
    // URL takes precedence over the page label, both 123456789 here.
    expect(r.finnkode).toBe(123_456_789);
  });

  it("ignores non-listing JSON-LD blocks (BreadcrumbList, etc.)", async () => {
    // listing-1.html includes a BreadcrumbList block — the parser must
    // pick the Product block, not crash on the second one.
    const html = loadFixture("listing-1.html");
    const r = await parseFinnHtml(html, FAKE_URL);
    expect(r.address).not.toBeNull();
  });
});

describe("parseFinnHtml — CSS-selector fallback", () => {
  it("extracts fields from labelled tables when JSON-LD is missing", async () => {
    const html = loadFixture("listing-2.html");
    const r = await parseFinnHtml(html, FAKE_URL);

    expect(r.address).toBe("Bjørkeveien 12, 7010 Trondheim");
    expect(r.price).toBe(3_950_000);
    expect(r.bra).toBe(120);
    expect(r.primary_rooms).toBe(110);
    expect(r.bedrooms).toBe(4);
    expect(r.bathrooms).toBe(2);
    expect(r.year_built).toBe(1985);
    expect(r.property_type).toBe("Enebolig");
    expect(r.image_url).toBe(
      "https://images.finncdn.no/dynamic/example/listing-2.jpg",
    );
  });

  it("extracts new fields from a <th>/<td> table", async () => {
    const html = loadFixture("listing-2.html");
    const r = await parseFinnHtml(html, FAKE_URL);

    expect(r.omkostninger).toBe(112_000);
    expect(r.tomteareal).toBe(865);
    expect(r.etasje).toBe("U. etasje");
    expect(r.energimerke_letter).toBe("E");
    expect(r.energimerke_color).toBe("orange");
    // listing-2 has no Felleskost/Fellesgjeld rows
    expect(r.felleskostnader).toBeNull();
    expect(r.fellesgjeld).toBeNull();
  });
});

describe("parseFinnHtml — partial extraction", () => {
  it("returns nulls for missing fields and never throws", async () => {
    const html = loadFixture("listing-3-partial.html");
    const r = await parseFinnHtml(html, FAKE_URL);

    expect(r.address).toBe("Sjøgata 4, 8006 Bodø");
    expect(r.image_url).toBe(
      "https://images.finncdn.no/dynamic/example/listing-3.jpg",
    );
    expect(r.price).toBeNull();
    expect(r.bra).toBeNull();
    expect(r.year_built).toBeNull();
    expect(r.bedrooms).toBeNull();
    expect(r.bathrooms).toBeNull();
    expect(r.primary_rooms).toBeNull();
    expect(r.property_type).toBeNull();
    // New fields are also null when neither label nor energi text is present.
    expect(r.felleskostnader).toBeNull();
    expect(r.omkostninger).toBeNull();
    expect(r.fellesgjeld).toBeNull();
    expect(r.tomteareal).toBeNull();
    expect(r.etasje).toBeNull();
    expect(r.energimerke_letter).toBeNull();
    expect(r.energimerke_color).toBeNull();
    expect(r.extracted_fields).toEqual(
      expect.arrayContaining(["address", "image_url"]),
    );
    // finnkode comes from the URL even on a near-empty page.
    expect(r.finnkode).toBe(123_456_789);
    expect(r.extracted_fields).toContain("finnkode");
  });

  it("falls back from URL to page text when finnkode is not in the URL", async () => {
    const html = loadFixture("listing-1.html");
    const noQueryUrl = "https://www.finn.no/realestate/homes/ad.html";
    const r = await parseFinnHtml(html, noQueryUrl);
    // listing-1 has <dt>FINN-kode</dt><dd>123456789</dd>
    expect(r.finnkode).toBe(123_456_789);
  });

  it("returns null finnkode when URL is opaque and page lacks it", async () => {
    const r = await parseFinnHtml("<html><body></body></html>", "not-a-url");
    expect(r.finnkode).toBeNull();
    expect(r.extracted_fields).not.toContain("finnkode");
  });
});

describe("parseFinnHtml — robustness", () => {
  it("does not throw on garbage input", async () => {
    const r = await parseFinnHtml("not really html", FAKE_URL);
    expect(r.finn_link).toBe(FAKE_URL);
    // finnkode is URL-derived, so it survives garbage HTML.
    expect(r.extracted_fields).toEqual(["finnkode"]);
  });

  it("does not throw on malformed JSON-LD", async () => {
    const html = `
      <html><body>
        <script type="application/ld+json">{ this is not valid json }</script>
        <h1>Storgata 1, 0182 Oslo</h1>
      </body></html>
    `;
    const r = await parseFinnHtml(html, FAKE_URL);
    expect(r.address).toBe("Storgata 1, 0182 Oslo");
  });

  it("handles empty html", async () => {
    const r = await parseFinnHtml("", FAKE_URL);
    // finnkode is URL-derived, so empty HTML still yields one extracted key.
    expect(r.extracted_fields).toEqual(["finnkode"]);
    expect(r.finn_link).toBe(FAKE_URL);
  });
});
