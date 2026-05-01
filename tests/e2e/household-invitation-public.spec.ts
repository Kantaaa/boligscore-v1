import { expect, test } from "@playwright/test";

/**
 * Spec: invitation acceptance page handles each branch (households 9.x).
 *
 * The unauthenticated-redirect branch can be exercised without
 * /dev/login because it never needs to actually sign in: visiting
 * /invitasjon/<unknown-token> as anon should land on /registrer or
 * show an "ugyldig invitasjon" page, both of which are deterministic
 * even before the auth-onboarding capability ships.
 *
 * The "expired" / "already accepted" / "already member" / successful
 * branches need a real Supabase project plus dev-login, so they are
 * fixmed.
 */

test.describe("Invitation acceptance page", () => {
  test("visiting /invitasjon/<unknown-token> unauthenticated shows ugyldig variant", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Awaits a configured Supabase project so the RPC returns a real lookup.",
    );

    await page.goto("/invitasjon/00000000-0000-0000-0000-000000000000");
    // Either redirected to /registrer (preferred when the token doesn't
    // exist yet — defensive UX), or rendered "Ugyldig invitasjon".
    const url = page.url();
    if (url.includes("/registrer")) {
      expect(url).toMatch(/next=/);
    } else {
      await expect(
        page.getByRole("heading", { name: /Ugyldig invitasjon/ }),
      ).toBeVisible();
    }
  });

  test("expired invitation shows 'Denne lenken har utløpt'", async ({
    page,
  }) => {
    test.fixme(true, "Awaits Supabase fixture with an expired invitation row.");
    await page.goto("/invitasjon/<expired-token>");
    await expect(
      page.getByText("Denne lenken har utløpt. Be om en ny."),
    ).toBeVisible();
  });

  test("already-member shows 'Du er allerede medlem...' with switch button", async ({
    page,
  }) => {
    test.fixme(
      true,
      "Run `node scripts/seed-dev-users.mjs` once + create a household-membership fixture, then unfreeze.",
    );
    await page.goto("/dev/login?as=alice");
    await page.goto("/invitasjon/<token-for-alice-existing-household>");
    await expect(
      page.getByText("Du er allerede medlem av denne husholdningen"),
    ).toBeVisible();
  });
});
