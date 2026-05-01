import { expect, test } from "@playwright/test";

/**
 * E2E specs for the scoring capability.
 *
 * Spec mapping (openspec/changes/scoring/specs/scoring/spec.md):
 *   6.6 — open Min vurdering, tap a chip → counter increments;
 *          reload, score persists.
 *   6.7 — tap same chip twice (no change) — counter stable, no extra
 *          history rows. (History assertion uses raw SQL via the
 *          Supabase admin client — out of scope for the Playwright
 *          harness; the chip state assertion stays here, the SQL
 *          assertion lives in the integration suite.)
 *   6.8 — type into section notes, blur, reload — note persists.
 *   6.9 — optimistic-failure rollback (requires server fault injection;
 *          not wired in MVP).
 *  6.10 — viewer mode: chips disabled, notes read-only.
 *
 * Authentication is via /dev/login?as=alice (auth-onboarding 7).
 * Each test currently `fixme`s itself until the Supabase project +
 * dev user provisioning lands in CI; the bodies are concrete enough
 * to flip on once the harness is configured. Mirrors the pattern used
 * by `tests/e2e/weights.spec.ts`.
 */

test.describe("Scoring — Min vurdering chip rad + notes", () => {
  test.fixme(
    true,
    "Awaits Supabase + dev users via scripts/seed-dev-users.mjs.",
  );

  async function gotoFirstProperty(page: import("@playwright/test").Page) {
    await page.goto("/dev/login?as=alice");
    await page.waitForURL(/\/app/);
    await page.goto("/app/boliger");
    // Tap the first property card.
    await page.getByRole("link", { name: /.+/ }).first().click();
    await page.waitForURL(/\/app\/bolig\//);
    // Navigate to Min vurdering tab.
    await page.getByRole("link", { name: /Min vurdering/i }).click();
    await page.waitForURL(/\/min-vurdering$/);
  }

  test("tap a chip → counter increments; reload persists score", async ({
    page,
  }) => {
    await gotoFirstProperty(page);

    // Counter renders the spec format.
    const counter = page.getByTestId("score-counter");
    await expect(counter).toContainText(/\d+ av \d+ kriterier scoret/);

    // Take baseline counter value.
    const before = (await counter.textContent()) ?? "";
    const beforeMatch = before.match(/(\d+) av/);
    const beforeN = beforeMatch ? Number(beforeMatch[1]) : 0;

    // Tap chip "8" on the first criterion (Kjøkken).
    const chip = page
      .getByRole("radio", { name: /Kjøkken: 8/i })
      .first();
    await chip.click();
    await expect(chip).toHaveAttribute("aria-checked", "true");

    // Counter should have ticked up by 1 if Kjøkken was previously
    // unscored. Allow either +0 (already scored) or +1.
    await expect(counter).toContainText(/\d+ av \d+ kriterier scoret/);
    const after = (await counter.textContent()) ?? "";
    const afterMatch = after.match(/(\d+) av/);
    const afterN = afterMatch ? Number(afterMatch[1]) : 0;
    expect(afterN).toBeGreaterThanOrEqual(beforeN);

    // Reload — chip stays filled.
    await page.reload();
    await expect(
      page.getByRole("radio", { name: /Kjøkken: 8/i }).first(),
    ).toHaveAttribute("aria-checked", "true");
  });

  test("tap same chip twice — chip stays selected, counter stable", async ({
    page,
  }) => {
    await gotoFirstProperty(page);

    const chip = page
      .getByRole("radio", { name: /Bad: 5/i })
      .first();
    await chip.click();
    await expect(chip).toHaveAttribute("aria-checked", "true");

    const counter = page.getByTestId("score-counter");
    const before = (await counter.textContent()) ?? "";

    // Tap the same chip again.
    await chip.click();
    await expect(chip).toHaveAttribute("aria-checked", "true");
    const after = (await counter.textContent()) ?? "";
    expect(after).toBe(before);
    // History-row assertion is in the integration suite.
  });

  test("type in a section note, blur, reload — body persists", async ({
    page,
  }) => {
    await gotoFirstProperty(page);

    const note = page
      .getByRole("textbox", { name: /Huskelapp for Bolig innvendig/i })
      .first();
    const sample = `E2E-note-${Date.now()}`;
    await note.fill(sample);
    await note.blur();
    // Wait for the "lagret" indicator to appear.
    await expect(page.getByText(/lagret/i).first()).toBeVisible({
      timeout: 5000,
    });

    await page.reload();
    await expect(
      page
        .getByRole("textbox", { name: /Huskelapp for Bolig innvendig/i })
        .first(),
    ).toHaveValue(sample);
  });

  test("viewer mode — chips disabled, notes read-only", async ({ page }) => {
    test.fixme(true, "Awaits a viewer-role seed fixture.");

    // Pre-condition: bob is a viewer in some household whose property
    // we open. The seed fixture must provision that role.
    await page.goto("/dev/login?as=bob");
    await page.waitForURL(/\/app/);
    await page.goto("/app/boliger");
    await page.getByRole("link", { name: /.+/ }).first().click();
    await page.getByRole("link", { name: /Min vurdering/i }).click();

    // All chips disabled.
    const chips = page.getByRole("radio");
    const total = await chips.count();
    expect(total).toBeGreaterThan(0);
    for (let i = 0; i < total; i++) {
      await expect(chips.nth(i)).toBeDisabled();
    }

    // Notes textareas are read-only.
    const textareas = page.getByRole("textbox");
    const tCount = await textareas.count();
    for (let i = 0; i < tCount; i++) {
      await expect(textareas.nth(i)).toHaveAttribute("readonly", "");
    }
  });
});
