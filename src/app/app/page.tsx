// TODO(properties): full implementation — list of household properties + filters + FAB.

import { redirect } from "next/navigation";

import { listMyHouseholds } from "@/server/households/listMyHouseholds";

/**
 * Boliger landing page. Owned by the `properties` capability eventually;
 * for now it shows a placeholder.
 *
 * Households contract (design D7): if the user has zero households,
 * route to /app/onboarding — this is the safest place to enforce the
 * invariant since the protected layout cannot redirect generically
 * without looping the onboarding page itself.
 */
export default async function BoligerPage() {
  const result = await listMyHouseholds();
  if (result.ok && result.data.length === 0) {
    redirect("/app/onboarding");
  }

  return (
    <section aria-labelledby="boliger-heading" className="space-y-4">
      <h1 id="boliger-heading" className="text-2xl font-semibold">
        Boliger
      </h1>
      <p className="text-fg-muted">
        Her vil listen over boliger i husstanden vises.
      </p>
    </section>
  );
}
