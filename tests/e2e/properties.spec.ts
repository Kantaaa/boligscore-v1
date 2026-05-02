import { expect, test } from "@playwright/test";

/**
 * E2E specs for the properties capability.
 *
 * Spec mapping (openspec/changes/properties):
 *   10.5 — add property → list shows it (vurderer badge) → status
 *          change → reload persists.
 *   10.6 — filter by status → only matching properties; clear → full list.
 *   10.7 — search by partial address (debounced); no-match shows empty
 *          search state.
 *   10.8 — viewer's /app shows no FAB; /app/bolig/ny redirects.
 *   10.9 — empty state renders for new household; CTA navigates to
 *          /app/bolig/ny.
 *
 * Authentication is handled via /dev/login?as=alice (already shipped
 * in auth-onboarding 7). Each test currently `fixme`s itself until the
 * Supabase project + dev user provisioning lands in CI; the bodies are
 * concrete enough to flip on once the harness is configured.
 */

test.describe("Properties — add → list → status", () => {
  test.fixme(
    true,
    "Awaits Supabase + dev users via scripts/seed-dev-users.mjs.",
  );

  test("add a property, see it in the list, change status, reload persists", async ({
    page,
  }) => {
    // Sign in as alice (owner of a seeded household).
    await page.goto("/dev/login?as=alice");
    await page.waitForURL(/\/app/);

    // If we land on onboarding (zero memberships), create a household.
    if (/\/app\/onboarding/.test(page.url())) {
      await page
        .getByLabel("Navn på husholdningen")
        .fill("E2E-husstand");
      await page.getByRole("button", { name: "Opprett husholdning" }).click();
      await page.waitForURL(/\/app/);
    }

    await page.goto("/app");
    await page.getByRole("link", { name: /Ny bolig/i }).click();
    await page.waitForURL(/\/app\/bolig\/ny/);

    const address = `Storgata ${Date.now()}, 0182 Oslo`;
    await page.getByLabel("Adresse").fill(address);
    await page.getByLabel("Totalpris (kr)").fill("5200000");
    await page.getByLabel("BRA (m²)").fill("70");
    await page.getByLabel("Byggeår").fill("2010");
    await page.getByRole("button", { name: "Legg til bolig" }).click();

    // Routed to oversikt
    await page.waitForURL(/\/app\/bolig\/.+\/oversikt/);
    await expect(page.getByText(address)).toBeVisible();
    // Default status = vurderer
    await expect(page.getByLabel(/Status: vurderer/i)).toBeVisible();

    // Change status to "på visning" via the inline picker.
    await page.getByLabel(/Status: vurderer/i).click();
    await page.getByRole("dialog").getByText("på visning").click();
    await expect(page.getByLabel(/Status: på visning/i)).toBeVisible();

    // Reload — status persists.
    await page.reload();
    await expect(page.getByLabel(/Status: på visning/i)).toBeVisible();

    // Back to /app — the card should show the new status.
    await page.goto("/app");
    await expect(page.getByText(address)).toBeVisible();
  });

  test("filter by status narrows the list and clear restores it", async ({
    page,
  }) => {
    await page.goto("/dev/login?as=alice");
    await page.goto("/app");

    await page.getByRole("button", { name: "Filtrer" }).click();
    // Tap a status chip in the sheet (e.g. "på visning").
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Status: på visning/i })
      .first()
      .click();
    await page.getByRole("button", { name: "Bruk" }).click();

    // The active-filter chips row should now contain "Status: på visning".
    await expect(page.getByText("Status: på visning")).toBeVisible();

    await page.getByRole("button", { name: "Fjern filtre" }).click();
    await expect(page.getByText("Status: på visning")).toHaveCount(0);
  });

  test("search by partial address — debounced, narrows list; no-match shows fallback", async ({
    page,
  }) => {
    await page.goto("/dev/login?as=alice");
    await page.goto("/app");

    await page.getByPlaceholder("Søk etter adresse").fill("storgata");
    await expect(page.getByText(/storgata/i).first()).toBeVisible();

    await page.getByPlaceholder("Søk etter adresse").fill("zzznomatch");
    await expect(
      page.getByText("Ingen boliger matcher filtrene"),
    ).toBeVisible();
  });

  test("viewer's /app shows no FAB; direct /app/bolig/ny redirects", async ({
    page,
  }) => {
    // This needs a viewer-role membership pre-seeded; skipping in MVP.
    test.fixme(true, "Awaits a viewer-role seed fixture.");

    await page.goto("/dev/login?as=bob");
    await page.goto("/app");
    await expect(page.getByLabel("Ny bolig")).toHaveCount(0);

    await page.goto("/app/bolig/ny");
    await page.waitForURL(/\/app$/);
  });

  test("empty state on a fresh household renders the Legg til CTA", async ({
    page,
  }) => {
    // Requires a household with zero properties; for the dev users this
    // depends on the seed state. Skipping by default.
    test.fixme(true, "Awaits a fresh-household seed fixture.");

    await page.goto("/dev/login?as=alice");
    await page.goto("/app");
    await expect(page.getByText("Ingen boliger ennå")).toBeVisible();
    await page.getByRole("link", { name: /Legg til bolig/i }).click();
    await page.waitForURL(/\/app\/bolig\/ny/);
  });
});
