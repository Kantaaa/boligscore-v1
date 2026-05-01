import { expect, test } from "@playwright/test";

/**
 * Spec: "First-run onboarding redirect" (5.4).
 *
 * Visiting /app/vekter as a freshly registered (zero-households) user
 * must redirect to /app/onboarding instead of rendering the empty
 * Vekter page. The reverse guard (5.5) is exercised by visiting
 * /app/onboarding when memberships > 0 — should bounce to /app.
 *
 * Both assertions need a configured Supabase plus dev-login. Fixmed.
 */

test.describe("Onboarding auto-redirect", () => {
  test("zero-households user hitting /app/vekter is bounced to /app/onboarding", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Requires a freshly created user with no household; ensure cleanup between runs.",
    );

    const stamp = Date.now();
    const email = `e2e-onb-${stamp}@test.local`;

    await page.goto("/registrer");
    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill("test1234");
    await page.getByRole("button", { name: /Opprett konto/ }).click();
    await page.waitForURL(/\/app\/onboarding/);

    // Now navigate to /app/vekter directly — should bounce back.
    await page.goto("/app/vekter");
    await expect(page).toHaveURL(/\/app\/onboarding/);
  });

  test("user with a household visiting /app/onboarding is redirected to /app", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Awaits dev-login + a fixture user that's already a household member.",
    );

    await page.goto("/dev/login?as=alice");
    await page.waitForURL(/\/app/);
    await page.goto("/app/onboarding");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("?force=1 escape hatch keeps the user on /app/onboarding", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Awaits dev-login + an existing-member fixture (e.g. alice).",
    );

    await page.goto("/dev/login?as=alice");
    await page.goto("/app/onboarding?force=1");
    await expect(page).toHaveURL(/\/app\/onboarding\?force=1/);
    await expect(
      page.getByRole("heading", { name: /Opprett husholdning/ }),
    ).toBeVisible();
  });
});
