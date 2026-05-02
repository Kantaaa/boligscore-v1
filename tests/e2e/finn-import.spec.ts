import { expect, test } from "@playwright/test";

/**
 * E2E specs for the `properties-finn-import` capability.
 *
 * Spec mapping (openspec/changes/properties-finn-import/specs/properties-finn-import/spec.md):
 *   - "NyBoligForm tab switcher" — Fra FINN-lenke is the default tab.
 *   - "Successful prefill" — paste a (mocked) URL → form prefills →
 *     switches to Manuelt → save lands the parsed values on the row.
 *   - "Parse failure falls back to manual" — error path keeps the form
 *     usable.
 *
 * The route handler is intercepted via Playwright's `page.route()` so
 * the test never hits real FINN. A future revision should also exercise
 * the genuine /api/properties/parse-finn end-to-end against a Supabase
 * harness; for now, mocking it keeps the test deterministic.
 *
 * Marked fixme until the Supabase + dev users harness is ready for this
 * branch (mirrors tests/e2e/properties.spec.ts).
 */

test.describe("FINN import — paste URL → prefill → save", () => {
  test.fixme(
    true,
    "Awaits Supabase + dev users via scripts/seed-dev-users.mjs.",
  );

  test("default tab is FINN; URL paste prefills + saves", async ({ page }) => {
    // Mock the parse-finn route before navigating.
    await page.route("**/api/properties/parse-finn", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            address: "Storgata 1, 0182 Oslo",
            price: 5_250_000,
            bra: 72.5,
            primary_rooms: 3,
            bedrooms: 2,
            bathrooms: 1,
            year_built: 1932,
            property_type: "Leilighet",
            image_url:
              "https://images.finncdn.no/dynamic/example/listing-1.jpg",
            finn_link:
              "https://www.finn.no/realestate/homes/ad.html?finnkode=1",
            extracted_fields: [
              "address",
              "price",
              "bra",
              "primary_rooms",
              "bedrooms",
              "bathrooms",
              "year_built",
              "property_type",
              "image_url",
            ],
          },
        }),
      });
    });

    await page.goto("/dev/login?as=alice");
    await page.waitForURL(/\/app/);
    await page.goto("/app/bolig/ny");

    // Default tab is FINN, input is focused.
    await expect(
      page.getByRole("tab", { name: "Fra FINN-lenke" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("FINN-lenke")).toBeFocused();

    // Paste + submit.
    await page
      .getByLabel("FINN-lenke")
      .fill("https://www.finn.no/realestate/homes/ad.html?finnkode=1");
    await page.getByRole("button", { name: "Hent fra FINN" }).click();

    // Switches to Manuelt with prefilled values + notice.
    await expect(
      page.getByRole("tab", { name: "Manuelt" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Adresse")).toHaveValue(
      "Storgata 1, 0182 Oslo",
    );
    await expect(page.getByLabel("Totalpris (kr)")).toHaveValue("5250000");
    await expect(
      page.getByText(/Hentet \d+ felter fra FINN/),
    ).toBeVisible();

    // Save and verify the property landed.
    await page.getByRole("button", { name: "Legg til bolig" }).click();
    await page.waitForURL(/\/app\/bolig\/.+\/oversikt/);
  });

  test("non-FINN URL surfaces the Norwegian error inline", async ({ page }) => {
    await page.route("**/api/properties/parse-finn", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: "URL må være en FINN-annonse",
        }),
      });
    });

    await page.goto("/dev/login?as=alice");
    await page.goto("/app/bolig/ny");
    await page
      .getByLabel("FINN-lenke")
      .fill("https://example.com/not-finn");
    await page.getByRole("button", { name: "Hent fra FINN" }).click();
    await expect(
      page.getByText("URL må være en FINN-annonse"),
    ).toBeVisible();
    // Stays on FINN tab.
    await expect(
      page.getByRole("tab", { name: "Fra FINN-lenke" }),
    ).toHaveAttribute("aria-selected", "true");
  });
});
