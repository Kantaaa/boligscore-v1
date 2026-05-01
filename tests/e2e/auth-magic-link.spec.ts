import { expect, test } from "@playwright/test";

/**
 * Spec: "Magic link authentication (alternate)".
 *
 * The minimal happy path is "request the link → see Sjekk e-posten din".
 * The full link-click round-trip needs Mailpit, which is bundled with
 * `supabase start` (local Supabase CLI). The hosted project doesn't
 * expose Mailpit so we keep that part fixmed.
 */

test.describe("Magic link request", () => {
  test("magic-link variant on /logg-inn shows confirmation copy", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Awaits a Supabase project that accepts signInWithOtp without rate-limiting tests.",
    );

    await page.goto("/logg-inn");
    await page
      .getByRole("button", { name: /Logg inn med e-postlenke i stedet/ })
      .click();
    await page.getByLabel("E-post").fill("alice@test.local");
    await page.getByRole("button", { name: /Send innloggingslenke/ }).click();
    await expect(
      page.getByText("Sjekk e-posten din for å logge inn."),
    ).toBeVisible();
  });

  test("clicking the magic link in Mailpit signs the user in", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Mailpit only available with the local Supabase CLI; hosted project sends real email.",
    );

    // Pseudocode for the scenario when Mailpit is reachable:
    //   1. Request the magic link as above.
    //   2. Poll http://localhost:54324/api/v1/messages for a new message
    //      whose subject matches /Boligscore/ to alice@test.local.
    //   3. Extract the action link from the body.
    //   4. page.goto(actionLink) and expect /app to render.
    expect(page).toBeTruthy();
  });
});
