import { OnboardingClient } from "@/components/households/OnboardingClient";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";

export const dynamic = "force-dynamic";

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
 * Users who already have memberships still see this page (e.g.
 * triggered by the switcher's "Opprett ny husholdning") — it just
 * funnels them through the same form.
 */
export default async function OnboardingPage() {
  const memberships = await listMyHouseholds();
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || "";

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
