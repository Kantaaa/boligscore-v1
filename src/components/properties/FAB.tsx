"use client";

import Link from "next/link";

/**
 * Floating action button on `/app`. Anchored above the bottom nav,
 * lower-right corner. Reachable with one thumb on mobile (spec: FAB).
 *
 * Visibility is decided by the caller (only owner/member render this).
 */
export function FAB({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="fixed right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg transition hover:brightness-110 focus:brightness-110"
      style={{ bottom: "calc(var(--bottom-nav-h) + 16px)" }}
    >
      <span aria-hidden className="text-2xl leading-none">
        +
      </span>
      <span className="sr-only">{label}</span>
    </Link>
  );
}
