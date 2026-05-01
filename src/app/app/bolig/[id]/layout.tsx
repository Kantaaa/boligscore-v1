import type { ReactNode } from "react";

import { PropertyTabs } from "@/components/shell/PropertyTabs";

/**
 * Property detail layout. Renders the tab strip and slots the active
 * tab's page below it (design D6 — nested routes per tab).
 */
export default function PropertyDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  return (
    <section aria-label="Bolig" className="space-y-4">
      <PropertyTabs propertyId={params.id} />
      {children}
    </section>
  );
}
