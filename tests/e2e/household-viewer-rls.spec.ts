import { expect, test } from "@playwright/test";

/**
 * Spec: viewer cannot write — UI blocks AND a direct API call fails RLS
 * (households 10.7).
 *
 * Two assertions:
 *   1. Viewer sees no "Endre navn" / "Slett husholdning" / "Generer
 *      invitasjonslenke" controls on /app/husstand.
 *   2. A direct PostgREST call as the viewer to insert a household-scoped
 *      row returns an RLS policy violation.
 *
 * Currently fixme: viewer creation needs the dev-login flow to sign in
 * a user pre-seeded with role='viewer' on a household, plus the
 * `properties` capability to provide a writable target table for the
 * RLS smoke. Until both land, the test is a placeholder.
 */

test.describe("Viewer write attempts", () => {
  test("viewer's UI hides write CTAs", async ({ page }) => {
    test.fixme(
      true,
      "Awaits a viewer-seeded fixture user (alice/bob seeded by scripts/seed-dev-users.mjs are owner/member only).",
    );

    await page.goto("/dev/login?as=alice");
    await page.goto("/app/husstand");
    await expect(
      page.getByRole("button", { name: "Endre navn" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Slett husholdning/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Generer invitasjonslenke/i }),
    ).toHaveCount(0);
  });

  test("viewer's direct API write is blocked by RLS", async ({ request }) => {
    test.fixme(
      true,
      "Awaits /dev/login session cookie + properties table from properties capability.",
    );

    // Pseudocode once enabled:
    //   const res = await request.post("/api/properties", { data: {...} });
    //   expect(res.status()).toBeGreaterThanOrEqual(400);
    //   expect(await res.text()).toContain("row-level security");
    expect(true).toBe(true);
  });
});
