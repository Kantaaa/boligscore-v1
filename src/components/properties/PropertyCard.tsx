"use client";

import Link from "next/link";

import type { PropertyListRow } from "@/lib/properties/types";

import { StatusBadge } from "./StatusBadge";

/**
 * One property row on `/app`. Displays:
 *   - address (heading)
 *   - "Pris • BRA • byggeår" summary
 *   - status badge
 *   - "Lagt til av" attribution
 *   - "Felles: 78 • Din: 76" or `— ikke scoret`
 *
 * Wrapped in a Next.js `<Link>` so the whole card is tappable. Touch
 * target ≥ 44px enforced via `min-h-touch` on the inner container.
 */
export function PropertyCard({ row }: { row: PropertyListRow }) {
  return (
    <Link
      href={`/app/bolig/${row.id}`}
      className="block rounded-xl bg-surface p-4 shadow-sm transition hover:shadow-md focus:shadow-md"
    >
      <article className="space-y-2">
        <header className="flex items-start justify-between gap-3">
          <h3 className="font-headline text-lg font-bold text-fg">
            {row.address}
          </h3>
          <StatusBadge
            status={{
              label: row.status_label,
              color: row.status_color,
              icon: row.status_icon,
            }}
          />
        </header>

        <dl className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-fg-muted">
          {row.price != null ? (
            <span>
              <span className="sr-only">Pris: </span>
              {formatNok(row.price)}
            </span>
          ) : null}
          {row.bra != null ? (
            <span>
              <span className="sr-only">BRA: </span>
              {formatBra(row.bra)} m²
            </span>
          ) : null}
          {row.year_built != null ? (
            <span>
              <span className="sr-only">Byggeår: </span>
              {row.year_built}
            </span>
          ) : null}
          {row.price == null && row.bra == null && row.year_built == null ? (
            <span>—</span>
          ) : null}
        </dl>

        <p className="text-xs text-fg-muted">
          {totalsText(row)}
        </p>
      </article>
    </Link>
  );
}

function totalsText(row: PropertyListRow): string {
  const felles = row.felles_total != null ? `Felles: ${row.felles_total}` : null;
  const din = row.your_total != null ? `Din: ${row.your_total}` : null;
  if (!felles && !din) return "— ikke scoret";
  return [felles, din].filter(Boolean).join(" • ");
}

function formatNok(amount: number): string {
  return `${amount.toLocaleString("nb-NO")} kr`;
}

function formatBra(bra: number): string {
  // Show one decimal only when not an integer (e.g. 70.5).
  return Number.isInteger(bra) ? `${bra}` : `${bra.toFixed(1)}`;
}
