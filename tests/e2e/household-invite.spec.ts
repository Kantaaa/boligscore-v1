import { expect, test } from "@playwright/test";

/**
 * Spec: full invite-and-accept flow (households 10.5).
 *
 * Alice creates a household, generates an invitation link, copies it.
 * Bob (separate browser context) accepts the invitation; both end up
 * in the same household and the switcher works for both.
 *
 * Currently fixme: depends on `/dev/login` from the auth-onboarding
 * capability for sign-in. Once that ships, flip the fixme.
 */

test.describe("Household invite & accept", () => {
  test("Alice invites, Bob accepts — both see the same household", async ({
    browser,
  }) => {
    test.fixme(true, "Awaits /dev/login from auth-onboarding capability.");

    // --- Alice creates household & invitation ----------------------------
    const aliceContext = await browser.newContext();
    const alicePage = await aliceContext.newPage();
    await alicePage.goto("/dev/login?email=alice@test.local");
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
    await bobPage.goto(`/dev/login?email=bob@test.local&next=${encodeURIComponent(
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
