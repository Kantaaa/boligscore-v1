import { redirect } from "next/navigation";

import { NyBoligForm } from "@/components/properties/NyBoligForm";
import { canWrite } from "@/lib/households/roles";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";
import { listStatuses } from "@/server/properties/listStatuses";

/**
 * Ny bolig — full-page form (D10 + spec 5.1).
 *
 * Server-fetches the available statuses for the current active
 * household so the form's status dropdown is populated. Hands off to
 * the NyBoligForm client component for state + submission.
 *
 * Role gating: only owner/member roles may create. Viewers attempting
 * direct navigation are redirected back to /app where the FAB is
 * already hidden for them.
 */
export default async function NyBoligPage() {
  const householdsResult = await listMyHouseholds();
  if (!householdsResult.ok || householdsResult.data.length === 0) {
    redirect("/app/onboarding");
  }
  // Pick the most-recent household for SSR (mirrors /app — the client
  // will switch over to the user's stored active id if different).
  const household = householdsResult.data[0]!;
  if (!canWrite(household.role)) {
    redirect("/app");
  }

  const statusesResult = await listStatuses(household.id);
  const statuses = statusesResult.ok ? statusesResult.data : [];

  return (
    <section aria-labelledby="ny-bolig-heading" className="space-y-4">
      <header>
        <h1 id="ny-bolig-heading" className="text-2xl font-semibold">
          Ny bolig
        </h1>
        <p className="text-sm text-fg-muted">
          Fyll inn det du vet — du kan endre alt senere.
        </p>
      </header>
      <NyBoligForm statuses={statuses} />
    </section>
  );
}
