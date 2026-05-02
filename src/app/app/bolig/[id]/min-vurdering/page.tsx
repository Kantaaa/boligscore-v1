import { notFound } from "next/navigation";

import { TotalscoreStrip } from "@/components/comparison/TotalscoreStrip";
import { FaktaSection } from "@/components/scoring/FaktaSection";
import { MinVurderingClient } from "@/components/scoring/MinVurderingClient";
import type { HouseholdRole } from "@/lib/households/types";
import { getComparison } from "@/server/comparison";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";
import {
  getMyNotes,
  getMyScores,
  getPropertyWithScores,
} from "@/server/scoring";
import { getCriteria } from "@/server/weights";

/**
 * Min vurdering tab — server-fetches:
 *   - the property + counters via `get_property_with_scores`,
 *   - the 22-criterion catalog (cached lookup) via `getCriteria`,
 *   - the caller's existing scores + section notes,
 *   - the caller's role in the property's household (drives readOnly).
 *
 * Hands off to `<MinVurderingClient>` for interaction. The Fakta panel
 * is a server component (read-only) rendered above the client tree.
 */
export default async function MinVurderingPage({
  params,
}: {
  params: { id: string };
}) {
  const propertyResult = await getPropertyWithScores(params.id);
  if (!propertyResult.ok) {
    notFound();
  }
  const property = propertyResult.data;

  const [
    catalogResult,
    scoresResult,
    notesResult,
    householdsResult,
    cmpResult,
  ] = await Promise.all([
    getCriteria(),
    getMyScores(params.id),
    getMyNotes(params.id),
    listMyHouseholds(),
    getComparison(params.id),
  ]);

  if (!catalogResult.ok) {
    return (
      <article className="space-y-2">
        <p role="alert" className="text-sm text-fg">
          Kunne ikke laste kriterier — prøv å oppdatere siden.
        </p>
      </article>
    );
  }

  const memberships = householdsResult.ok ? householdsResult.data : [];
  const myMembership = memberships.find((m) => m.id === property.household_id);
  const myRole: HouseholdRole = myMembership?.role ?? "viewer";
  const readOnly = myRole === "viewer";

  const initialScores = scoresResult.ok ? scoresResult.data : [];
  const initialNotes = notesResult.ok ? notesResult.data : [];

  const totals = cmpResult.ok
    ? {
        fellesTotal: cmpResult.data.felles_total,
        yourTotal: cmpResult.data.your_total,
        memberCount: cmpResult.data.member_count,
      }
    : null;

  return (
    <article className="space-y-4">
      {totals ? (
        <TotalscoreStrip
          fellesTotal={totals.fellesTotal}
          yourTotal={totals.yourTotal}
          memberCount={totals.memberCount}
        />
      ) : null}
      <FaktaSection
        price={property.price}
        bra={property.bra}
        yearBuilt={property.year_built}
      />
      <MinVurderingClient
        property={property}
        catalog={catalogResult.data}
        initialScores={initialScores}
        initialNotes={initialNotes}
        readOnly={readOnly}
      />
    </article>
  );
}
