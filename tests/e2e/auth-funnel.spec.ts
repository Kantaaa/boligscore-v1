import { expect, test } from "@playwright/test";

/**
 * Spec: "Email/password registration" + "First-run onboarding".
 *
 * Full funnel: landing → /registrer → fill the password form → land
 * on /app/onboarding. Then create a household → land on /app.
 *
 * Requires a configured Supabase project with EMAIL_CONFIRM=false in
 * dev. We use a per-run synthesised email so the test doesn't collide
 * with a previous run; the user is left in the database as a
 * disposable artefact.
 *
 * Fixmed by default so the suite passes without Supabase. CI runs that
 * want this scenario should flip the fixme and provide credentials.
 */

test.describe("Register → onboarding funnel", () => {
  test("new user registers with password and lands in onboarding", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Awaits a Supabase project with email confirmation disabled in dev.",
    );

    const stamp = Date.now();
    const email = `e2e-funnel-${stamp}@test.local`;
    const password = "test1234";

    await page.goto("/");
    await page.getByRole("link", { name: "Registrer" }).click();
    await expect(page).toHaveURL(/\/registrer$/);

    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill(password);
    await page.getByRole("button", { name: /Opprett konto/ }).click();

    await page.waitForURL(/\/app\/onboarding/);
    await expect(
      page.getByRole("heading", { name: /Opprett husholdning/ }),
    ).toBeVisible();

    await page.getByLabel("Navn på husholdningen").fill("E2E Husholdning");
    await page
      .getByRole("button", { name: /Opprett husholdning/ })
      .click();

    // Onboarding advances to the invite step. Skip → /app.
    await page.getByRole("button", { name: "Hopp over" }).click();
    await page.waitForURL(/\/app$/);
  });

  test("login funnel — existing user signs in and reaches /app", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Awaits a Supabase project with alice@test.local seeded.",
    );

    await page.goto("/logg-inn");
    await page.getByLabel("E-post").fill("alice@test.local");
    await page.getByLabel("Passord").fill("test1234");
    await page.getByRole("button", { name: /Logg inn/ }).click();
    await page.waitForURL(/\/app/);
  });
});
