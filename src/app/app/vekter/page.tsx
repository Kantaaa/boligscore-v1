import { redirect } from "next/navigation";

import { VekterClient } from "@/components/weights/VekterClient";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";
import {
  getCriteria,
  getHouseholdWeights,
  getUserWeights,
} from "@/server/weights";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Vekter page (`/app/vekter`) — owned by the `weights` capability.
 *
 * Server-fetches the criteria catalogue, the household's felles
 * weights, and the caller's personal weights, then hands off to a
 * client component for the segmented control + sliders + reset
 * confirmation.
 *
 * Households contract: zero-membership users are bounced to
 * /app/onboarding from the protected layout. We mirror the check
 * here for direct visits during transient state.
 */
export default async function VekterPage() {
  const householdsResult = await listMyHouseholds();
  if (householdsResult.ok && householdsResult.data.length === 0) {
    redirect("/app/onboarding");
  }
  const memberships = householdsResult.ok ? householdsResult.data : [];
  const initialHouseholdId = memberships[0]?.id ?? null;

  if (!initialHouseholdId) {
    return null;
  }

  // Resolve the caller's auth.uid() server-side so we can pass it to
  // getUserWeights without a separate round-trip.
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/logg-inn?next=%2Fapp%2Fvekter");
  }

  const [catalogResult, fellesResult, personalResult] = await Promise.all([
    getCriteria(),
    getHouseholdWeights(initialHouseholdId),
    getUserWeights(initialHouseholdId, user.id),
  ]);

  const catalog = catalogResult.ok
    ? catalogResult.data
    : { sections: [], criteria: [] };
  const felles = fellesResult.ok ? fellesResult.data : [];
  const personal = personalResult.ok ? personalResult.data : [];

  return (
    <VekterClient
      catalog={catalog}
      initialFelles={felles}
      initialPersonal={personal}
      initialHouseholdId={initialHouseholdId}
    />
  );
}
