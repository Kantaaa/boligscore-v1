import { notFound } from "next/navigation";

import { OversiktView } from "@/components/properties/OversiktView";
import type { HouseholdRole } from "@/lib/households/types";
import { getProperty } from "@/server/properties/getProperty";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";
import { listStatuses } from "@/server/properties/listStatuses";

/**
 * Property detail Oversikt tab — server-fetches the property, status,
 * and the available statuses for inline editing. Hands off to the
 * OversiktView client component.
 *
 * The protected layout already enforces auth + onboarding redirects;
 * here we only need to handle "row hidden by RLS" by returning 404.
 */
export default async function OversiktPage({
  params,
}: {
  params: { id: string };
}) {
  const propResult = await getProperty(params.id);
  if (!propResult.ok) {
    notFound();
  }
  const { property, status, added_by_email } = propResult.data;

  const householdsResult = await listMyHouseholds();
  const memberships = householdsResult.ok ? householdsResult.data : [];
  const myMembership = memberships.find((m) => m.id === property.household_id);
  const myRole: HouseholdRole = myMembership?.role ?? "viewer";

  const statusesResult = await listStatuses(property.household_id);
  const statuses = statusesResult.ok ? statusesResult.data : [status];

  return (
    <OversiktView
      property={property}
      status={status}
      statuses={statuses}
      myRole={myRole}
      addedByEmail={added_by_email}
    />
  );
}
