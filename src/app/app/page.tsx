import { redirect } from "next/navigation";

import { PropertyListClient } from "@/components/properties/PropertyListClient";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";
import { listProperties } from "@/server/properties/listProperties";
import { listStatuses } from "@/server/properties/listStatuses";

/**
 * Boliger landing page (`/app`).
 *
 * Owned by the `properties` capability. Server-fetches the initial
 * property list and the available statuses for the active household,
 * then hands off to a client component for search / sort / filter.
 *
 * Households contract (D7): zero-membership users are bounced to
 * /app/onboarding from the protected layout, but we mirror the check
 * here so direct visits during a transient state are safe.
 */
export default async function BoligerPage() {
  const householdsResult = await listMyHouseholds();
  if (householdsResult.ok && householdsResult.data.length === 0) {
    redirect("/app/onboarding");
  }
  const memberships = householdsResult.ok ? householdsResult.data : [];

  // We cannot read `localStorage.activeHouseholdId` on the server.
  // Pick the first (most recently accessed) household for the initial
  // SSR fetch; the client provider will switch to the user's stored
  // active household if different and trigger a refetch.
  const initialHouseholdId = memberships[0]?.id ?? null;

  if (!initialHouseholdId) {
    return null; // redirect above will handle empty case
  }

  const [propertiesResult, statusesResult] = await Promise.all([
    listProperties({ householdId: initialHouseholdId }),
    listStatuses(initialHouseholdId),
  ]);

  const initialRows = propertiesResult.ok ? propertiesResult.data : [];
  const statuses = statusesResult.ok ? statusesResult.data : [];

  return (
    <PropertyListClient
      initialRows={initialRows}
      statuses={statuses}
      initialHouseholdId={initialHouseholdId}
    />
  );
}
