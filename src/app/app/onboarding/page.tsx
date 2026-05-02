import { redirect } from "next/navigation";

import { OnboardingClient } from "@/components/households/OnboardingClient";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { force?: string | string[] };
}

/**
 * Onboarding page.
 *
 * Always-creates-a-household policy (design D7): a logged-in user who
 * lands here must end up with at least one household. The flow is:
 *
 *   1. enter a name → createHousehold → become owner
 *   2. show invitation CTAs (Kopier lenke / Hopp over)
 *   3. "Hopp over" navigates to /app
 *
 * Reverse guard (auth-onboarding 5.5): users who already have at least
 * one household and visit /app/onboarding directly are redirected to
 * /app. The `?force=1` escape hatch lets the household-switcher's
 * "Opprett ny husholdning" entry land here on purpose.
 */
export default async function OnboardingPage({ searchParams }: PageProps) {
  const memberships = await listMyHouseholds();
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || "";

  const force = searchParams.force === "1";
  if (memberships.ok && memberships.data.length > 0 && !force) {
    redirect("/app");
  }

  return (
    <section
      aria-labelledby="onboarding-heading"
      className="mx-auto max-w-md space-y-6 py-6"
    >
      <header className="space-y-1">
        <h1 id="onboarding-heading" className="text-2xl font-semibold">
          Opprett husholdning
        </h1>
        <p className="text-fg-muted">
          Gi husholdningen et navn, så er du i gang.
        </p>
      </header>

      <OnboardingClient
        origin={origin}
        hasOtherHouseholds={memberships.ok && memberships.data.length > 0}
      />
    </section>
  );
}
