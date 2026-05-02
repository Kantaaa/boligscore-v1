"use client";

import { NOT_ENOUGH_DATA_MESSAGE } from "@/lib/comparison/types";

interface TotalscoreStripProps {
  /** Felles total — null in single-member households or when all weights are 0. */
  fellesTotal: number | null;
  /** Viewer's own total — null when nothing scored or all weights 0. */
  yourTotal: number | null;
  /** Member count — drives whether to render felles. */
  memberCount: number;
}

/**
 * Compact horizontal totalscore strip for use outside the Sammenligning
 * tab — Oversikt header, Min vurdering Fakta, etc. Shows
 *   Felles: 78 • Din: 76
 * (with /100 suffix on the felles, since that's the "official" score).
 *
 * In single-member households felles is hidden — only Din is shown.
 *
 * Each segment links to /sammenligning so users can jump from the
 * summary into the full matrix without navigating manually.
 */
export function TotalscoreStrip({
  fellesTotal,
  yourTotal,
  memberCount,
}: TotalscoreStripProps) {
  const isSingleMember = memberCount === 1;

  return (
    <div
      role="group"
      aria-label="Totalscore"
      className="flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-xl bg-surface px-4 py-3 shadow-sm"
    >
      {!isSingleMember ? (
        <div className="flex items-baseline gap-2">
          <span className="text-xs uppercase tracking-wide text-fg-muted">
            Felles
          </span>
          <span
            className="font-headline text-2xl font-extrabold tabular-nums text-primary"
            data-testid="totalscore-strip-felles"
          >
            {fellesTotal !== null ? fellesTotal : NOT_ENOUGH_DATA_MESSAGE}
          </span>
          {fellesTotal !== null ? (
            <span className="text-xs text-fg-muted">/100</span>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-wide text-fg-muted">
          Din
        </span>
        <span
          className="font-headline text-xl font-bold tabular-nums text-fg"
          data-testid="totalscore-strip-din"
        >
          {yourTotal !== null ? yourTotal : NOT_ENOUGH_DATA_MESSAGE}
        </span>
      </div>
    </div>
  );
}
