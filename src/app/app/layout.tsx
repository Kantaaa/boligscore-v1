import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ActiveHouseholdProvider } from "@/components/households/ActiveHouseholdProvider";
import { AppShellHeader } from "@/components/shell/AppShellHeader";
import { BottomNav } from "@/components/shell/BottomNav";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { listMyHouseholds } from "@/server/households/listMyHouseholds";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Protected app shell.
 *
 * Layout contract (spec — "Application shell layout"):
 *   - sticky header (with the household-switcher slot)
 *   - main content area, padded so it never sits behind the bottom nav
 *   - fixed bottom nav with four destinations
 *
 * Auth guard: server-side session check. If absent we redirect to
 * /logg-inn?next=<encoded-current-path>. Middleware also enforces this
 * (defence in depth) — see src/middleware.ts.
 *
 * Onboarding guard (auth-onboarding 5.4): if the authenticated user has
 * zero households AND is not currently on /app/onboarding, force them
 * to /app/onboarding. /app/onboarding itself MUST remain reachable so
 * the user can create the first household — that's why we exclude it
 * from the redirect rather than redirecting unconditionally.
 *
 * Memberships are pre-fetched here once and passed down through
 * <ActiveHouseholdProvider>.
 */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // The layout doesn't know the exact path, but middleware will have
    // already produced a precise next= param. The /app fallback is fine
    // for direct, layout-only renders (e.g. tests).
    redirect("/logg-inn?next=%2Fapp");
  }

  const householdsResult = await listMyHouseholds();
  const memberships = householdsResult.ok ? householdsResult.data : [];

  // Onboarding redirect — applied to every /app/* path except onboarding
  // itself. Read the request pathname from middleware's `x-pathname`
  // header (set in src/middleware.ts).
  if (memberships.length === 0) {
    const pathname = headers().get("x-pathname") ?? "";
    if (!pathname.startsWith("/app/onboarding")) {
      redirect("/app/onboarding");
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <OfflineBanner />
      <ActiveHouseholdProvider memberships={memberships}>
        <AppShellHeader />
        <main className="mx-auto max-w-content px-4 pb-bottom-nav pt-4">
          {children}
        </main>
        <BottomNav />
      </ActiveHouseholdProvider>
    </div>
  );
}
