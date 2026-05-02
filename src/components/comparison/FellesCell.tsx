"use client";

import { useState } from "react";

import { chipPickerDefault } from "@/lib/comparison/math";
import type { ComparisonRow } from "@/lib/comparison/types";

import { ChipPickerPopover } from "./ChipPickerPopover";

interface FellesCellProps {
  row: ComparisonRow;
  /** True for viewer — cell is non-interactive. */
  readOnly: boolean;
  onSetFelles: (score: number) => void;
  onClearFelles: () => void;
}

/**
 * Felles column cell. Three rendering modes:
 *
 *  1. `felles_set` is true — show the felles_score in primary color
 *     (committed value).
 *  2. `felles_set` is false but a placeholder exists (snitt or own
 *     score) — show the placeholder in muted text with a small dotted
 *     underline (signals "default — not yet committed").
 *  3. nothing to show — render `—`.
 *
 *  Tap behaviour:
 *  - readOnly viewer: no popover; cell is a plain span.
 *  - owner/member: tap → opens <ChipPickerPopover>. Selecting a chip
 *    fires onSetFelles, parent closes popover. The popover offers a
 *    "Fjern felles" button that calls onClearFelles.
 */
export function FellesCell({
  row,
  readOnly,
  onSetFelles,
  onClearFelles,
}: FellesCellProps) {
  const [open, setOpen] = useState(false);
  const placeholder = chipPickerDefault(row);
  const showsCommittedFelles = row.felles_set && row.felles_score !== null;
  const showsPlaceholder = !showsCommittedFelles && placeholder !== null;
  const ariaLabel = `Felles for ${row.criterion_label}`;

  function handleSelect(score: number) {
    setOpen(false);
    onSetFelles(score);
  }

  function handleClear() {
    setOpen(false);
    onClearFelles();
  }

  if (readOnly) {
    return (
      <span
        className={[
          "text-center tabular-nums",
          showsCommittedFelles
            ? "text-fg font-semibold"
            : "text-fg-muted",
        ].join(" ")}
        data-testid={`felles-${row.criterion_key}`}
        aria-label={`${ariaLabel} (lesetilgang)`}
      >
        {showsCommittedFelles
          ? row.felles_score
          : showsPlaceholder
            ? placeholder
            : "—"}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        data-testid={`felles-${row.criterion_key}`}
        className={[
          "min-h-touch min-w-touch rounded-md px-2 text-center tabular-nums",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          showsCommittedFelles
            ? "bg-primary/10 font-semibold text-primary hover:bg-primary/20"
            : showsPlaceholder
              ? "border border-dashed border-border text-fg-muted hover:bg-surface-raised"
              : "border border-dashed border-border text-fg-muted hover:bg-surface-raised",
        ].join(" ")}
      >
        {showsCommittedFelles
          ? row.felles_score
          : showsPlaceholder
            ? placeholder
            : "—"}
      </button>

      {open ? (
        <ChipPickerPopover
          ariaLabel={ariaLabel}
          value={
            showsCommittedFelles
              ? (row.felles_score as number)
              : placeholder
          }
          onSelect={handleSelect}
          onDismiss={() => setOpen(false)}
          onClear={showsCommittedFelles ? handleClear : undefined}
        />
      ) : null}
    </>
  );
}
