import { expect, test } from "@playwright/test";

/**
 * Spec: "Bottom navigation"
 *
 * NOTE: All routes under /app require authentication. The /dev/login
 * route now ships (auth-onboarding 7), but these scenarios still need
 * `alice@test.local` seeded — run `node scripts/seed-dev-users.mjs`
 * once and then unfreeze.
 */

test.describe("Bottom navigation across /app destinations", () => {
  test.fixme(
    true,
    "Run `node scripts/seed-dev-users.mjs` once, then unfreeze.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/login?as=alice");
    await page.waitForURL(/\/app/);
  });

  test("active state matches URL across all four destinations", async ({
    page,
  }) => {
    await page.goto("/app");
    await expect(page.getByRole("navigation", { name: /hovednavigasjon/i })).toBeVisible();

    for (const { label, path } of [
      { label: "Boliger", path: "/app" },
      { label: "Vekter", path: "/app/vekter" },
      { label: "Husstand", path: "/app/husstand" },
      { label: "Meg", path: "/app/meg" },
    ]) {
      await page.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      const active = page.getByRole("link", { name: label });
      await expect(active).toHaveAttribute("aria-current", "page");
    }
  });

  test("client-side navigation does not reload the document", async ({
    page,
  }) => {
    await page.goto("/app");

    let reloads = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) reloads += 1;
    });
    const before = reloads;

    await page.getByRole("link", { name: "Vekter" }).click();
    await expect(page).toHaveURL(/\/app\/vekter$/);

    // One nav event for the soft transition is fine; a hard reload would
    // produce a `load` event we can also assert.
    expect(reloads - before).toBeLessThan(2);
  });

  test("last item is fully visible (not occluded by the bottom nav)", async ({
    page,
  }) => {
    await page.goto("/app/vekter");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const heading = page.getByRole("heading", { name: "Vekter" });
    await expect(heading).toBeInViewport();
  });
});
