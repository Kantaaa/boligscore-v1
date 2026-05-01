import { expect, test } from "@playwright/test";

/**
 * Spec: "Public landing page".
 *
 * The landing page is server-rendered with no auth requirement, so
 * these scenarios run without /dev/login.
 */

test.describe("Public landing page", () => {
  test("anonymous visit shows the headline and both CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Score boliger sammen/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Registrer" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Logg inn" })).toBeVisible();
  });

  test("Registrer CTA navigates to /registrer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Registrer" }).click();
    await expect(page).toHaveURL(/\/registrer$/);
    await expect(
      page.getByRole("heading", { name: /Opprett konto/ }),
    ).toBeVisible();
  });

  test("Logg inn CTA navigates to /logg-inn", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Logg inn" }).first().click();
    await expect(page).toHaveURL(/\/logg-inn$/);
    await expect(
      page.getByRole("heading", { name: /Logg inn/ }),
    ).toBeVisible();
  });
});
