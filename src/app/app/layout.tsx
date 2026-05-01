import type { ReactNode } from "react";
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
 * Memberships are pre-fetched here once and passed down through
 * <ActiveHouseholdProvider>. Pages that need the "zero memberships ⇒
 * onboarding" redirect (design D7) call it themselves; the layout
 * cannot do it generically because /app/onboarding must remain
 * reachable when the user has zero households.
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
