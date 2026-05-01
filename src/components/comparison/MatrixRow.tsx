"use client";

import { isDisagreement } from "@/lib/comparison/math";
import type { ComparisonRow } from "@/lib/comparison/types";

import { FellesCell } from "./FellesCell";

interface MatrixRowProps {
  row: ComparisonRow;
  /** True for two-member households — render full 5-column matrix. */
  isFullMatrix: boolean;
  threshold: number;
  readOnly: boolean;
  onSetFelles: (score: number) => void;
  onClearFelles: () => void;
}

/**
 * A single row in the comparison matrix.
 *
 *  Two-member: Kriterium | Din | Partner | Snitt | Felles
 *  Single / 3+: Kriterium | Din | Felles
 *
 *  Disagreement highlight (D7-spec): when |your − partner| ≥ threshold,
 *  the row gets a soft-yellow background. Highlight applies only to
 *  the full matrix variant (no partner score in single/3+).
 *
 *  Cells render `—` when the underlying value is null (unscored or
 *  no-partner case).
 */
export function MatrixRow({
  row,
  isFullMatrix,
  threshold,
  readOnly,
  onSetFelles,
  onClearFelles,
}: MatrixRowProps) {
  const flagged = isFullMatrix
    ? isDisagreement(row.your_score, row.partner_score, threshold)
    : false;

  return (
    <li
      data-criterion-key={row.criterion_key}
      data-disagreement={flagged ? "true" : "false"}
      className={[
        "grid items-center gap-2 px-2 py-2 text-sm",
        isFullMatrix
          ? "grid-cols-[2fr_repeat(4,minmax(0,1fr))]"
          : "grid-cols-[2fr_minmax(0,1fr)_minmax(0,1fr)]",
        flagged
          // Soft-yellow disagreement highlight. Uses a Tailwind utility
          // chain that's defensible in both light/dark themes.
          ? "rounded-md bg-amber-100/60 dark:bg-amber-300/10"
          : "",
      ].join(" ")}
    >
      <span className="truncate text-fg">{row.criterion_label}</span>
      <span
        className="text-center tabular-nums text-fg"
        data-testid={`your-score-${row.criterion_key}`}
      >
        {formatScore(row.your_score)}
      </span>
      {isFullMatrix ? (
        <>
          <span
            className="text-center tabular-nums text-fg"
            data-testid={`partner-score-${row.criterion_key}`}
          >
            {formatScore(row.partner_score)}
          </span>
          <span
            className="text-center tabular-nums text-fg-muted"
            data-testid={`snitt-${row.criterion_key}`}
          >
            {formatScore(row.snitt)}
          </span>
        </>
      ) : null}
      <FellesCell
        row={row}
        readOnly={readOnly}
        onSetFelles={onSetFelles}
        onClearFelles={onClearFelles}
      />
    </li>
  );
}

function formatScore(value: number | null): string {
  return value === null ? "—" : String(value);
}
