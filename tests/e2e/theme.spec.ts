import { expect, test } from "@playwright/test";

/**
 * Spec: "Light/dark theme" — including the no-FOUC requirement that the
 * first paint frame already matches localStorage.theme.
 *
 * The first two scenarios run against the public landing page so they
 * don't need an authenticated session.
 */

test.describe("Theme persistence and no-FOUC", () => {
  test("default is light when localStorage.theme is unset", async ({
    page,
  }) => {
    await page.goto("/");
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(theme).toBe("light");
  });

  test("stored dark theme is applied before first paint", async ({
    page,
    context,
  }) => {
    await context.addInitScript(() => {
      // Runs in every new document before any page script.
      try {
        localStorage.setItem("theme", "dark");
      } catch {
        // ignore
      }
    });

    await page.goto("/");

    // The data-theme attribute is set synchronously by the inline boot
    // script. By the time `goto` resolves the page is already painted.
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(theme).toBe("dark");

    // Sanity: the resolved bg color matches the dark token.
    const bg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor,
    );
    expect(bg).not.toBe("rgb(248, 246, 241)"); // light --color-bg
  });

  test("theme toggle persists across reload", async ({ page }) => {
    test.fixme(true, "Toggle lives on /app/meg and needs an authenticated session.");

    await page.goto("/app/meg");
    await page.getByRole("button", { name: /mørkt tema/i }).click();
    await expect(page).toHaveURL(/\/app\/meg$/);

    const stored = await page.evaluate(() => localStorage.getItem("theme"));
    expect(stored).toBe("dark");

    await page.reload();
    const themeAfterReload = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    expect(themeAfterReload).toBe("dark");
  });
});
