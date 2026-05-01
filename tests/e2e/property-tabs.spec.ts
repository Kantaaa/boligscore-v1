import { expect, test } from "@playwright/test";

/**
 * Spec: "Property detail tab system"
 */

test.describe("Property detail tabs", () => {
  test.fixme(true, "Awaits /dev/login + a seeded property from properties capability.");

  const PROPERTY_ID = "00000000-0000-0000-0000-000000000001";

  test("default redirect: /app/bolig/[id] → /app/bolig/[id]/oversikt", async ({
    page,
  }) => {
    await page.goto(`/app/bolig/${PROPERTY_ID}`);
    await expect(page).toHaveURL(
      new RegExp(`/app/bolig/${PROPERTY_ID}/oversikt$`),
    );
    await expect(
      page.getByRole("heading", { name: "Oversikt" }),
    ).toBeVisible();
  });

  test("tab switch updates URL and content", async ({ page }) => {
    await page.goto(`/app/bolig/${PROPERTY_ID}/oversikt`);
    await page.getByRole("tab", { name: "Min vurdering" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/app/bolig/${PROPERTY_ID}/min-vurdering$`),
    );
    await expect(
      page.getByRole("heading", { name: "Min vurdering" }),
    ).toBeVisible();
  });

  test("browser back returns to previous tab", async ({ page }) => {
    await page.goto(`/app/bolig/${PROPERTY_ID}/oversikt`);
    await page.getByRole("tab", { name: "Min vurdering" }).click();
    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/app/bolig/${PROPERTY_ID}/oversikt$`),
    );
  });

  test("direct deep link cold-loads the right tab", async ({ page }) => {
    await page.goto(`/app/bolig/${PROPERTY_ID}/sammenligning`);
    await expect(
      page.getByRole("heading", { name: "Sammenligning" }),
    ).toBeVisible();
    const activeTab = page.getByRole("tab", { name: "Sammenligning" });
    await expect(activeTab).toHaveAttribute("aria-selected", "true");
  });
});
