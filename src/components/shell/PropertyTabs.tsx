"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PropertyTab {
  /** Last segment of the route, e.g. `oversikt`. */
  slug: string;
  /** UI label, Norwegian bokmål. */
  label: string;
}

/**
 * Stable tab order. Slugs are part of the public URL contract — renaming
 * one is a breaking change and must come with a redirect migration note.
 * (See `openspec/changes/navigation-shell/design.md` D6.)
 */
const TABS: PropertyTab[] = [
  { slug: "oversikt", label: "Oversikt" },
  { slug: "min-vurdering", label: "Min vurdering" },
  { slug: "sammenligning", label: "Sammenligning" },
  { slug: "kommentarer", label: "Kommentarer" },
  { slug: "notater", label: "Notater" },
];

interface PropertyTabsProps {
  /** Property id from the route segment, used to build hrefs. */
  propertyId: string;
}

/**
 * Underline-style tab strip rendered above the property detail content.
 * Horizontally scrollable on mobile when the labels overflow. Active
 * state is derived from the URL (the source of truth — design D6).
 */
export function PropertyTabs({ propertyId }: PropertyTabsProps) {
  const pathname = usePathname() ?? "";

  return (
    <div
      role="tablist"
      aria-label="Boligfaner"
      className="sticky top-16 z-20 -mx-4 mb-6 overflow-x-auto bg-surface-raised hide-scrollbar"
    >
      <ul className="flex min-w-max gap-6 px-4 sm:px-6">
        {TABS.map((tab) => {
          const href = `/app/bolig/${propertyId}/${tab.slug}`;
          const active = pathname.startsWith(href);
          return (
            <li key={tab.slug}>
              <Link
                href={href}
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex min-h-touch items-center whitespace-nowrap py-3 text-sm transition",
                  "border-b-2",
                  active
                    ? "border-primary font-bold text-primary"
                    : "border-transparent font-medium text-fg-muted hover:text-fg",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
