"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavDestination {
  href: string;
  label: string;
  icon: string;
  /**
   * The set of pathnames that should highlight this destination.
   * `match` may be a prefix string or a predicate. Order matters: the
   * first match wins so `/app` (Boliger) only matches when nothing more
   * specific does.
   */
  isActive: (pathname: string) => boolean;
}

const DESTINATIONS: NavDestination[] = [
  {
    href: "/app",
    label: "Boliger",
    icon: "🏘",
    isActive: (p) =>
      p === "/app" || p === "/app/" || p.startsWith("/app/bolig"),
  },
  {
    href: "/app/vekter",
    label: "Vekter",
    icon: "⚖",
    isActive: (p) => p.startsWith("/app/vekter"),
  },
  {
    href: "/app/husstand",
    label: "Husstand",
    icon: "👥",
    isActive: (p) => p.startsWith("/app/husstand"),
  },
  {
    href: "/app/meg",
    label: "Meg",
    icon: "👤",
    isActive: (p) => p.startsWith("/app/meg"),
  },
];

/**
 * Fixed bottom navigation (design D5).
 *
 * Same component on mobile and desktop — on desktop it stays anchored to
 * the viewport bottom inside the centered max-width column. Active state
 * is derived from `usePathname()`. Each item has a 44x44 touch target.
 */
export function BottomNav() {
  const pathname = usePathname() ?? "/app";

  return (
    <nav
      aria-label="Hovednavigasjon"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-surface/95 shadow-bottom-nav backdrop-blur supports-[backdrop-filter]:bg-surface/80"
      style={{ height: "var(--bottom-nav-h)" }}
    >
      <ul className="mx-auto flex h-full max-w-content items-center justify-around px-3">
        {DESTINATIONS.map((dest) => {
          const active = dest.isActive(pathname);
          return (
            <li key={dest.href} className="flex-1">
              <Link
                href={dest.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "mx-auto flex min-h-touch w-full max-w-[88px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide transition",
                  active
                    ? "bg-primary text-primary-fg shadow-sm"
                    : "text-fg-muted opacity-80 hover:opacity-100",
                ].join(" ")}
              >
                <span aria-hidden className="text-lg leading-none">
                  {dest.icon}
                </span>
                <span>{dest.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
