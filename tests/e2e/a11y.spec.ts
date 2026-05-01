import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Spec: "Accessibility floor". Every primary route passes axe with
 * zero serious/critical violations in both themes.
 */

const PUBLIC_ROUTES = ["/", "/registrer", "/logg-inn"];

const PROTECTED_ROUTES = ["/app", "/app/vekter", "/app/husstand", "/app/meg"];

for (const route of PUBLIC_ROUTES) {
  test(`a11y: ${route} (light)`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

test.describe("a11y (protected routes)", () => {
  test.fixme(
    true,
    "Run `node scripts/seed-dev-users.mjs` once, then prepend `/dev/login?as=alice` to each goto and unfreeze.",
  );
  for (const route of PROTECTED_ROUTES) {
    test(`a11y: ${route}`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const serious = results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      );
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  }
});
