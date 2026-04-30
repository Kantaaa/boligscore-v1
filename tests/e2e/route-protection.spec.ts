import { expect, test } from "@playwright/test";

/**
 * Spec: "Route protection"
 */

test.describe("Auth gate on /app/*", () => {
  test("unauthenticated visit redirects to /logg-inn with a next= param", async ({
    page,
  }) => {
    const response = await page.goto("/app/vekter");
    // The middleware emits a 307 redirect, so the final URL is /logg-inn.
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/logg-inn\?next=%2Fapp%2Fvekter$/);
  });

  test("authenticated user reaches /app/vekter directly", async ({ page }) => {
    test.fixme(true, "Awaits /dev/login from auth-onboarding.");
    await page.goto("/app/vekter");
    await expect(page).toHaveURL(/\/app\/vekter$/);
    await expect(
      page.getByRole("heading", { name: "Vekter" }),
    ).toBeVisible();
  });

  test("post-login flow honours the next= param", async ({ page }) => {
    test.fixme(true, "Awaits /dev/login from auth-onboarding.");
    await page.goto("/logg-inn?next=%2Fapp%2Fvekter");
    // Sign in via dev-login form once it ships.
    await expect(page).toHaveURL(/\/app\/vekter$/);
  });
});
