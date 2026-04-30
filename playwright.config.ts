import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config (e2e). Tests live under `tests/e2e/` so Vitest's
 * `src/**/*.test.ts*` glob never picks them up.
 *
 * `webServer` boots `npm run start` on port 3000. The dev server is not
 * used because PWA features (the service worker, the manifest scope)
 * only ship in production builds.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
