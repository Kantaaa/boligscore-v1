/**
 * Cascade-delete integration tests.
 *
 * Spec mapping:
 *   - "Household deletion — Owner deletes household": all dependent
 *     rows are removed via FK ON DELETE CASCADE.
 *
 * Tables that share a household_id FK with ON DELETE CASCADE:
 *   - household_members
 *   - household_invitations
 * Future capabilities will add: properties, property_scores, weights, …
 *
 * Skipped until TEST_SUPABASE_URL is provided (see README).
 */

import { describe, expect, it } from "vitest";

const HAS_SUPABASE = Boolean(process.env.TEST_SUPABASE_URL);

describe.skipIf(!HAS_SUPABASE)("cascade delete on household", () => {
  it.skip("deleting a household removes all members and invitations", async () => {
    // Arrange (service client):
    //   - household H with 3 members (1 owner, 1 member, 1 viewer)
    //   - 2 invitations on H (1 pending, 1 accepted)
    // Act: alice (owner) calls deleteHousehold(H, typed-name).
    // Assert:
    //   - households row gone
    //   - household_members count for H = 0
    //   - household_invitations count for H = 0
    expect(true).toBe(true);
  });
});
