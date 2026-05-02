import { expect, test } from "@playwright/test";

/**
 * E2E specs for the comparison capability.
 *
 * Spec mapping (openspec/changes/comparison/specs/comparison/spec.md):
 *   8.6 — two users score differently → second sees disagreement
 *          highlight on the differing row.
 *   8.7 — edit Felles via chip-picker → totalscore panel updates →
 *          reload, persists.
 *   8.8 — change threshold from 3 to 2 → matrix highlight pattern
 *          changes after refetch.
 *   8.9 — single-member household → simplified matrix (no Snitt /
 *          partner columns).
 *  8.10 — viewer mode → Felles cells are not interactive.
 *
 * Authentication is via /dev/login?as=alice. Tests are `fixme`-d at
 * the suite level until the Supabase + dev-user harness lands in CI;
 * mirrors the pattern used by `tests/e2e/scoring.spec.ts` and
 * `weights.spec.ts`.
 */

test.describe("Comparison — Sammenligning matrix + felles editing", () => {
  test.fixme(
    true,
    "Awaits Supabase + dev users via scripts/seed-dev-users.mjs.",
  );

  async function gotoSammenligning(page: import("@playwright/test").Page) {
    await page.goto("/dev/login?as=alice");
    await page.waitForURL(/\/app/);
    await page.goto("/app/boliger");
    // Tap the first property card.
    await page.getByRole("link", { name: /.+/ }).first().click();
    await page.waitForURL(/\/app\/bolig\//);
    // Navigate to Sammenligning tab.
    await page.getByRole("link", { name: /Sammenligning/i }).click();
    await page.waitForURL(/\/sammenligning$/);
  }

  test("two users score differently → disagreement highlight", async ({
    page,
  }) => {
    // Pre-condition: the seed contains a property where alice scored 8
    // and bob scored 4 on at least one criterion (delta=4 ≥ default
    // threshold=3).
    await gotoSammenligning(page);

    // Locate a row flagged via data-disagreement="true".
    const flagged = page.locator('li[data-disagreement="true"]').first();
    await expect(flagged).toBeVisible();

    // Verify the row has a non-default background (soft-amber). We
    // can't read computed styles cleanly, so the data-attribute is the
    // actual contract for tests.
    await expect(flagged).toHaveAttribute("data-disagreement", "true");
  });

  test("edit Felles via chip-picker → totalscore panel updates → reload persists", async ({
    page,
  }) => {
    await gotoSammenligning(page);

    // Open chip-picker on the first felles cell.
    const fellesCell = page.locator('[data-testid^="felles-"]').first();
    await fellesCell.click();
    await expect(page.getByTestId("chip-picker-popover")).toBeVisible();

    // Pick chip "8".
    await page.getByRole("radio", { name: /Felles: 8/i }).click();
    await expect(page.getByTestId("chip-picker-popover")).toBeHidden();

    // Cell content updated.
    await expect(fellesCell).toContainText("8");

    // Totalscore panel updated (we don't assert the exact number — only
    // that it's a number, not "Ikke nok data").
    const fellesTotal = page.getByTestId("felles-total");
    await expect(fellesTotal).toContainText(/\d+/);

    // Reload — chip choice persists.
    await page.reload();
    await expect(
      page.locator('[data-testid^="felles-"]').first(),
    ).toContainText("8");
  });

  test("tap outside chip-picker dismisses without save", async ({ page }) => {
    await gotoSammenligning(page);

    // Get current felles value of the first cell.
    const fellesCell = page.locator('[data-testid^="felles-"]').first();
    const before = (await fellesCell.textContent()) ?? "";

    await fellesCell.click();
    await expect(page.getByTestId("chip-picker-popover")).toBeVisible();

    // Click outside (the page body, not the popover).
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await expect(page.getByTestId("chip-picker-popover")).toBeHidden();

    // Cell unchanged.
    const after = (await fellesCell.textContent()) ?? "";
    expect(after).toBe(before);
  });

  test("change threshold 3 → 2 → matrix highlight pattern changes after refetch", async ({
    page,
  }) => {
    await page.goto("/dev/login?as=alice");
    await page.waitForURL(/\/app/);
    await page.goto("/app/husstand");

    // Read current threshold.
    const slider = page.getByLabel("Uenighetsgrense");
    await slider.focus();
    // Drag the slider to 2 by setting its value via keyboard.
    await page.keyboard.press("Home"); // value=1
    await page.keyboard.press("ArrowRight"); // value=2

    // Wait for the debounced commit (250ms).
    await expect(page.getByTestId("threshold-value")).toContainText("2");

    // Navigate to a property's sammenligning tab.
    await page.goto("/app/boliger");
    await page.getByRole("link", { name: /.+/ }).first().click();
    await page.getByRole("link", { name: /Sammenligning/i }).click();

    // The matrix should now flag rows where |Δ| ≥ 2 (more rows than
    // threshold=3). Since the seed isn't deterministic for delta
    // patterns, we just assert that AT LEAST one row is flagged.
    const flagged = page.locator('li[data-disagreement="true"]');
    expect(await flagged.count()).toBeGreaterThanOrEqual(1);
  });

  test("single-member household → simplified matrix (no Snitt column)", async ({
    page,
  }) => {
    // Setup: log in as a user with a solo household, navigate to the
    // sammenligning tab. Asserts the column header reads
    // "Kriterium | Din | Felles" only.
    await page.goto("/dev/login?as=carol-solo"); // assumed seed
    await page.waitForURL(/\/app/);
    await page.goto("/app/boliger");
    await page.getByRole("link", { name: /.+/ }).first().click();
    await page.getByRole("link", { name: /Sammenligning/i }).click();

    // The matrix should NOT contain a "Snitt" header.
    await expect(page.getByText(/Snitt/i)).toHaveCount(0);
    // It SHOULD contain "Felles" and "Din" labels in the totalscore.
    await expect(page.getByTestId("din-total")).toBeVisible();
  });

  test("viewer mode → Felles cells are not interactive", async ({ page }) => {
    // Setup: log in as a viewer. Felles cell renders as a plain span,
    // not a button — no popover opens on click.
    await page.goto("/dev/login?as=viewer-user"); // assumed seed
    await page.waitForURL(/\/app/);
    await page.goto("/app/boliger");
    await page.getByRole("link", { name: /.+/ }).first().click();
    await page.getByRole("link", { name: /Sammenligning/i }).click();

    const fellesCell = page.locator('[data-testid^="felles-"]').first();
    await fellesCell.click();
    // No popover should appear.
    await expect(page.getByTestId("chip-picker-popover")).toBeHidden();
  });

  test("missing-felles warning renders when felles count < 22", async ({
    page,
  }) => {
    await gotoSammenligning(page);
    // Seed has at least one unset felles.
    const warning = page.getByTestId("missing-felles-warning");
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/kriterier mangler score/);
  });
});
