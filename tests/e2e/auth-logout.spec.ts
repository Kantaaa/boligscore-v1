import { expect, test } from "@playwright/test";

/**
 * Spec: "Logout" — D7. Sign out lives only on /app/meg.
 *
 * Two assertions:
 *   1. Clicking "Logg ut" on /app/meg redirects to / and a subsequent
 *      visit to /app/* bounces back to /logg-inn.
 *   2. The header / bottom nav / household switcher do NOT expose a
 *      logout action (anywhere outside Meg).
 *
 * The first scenario needs /dev/login + Supabase. The second is a pure
 * DOM assertion against the static authenticated layout.
 */

test.describe("Logout flow", () => {
  test("clicking Logg ut on Meg signs out and redirects to /", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Awaits Supabase project + alice@test.local seeded via scripts/seed-dev-users.mjs.",
    );

    await page.goto("/dev/login?as=alice");
    await page.waitForURL(/\/app/);

    await page.goto("/app/meg");
    await page.getByRole("button", { name: /^Logg ut/ }).click();
    await page.waitForURL("/");

    // Subsequent visit to /app/* bounces to /logg-inn.
    await page.goto("/app/vekter");
    await expect(page).toHaveURL(/\/logg-inn/);
  });

  test("no logout in header / bottom nav / household switcher", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Awaits /dev/login so the header and bottom nav are even rendered.",
    );

    await page.goto("/dev/login?as=alice");
    await page.waitForURL(/\/app/);
    await page.goto("/app");

    // Bottom nav / header text never includes "Logg ut".
    const headerText = await page
      .getByRole("banner")
      .innerText()
      .catch(() => "");
    expect(headerText.toLowerCase()).not.toContain("logg ut");

    const navText = await page
      .getByRole("navigation")
      .innerText()
      .catch(() => "");
    expect(navText.toLowerCase()).not.toContain("logg ut");
  });
});
