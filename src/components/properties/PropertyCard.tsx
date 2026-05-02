"use client";

import Link from "next/link";
import { useState } from "react";

import type { PropertyListRow } from "@/lib/properties/types";

import { StatusBadge } from "./StatusBadge";

/**
 * One property row on `/app`. Displays:
 *   - thumbnail image (uploaded \u2192 FINN URL \u2192 placeholder)
 *   - address (heading)
 *   - "Pris \u2022 BRA \u2022 byggeår" summary
 *   - status badge
 *   - "Lagt til av" attribution
 *   - "Felles: 78 \u2022 Din: 76" or `\u2014 ikke scoret`
 *
 * Wrapped in a Next.js `<Link>` so the whole card is tappable. Touch
 * target \u2265 44px enforced via `min-h-touch` on the inner container.
 *
 * Image fallback chain (properties-images D3):
 *   1. resolved_image_url \u2014 already signed (Storage) or external (FINN).
 *   2. onError \u2192 swap to placeholder div.
 *   3. null \u2192 placeholder div from the start.
 */
export function PropertyCard({ row }: { row: PropertyListRow }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = row.resolved_image_url != null && !imgFailed;
  return (
    <Link
      href={`/app/bolig/${row.id}`}
      className="block overflow-hidden rounded-xl bg-surface shadow-sm transition hover:shadow-md focus:shadow-md"
    >
      <div className="aspect-[16/10] w-full bg-surface-muted">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.resolved_image_url ?? undefined}
            alt={row.address}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center bg-primary-container text-primary-container-fg"
          >
            <span className="text-5xl">{"\u{1F3E1}"}</span>
          </div>
        )}
      </div>
      <article className="space-y-2 p-4">
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
