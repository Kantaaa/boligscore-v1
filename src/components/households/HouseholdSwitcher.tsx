"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { touchHousehold } from "@/server/households/touchHousehold";

import { useActiveHousehold } from "./ActiveHouseholdProvider";
import { RoleBadge } from "./RoleBadge";

/**
 * Household switcher chip in the app shell header.
 *
 * Layout:
 *   [🏠] [Active household name]  [▾]
 *
 * Click → dropdown listing all memberships with role badges, plus a
 * "Opprett ny husholdning" link that routes to /app/onboarding.
 *
 * Selecting a household:
 *   1. Updates localStorage via setActiveHousehold (provider).
 *   2. Calls touchHousehold(id) so the next first-login default picks
 *      this one.
 *   3. router.refresh() so server components re-fetch with the new id.
 */
export function HouseholdSwitcher() {
  const { activeHouseholdId, memberships, setActiveHousehold } =
    useActiveHousehold();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active =
    memberships.find((m) => m.id === activeHouseholdId) ?? memberships[0];

  // Empty memberships: render a "Opprett husholdning" CTA chip instead.
  // Onboarding redirect is handled by the layout (per design D7) so this
  // is just a visible affordance.
  if (memberships.length === 0) {
    return (
      <Link
        href="/app/onboarding"
        className="inline-flex min-h-touch items-center gap-2 rounded-full border border-border bg-surface-raised px-3 text-sm text-fg"
      >
        <span aria-hidden>🏠</span>
        <span>Opprett husholdning</span>
      </Link>
    );
  }

  async function handleSelect(id: string) {
    setOpen(false);
    if (id === activeHouseholdId) return;
    setActiveHousehold(id);
    // Best-effort; ignore failure.
    try {
      await touchHousehold(id);
    } catch {
      /* noop */
    }
    router.refresh();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Aktiv husholdning: ${active?.name ?? "ingen"}. Bytt husholdning.`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-touch items-center gap-2 rounded-full border border-border bg-surface-raised px-3 text-sm text-fg hover:bg-surface"
      >
        <span aria-hidden>🏠</span>
        <span className="max-w-[160px] truncate font-medium">
          {active?.name ?? "Velg"}
        </span>
        <span aria-hidden>▾</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {memberships.map((m) => {
              const isActive = m.id === activeHouseholdId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => handleSelect(m.id)}
                    className={[
                      "flex w-full min-h-touch items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                      isActive
                        ? "bg-primary/10 font-semibold text-fg"
                        : "text-fg hover:bg-surface-raised",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span aria-hidden>{isActive ? "●" : "○"}</span>
                      <span className="truncate">{m.name}</span>
                    </span>
                    <RoleBadge role={m.role} />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border">
            <Link
              href="/app/onboarding?force=1"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-touch items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-surface-raised"
            >
              <span aria-hidden>＋</span>
              <span>Opprett ny husholdning</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
