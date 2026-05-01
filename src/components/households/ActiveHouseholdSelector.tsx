"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect } from "react";

import { useActiveHousehold } from "./ActiveHouseholdProvider";

/**
 * Tiny client helper used on pages that depend on a specific
 * household id in their URL (e.g. `/app/husstand?id=…`). Reads the
 * client-side active household and pushes a URL with `?id=<active>`
 * if it differs, so the server component re-renders against the
 * correct household.
 *
 * Render this inside the page next to the `ActiveHouseholdProvider`
 * (the protected app layout already provides the latter).
 */
export function ActiveHouseholdSelector({
  activeIdInUrl,
}: {
  activeIdInUrl: string | null;
}) {
  const { activeHouseholdId } = useActiveHousehold();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!activeHouseholdId) return;
    if (activeHouseholdId === activeIdInUrl) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("id", activeHouseholdId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [activeHouseholdId, activeIdInUrl, pathname, router, searchParams]);

  return null;
}
