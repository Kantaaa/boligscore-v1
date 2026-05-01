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
      className="-mx-4 mb-4 overflow-x-auto border-b border-border"
    >
      <ul className="flex min-w-max gap-1 px-4">
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
                  "inline-flex min-h-touch items-center px-3 py-2 text-sm",
                  "border-b-2 -mb-px",
                  active
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-fg-muted hover:text-fg",
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
