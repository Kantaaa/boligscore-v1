import { notFound } from "next/navigation";

import { OversiktView } from "@/components/properties/OversiktView";
import type { HouseholdRole } from "@/lib/households/types";
import { getImageSrc, isExternalImageUrl } from "@/lib/properties/imageUrl";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getComparison } from "@/server/comparison";
import { getProperty } from "@/server/properties/getProperty";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";
import { listStatuses } from "@/server/properties/listStatuses";

/**
 * Property detail Oversikt tab — server-fetches the property, status,
 * the available statuses for inline editing, and the comparison totals
 * (Felles / Din) so the user sees the headline number without jumping
 * to the Sammenligning tab.
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

  // Fetch the comparison totals — best-effort. If the function fails
  // for whatever reason we just hide the strip.
  const cmpResult = await getComparison(property.id);
  const totals = cmpResult.ok
    ? {
        fellesTotal: cmpResult.data.felles_total,
        yourTotal: cmpResult.data.your_total,
        memberCount: cmpResult.data.member_count,
      }
    : null;

  // Pre-resolve the image source server-side so the first paint
  // doesn't need a roundtrip to sign the Storage URL.
  const supabase = createSupabaseServerClient();
  const imageSrc = await getImageSrc(supabase, property.image_url);
  const hasUploadedImage =
    property.image_url != null && !isExternalImageUrl(property.image_url);

  return (
    <OversiktView
      property={property}
      status={status}
      statuses={statuses}
      myRole={myRole}
      addedByEmail={added_by_email}
      totals={totals}
      imageSrc={imageSrc}
      hasUploadedImage={hasUploadedImage}
    />
  );
}
