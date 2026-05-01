"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { HouseholdSummary } from "@/lib/households/types";

/**
 * Active-household state lives client-side (design D5). The provider
 * is mounted in the protected /app shell and given the user's full
 * memberships list (server-fetched). The active id is persisted in
 * `localStorage.boligscore.activeHouseholdId`.
 *
 * On mount, the rules from the spec apply:
 *   1. If localStorage holds a valid id (still in memberships), use it.
 *   2. Otherwise pick the membership with the most recent last_accessed_at
 *      (which falls back to joined_at on first login since they're equal).
 *   3. If memberships is empty, expose `activeHouseholdId = null` and the
 *      shell-level redirect to /app/onboarding kicks in elsewhere.
 */

const STORAGE_KEY = "boligscore.activeHouseholdId";

interface ActiveHouseholdContextValue {
  activeHouseholdId: string | null;
  memberships: HouseholdSummary[];
  setActiveHousehold: (id: string) => void;
}

const ActiveHouseholdContext =
  createContext<ActiveHouseholdContextValue | null>(null);

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function writeStored(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* swallow — private browsing, etc. */
  }
}

function pickFallback(memberships: HouseholdSummary[]): string | null {
  if (memberships.length === 0) return null;
  // memberships are pre-sorted by last_accessed_at DESC server-side,
  // so the head is the most recent. Defensive sort kept here so the
  // hook is correct regardless of caller ordering.
  const sorted = [...memberships].sort((a, b) =>
    b.last_accessed_at.localeCompare(a.last_accessed_at),
  );
  return sorted[0]!.id;
}

export function ActiveHouseholdProvider({
  memberships,
  children,
}: {
  memberships: HouseholdSummary[];
  children: ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Resolve initial active id after mount (so SSR/CSR don't disagree).
  useEffect(() => {
    const ids = new Set(memberships.map((m) => m.id));
    const stored = readStored();
    if (stored && ids.has(stored)) {
      setActiveId(stored);
      return;
    }
    const fallback = pickFallback(memberships);
    setActiveId(fallback);
    writeStored(fallback);
  }, [memberships]);

  // If the active id ever points to a household no longer in memberships
  // (e.g. user was removed in another tab), recover by picking the next
  // best fallback.
  useEffect(() => {
    if (activeId === null) return;
    const ids = new Set(memberships.map((m) => m.id));
    if (!ids.has(activeId)) {
      const next = pickFallback(memberships);
      setActiveId(next);
      writeStored(next);
    }
  }, [activeId, memberships]);

  const setActiveHousehold = useCallback((id: string) => {
    setActiveId(id);
    writeStored(id);
  }, []);

  const value = useMemo<ActiveHouseholdContextValue>(
    () => ({
      activeHouseholdId: activeId,
      memberships,
      setActiveHousehold,
    }),
    [activeId, memberships, setActiveHousehold],
  );

  return (
    <ActiveHouseholdContext.Provider value={value}>
      {children}
    </ActiveHouseholdContext.Provider>
  );
}

/**
 * Read the active household id and a setter from React context.
 * Safe to call from any client component nested under the protected
 * app shell.
 */
export function useActiveHousehold(): ActiveHouseholdContextValue {
  const ctx = useContext(ActiveHouseholdContext);
  if (!ctx) {
    throw new Error(
      "useActiveHousehold() called outside <ActiveHouseholdProvider>",
    );
  }
  return ctx;
}

/** Exported for tests. */
export const ACTIVE_HOUSEHOLD_STORAGE_KEY = STORAGE_KEY;
