import { notFound } from "next/navigation";

import { SammenligningClient } from "@/components/comparison/SammenligningClient";
import type { HouseholdRole } from "@/lib/households/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getHousehold } from "@/server/households/getHousehold";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";
import { getComparison } from "@/server/comparison";

/**
 * Sammenligning tab — server-fetches the comparison payload (one RPC
 * call covers property + threshold + member count + per-row matrix +
 * the three totalscores), resolves member display names so the column
 * headers can render `Ine | Kanta | Snitt | Felles` dynamically, and
 * passes everything to the client component.
 *
 * Variant resolution:
 *   - member_count === 1 → simplified `Kriterium | Din | Felles`.
 *   - member_count === 2 → full matrix.
 *   - member_count >= 3 → simplified (D9 — multi-member matrix is
 *     out of MVP scope).
 *
 * Role resolution: query `listMyHouseholds()` for the active user's
 * role in the property's household. `viewer` → readOnly mode in the
 * Felles cells.
 */
export default async function SammenligningPage({
  params,
}: {
  params: { id: string };
}) {
  const comparisonResult = await getComparison(params.id);
  if (!comparisonResult.ok) {
    notFound();
  }
  const data = comparisonResult.data;

  const supabase = createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const currentUserId = u.user?.id ?? "";

  const [householdsResult, householdResult] = await Promise.all([
    listMyHouseholds(),
    getHousehold(data.household_id),
  ]);

  const memberships = householdsResult.ok ? householdsResult.data : [];
  const myMembership = memberships.find((m) => m.id === data.household_id);
  const myRole: HouseholdRole = myMembership?.role ?? "viewer";
  const readOnly = myRole === "viewer";

  // Resolve member display names. The `getHousehold` action enriches
  // with email when the service-role key is configured; in dev without
  // it, emails are null and we fall back to the user_id prefix (same
  // pattern as HusstandClient).
  const members = householdResult.ok ? householdResult.data.members : [];
  const youName = displayNameFromMembers(members, currentUserId) ?? "Du";
  const partnerName = data.partner_user_id
    ? displayNameFromMembers(members, data.partner_user_id) ?? "Partner"
    : null;

  return (
    <SammenligningClient
      initialData={data}
      yourName={youName}
      partnerName={partnerName}
      readOnly={readOnly}
    />
  );
}

/**
 * Look up a member's display name (email if present, else the first
 * 8 chars of their user_id with an ellipsis). Mirrors HusstandClient.
 */
function displayNameFromMembers(
  members: ReadonlyArray<{ user_id: string; email: string | null }>,
  userId: string | null,
): string | null {
  if (!userId) return null;
  const member = members.find((m) => m.user_id === userId);
  if (!member) return null;
  if (member.email) {
    // Trim the @domain so the column header stays readable on mobile.
    const at = member.email.indexOf("@");
    return at > 0 ? member.email.slice(0, at) : member.email;
  }
  return `${member.user_id.slice(0, 8)}…`;
}
