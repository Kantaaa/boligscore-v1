import Link from "next/link";

/**
 * Header for the protected /app shell.
 *
 * Left:  app brand (links to /app forsiden).
 * Right: <HouseholdSwitcher /> — owned by the `households` capability;
 *        rendered as a placeholder slot until that capability lands.
 */
export function AppShellHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-4">
        <Link
          href="/app"
          className="inline-flex min-h-touch items-center text-base font-semibold text-fg"
        >
          Boligscore
        </Link>

        {/*
          TODO(households): replace with <HouseholdSwitcher /> once the
          households capability ships. Should render a chip with the active
          household name and a dropdown for switch / "Opprett ny husholdning".
        */}
        <div
          aria-label="Husholdning-velger (kommer snart)"
          className="inline-flex min-h-touch items-center gap-2 rounded-full border border-border bg-surface-raised px-3 text-sm text-fg-muted"
        >
          <span aria-hidden>🏠</span>
          <span>Husstand</span>
          <span aria-hidden>▾</span>
        </div>
      </div>
    </header>
  );
}
