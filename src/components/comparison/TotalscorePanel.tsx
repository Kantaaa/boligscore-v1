"use client";

import {
  NOT_ENOUGH_DATA_MESSAGE,
  formatMissingFellesWarning,
} from "@/lib/comparison/types";

interface TotalscorePanelProps {
  fellesTotal: number | null;
  yourTotal: number | null;
  partnerTotal: number | null;
  partnerName: string | null;
  /** Number of criteria with no felles_score row. */
  missingFelles: number;
  /** Number of members in the household — drives variant. */
  memberCount: number;
}

/**
 * Top-of-page totalscore panel.
 *
 *  - Two-member: hero `Felles: 78`, smaller `Din: 76` and
 *    `<partnerName>: 82`. Warning row when `missingFelles > 0`.
 *  - Single-member: hero `Din total: 76` only. Felles and partner
 *    omitted (D5).
 *  - 3+ member: `Felles: 78` and `Din: 76` only — no per-partner
 *    numbers (D9, simplified).
 *
 *  Spec scenarios covered:
 *   - "Two-member household, fully scored"
 *   - "Missing felles scores"
 *   - "All-zero weights graceful display" — felles_total = null →
 *     renders `Ikke nok data`; warning row is suppressed because the
 *     bigger problem (no weights) is the actionable one.
 *   - "Single-member household totalscore panel"
 */
export function TotalscorePanel({
  fellesTotal,
  yourTotal,
  partnerTotal,
  partnerName,
  missingFelles,
  memberCount,
}: TotalscorePanelProps) {
  const isSingleMember = memberCount === 1;
  const isTwoMember = memberCount === 2;

  // When the felles total is null (all-zero weights), the warning row
  // about missing felles scores is redundant — suppress it.
  const showWarning = !isSingleMember && missingFelles > 0 && fellesTotal !== null;

  // Single-member: only "Din total" hero, no felles, no partner.
  if (isSingleMember) {
    return (
      <section
        aria-label="Totalscore"
        className="space-y-3 rounded-lg border border-border bg-surface p-4"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-fg-muted">Din total:</span>
          <span
            className="text-3xl font-bold tabular-nums text-fg"
            data-testid="din-total"
          >
            {yourTotal !== null ? yourTotal : NOT_ENOUGH_DATA_MESSAGE}
          </span>
          {yourTotal !== null ? (
            <span className="text-sm text-fg-muted">/100</span>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Totalscore"
      className="space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-col items-baseline gap-1">
        <span className="text-sm font-medium text-fg-muted">Felles</span>
        <div className="flex items-baseline gap-2">
          <span
            className="text-4xl font-bold tabular-nums text-fg"
            data-testid="felles-total"
          >
            {fellesTotal !== null ? fellesTotal : NOT_ENOUGH_DATA_MESSAGE}
          </span>
          {fellesTotal !== null ? (
            <span className="text-base text-fg-muted">/100</span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-fg-muted">Din:</span>
          <span
            className="text-base font-semibold tabular-nums text-fg"
            data-testid="din-total"
          >
            {yourTotal !== null ? yourTotal : NOT_ENOUGH_DATA_MESSAGE}
          </span>
        </div>
        {isTwoMember && partnerName ? (
          <div className="flex items-baseline gap-2">
            <span className="text-fg-muted">{partnerName}:</span>
            <span
              className="text-base font-semibold tabular-nums text-fg"
              data-testid="partner-total"
            >
              {partnerTotal !== null
                ? partnerTotal
                : NOT_ENOUGH_DATA_MESSAGE}
            </span>
          </div>
        ) : null}
      </div>

      {showWarning ? (
        <p
          role="status"
          className="rounded-md border border-status-bud-inne/40 bg-status-bud-inne/10 px-3 py-2 text-sm text-fg"
          data-testid="missing-felles-warning"
        >
          {formatMissingFellesWarning(missingFelles)}
        </p>
      ) : null}
    </section>
  );
}
