import { expect, test } from "@playwright/test";

/**
 * E2E specs for the weights capability.
 *
 * Spec mapping (openspec/changes/weights):
 *   6.6 — open /app/vekter, drag a slider on felles view, reload,
 *          value persisted; switch to personal view, see felles
 *          reference label.
 *   6.7 — reset action: drag a few sliders away from 5, click reset,
 *          confirm, all return to 5.
 *   6.8 — viewer's /app/vekter shows disabled sliders.
 *
 * Authentication is handled via /dev/login?as=alice (already shipped
 * in auth-onboarding 7). Each test currently `fixme`s itself until
 * the Supabase project + dev user provisioning lands in CI; the
 * bodies are concrete enough to flip on once the harness is
 * configured.
 */

test.describe("Weights — slider commit, persistence, reset, viewer mode", () => {
  test.fixme(
    true,
    "Awaits Supabase + dev users via scripts/seed-dev-users.mjs.",
  );

  test("drag a felles slider, reload, value persists", async ({ page }) => {
    await page.goto("/dev/login?as=alice");
    await page.waitForURL(/\/app/);

    // If we land on onboarding (zero memberships), create a household.
    if (/\/app\/onboarding/.test(page.url())) {
      await page
        .getByLabel("Navn på husholdningen")
        .fill("E2E-vekter-husstand");
      await page.getByRole("button", { name: "Opprett husholdning" }).click();
      await page.waitForURL(/\/app/);
    }

    await page.goto("/app/vekter");
    await expect(
      page.getByRole("heading", { name: "Vekter", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Felles vekter", selected: true }),
    ).toBeVisible();

    // Drag the first slider via keyboard (more deterministic in
    // headless browsers than mouse drag).
    const firstSlider = page
      .getByRole("slider", { name: /Kjøkken/i })
      .first();
    await firstSlider.focus();
    // Default is 5. Press right twice → 7.
    await firstSlider.press("ArrowRight");
    await firstSlider.press("ArrowRight");
    // Wait for the keyboard-debounce commit (250ms) + transition.
    await expect(firstSlider).toHaveAttribute("aria-valuenow", "7");

    // The "lagret" pulse appears briefly — give it room to flash.
    await page.waitForTimeout(400);

    // Reload — value persists.
    await page.reload();
    await expect(
      page.getByRole("slider", { name: /Kjøkken/i }).first(),
    ).toHaveAttribute("aria-valuenow", "7");
  });

  test("personal view shows a 'Felles: N' reference per criterion", async ({
    page,
  }) => {
    await page.goto("/dev/login?as=alice");
    await page.goto("/app/vekter");
    await page.getByRole("tab", { name: "Mine personlige vekter" }).click();
    await expect(page).toHaveURL(/view=personal/);

    // At least one row should show "Felles: <N>" alongside its slider.
    await expect(page.getByText(/Felles:\s*\d+/).first()).toBeVisible();
  });

  test("reset action: thrash a few sliders, reset, all return to 5", async ({
    page,
  }) => {
    await page.goto("/dev/login?as=alice");
    await page.goto("/app/vekter");

    // Move the first three sliders away from 5.
    const sliders = page.getByRole("slider");
    const count = Math.min(3, await sliders.count());
    for (let i = 0; i < count; i++) {
      const s = sliders.nth(i);
      await s.focus();
      await s.press("ArrowRight");
      await s.press("ArrowRight");
      await s.press("ArrowRight");
    }
    await page.waitForTimeout(400); // allow last commit

    await page
      .getByRole("button", { name: /Tilbakestill alle til 5/i })
      .click();
    await page.getByRole("button", { name: "Tilbakestill" }).click();

    // Every slider should now read 5.
    const all = page.getByRole("slider");
    const total = await all.count();
    for (let i = 0; i < total; i++) {
      await expect(all.nth(i)).toHaveAttribute("aria-valuenow", "5");
    }
  });

  test("viewer's /app/vekter shows disabled sliders and no reset", async ({
    page,
  }) => {
    test.fixme(true, "Awaits a viewer-role seed fixture.");

    await page.goto("/dev/login?as=bob"); // assuming bob is viewer in some household
    await page.goto("/app/vekter");

    const sliders = page.getByRole("slider");
    const total = await sliders.count();
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i++) {
      await expect(sliders.nth(i)).toBeDisabled();
    }
    await expect(
      page.getByRole("button", { name: /Tilbakestill alle til 5/i }),
    ).toHaveCount(0);
  });
});
