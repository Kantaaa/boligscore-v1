import { expect, test } from "@playwright/test";

/**
 * Spec: "PWA installability" + offline shell.
 *
 * Lighthouse PWA audit (task 9.5) is intentionally NOT inlined here —
 * we run it via `lhci` in CI. This file verifies the manifest and the
 * offline banner contract.
 */

test.describe("PWA manifest and offline shell", () => {
  test("/manifest.webmanifest is served and well-formed", async ({
    request,
  }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.name).toBe("Boligscore");
    expect(manifest.short_name).toBe("Boligscore");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/app");
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
    const sizes = (manifest.icons as Array<{ sizes: string }>).map(
      (icon) => icon.sizes,
    );
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  test("offline banner appears when navigator.onLine is false", async ({
    page,
    context,
  }) => {
    test.fixme(true, "Needs an authenticated session — banner mounts inside /app.");
    await page.goto("/app");
    await context.setOffline(true);
    await expect(
      page.getByText(/du er offline/i),
    ).toBeVisible();
    await context.setOffline(false);
  });

  test("/dev/login returns 404 in production unless DEV_LOGIN_FORCE is set", async ({
    request,
  }) => {
    // The Playwright webServer runs `npm run start`, i.e. NODE_ENV=production.
    // Without DEV_LOGIN_FORCE the page should not be reachable.
    const response = await request.get("/dev/login", {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    if (process.env.DEV_LOGIN_FORCE === "1") {
      expect(response.status()).toBe(200);
    } else {
      expect(response.status()).toBe(404);
    }
  });
});
