import { expect, test } from "@playwright/test";

/**
 * Spec: full invite-and-accept flow (households 10.5).
 *
 * Alice creates a household, generates an invitation link, copies it.
 * Bob (separate browser context) accepts the invitation; both end up
 * in the same household and the switcher works for both.
 *
 * /dev/login now ships (auth-onboarding 7) and uses the `?as=` query
 * parameter (alice or bob). Run `node scripts/seed-dev-users.mjs` once
 * to provision the test users, then unfreeze the test.
 */

test.describe("Household invite & accept", () => {
  test("Alice invites, Bob accepts — both see the same household", async ({
    browser,
  }) => {
    test.fixme(
      true,
      "Run `node scripts/seed-dev-users.mjs` once, then unfreeze.",
    );

    // --- Alice creates household & invitation ----------------------------
    const aliceContext = await browser.newContext();
    const alicePage = await aliceContext.newPage();
    await alicePage.goto("/dev/login?as=alice");
    // Onboarding flow — first-time user has no households, so /app
    // should redirect to /app/onboarding.
    await alicePage.waitForURL(/\/app\/onboarding/);
    await alicePage.getByLabel("Navn på husholdningen").fill("Test-husholdning");
    await alicePage.getByRole("button", { name: "Opprett husholdning" }).click();
    // Post-create screen
    await alicePage
      .getByRole("button", { name: /Lag invitasjonslenke|Kopier invitasjonslenke/ })
      .click();
    const aliceInvitationCode = alicePage.locator("code").first();
    const inviteUrl = await aliceInvitationCode.innerText();
    expect(inviteUrl).toMatch(/\/invitasjon\//);

    // --- Bob accepts -----------------------------------------------------
    const bobContext = await browser.newContext();
    const bobPage = await bobContext.newPage();
    await bobPage.goto(inviteUrl);
    // Unauth → redirect to /registrer?next=/invitasjon/...
    await bobPage.waitForURL(/\/registrer/);
    // Sign Bob in via dev-login, preserving next=
    await bobPage.goto(`/dev/login?as=bob&next=${encodeURIComponent(
      new URL(inviteUrl).pathname,
    )}`);
    await bobPage.waitForURL(/\/invitasjon\//);
    await bobPage.getByRole("button", { name: "Bli med" }).click();
    await bobPage.waitForURL(/\/app/);

    // --- Both see the household in the switcher --------------------------
    await alicePage.goto("/app/husstand");
    await expect(
      alicePage.getByRole("heading", { name: /Husstand/ }),
    ).toBeVisible();
    await expect(alicePage.getByText("Test-husholdning")).toBeVisible();

    await bobPage.goto("/app/husstand");
    await expect(bobPage.getByText("Test-husholdning")).toBeVisible();

    await aliceContext.close();
    await bobContext.close();
  });
});
