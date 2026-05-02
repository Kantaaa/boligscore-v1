import Link from "next/link";

import { HouseholdSwitcher } from "@/components/households/HouseholdSwitcher";

/**
 * Header for the protected /app shell.
 *
 * Left:  app brand (links to /app forsiden).
 * Right: <HouseholdSwitcher /> — chip with the active household name and
 *        a dropdown for switch / "Opprett ny husholdning". Memberships
 *        are pre-loaded by the protected layout and passed down through
 *        the <ActiveHouseholdProvider> context.
 */
export function AppShellHeader() {
  return (
    <header className="sticky top-0 z-30 bg-surface-raised/90 backdrop-blur supports-[backdrop-filter]:bg-surface-raised/70">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 sm:px-6">
        <Link
          href="/app"
          className="inline-flex min-h-touch items-center font-headline text-xl font-extrabold tracking-tight text-fg"
        >
          Boligscore
        </Link>
        <HouseholdSwitcher />
      </div>
    </header>
  );
}
