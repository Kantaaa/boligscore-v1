"use client";

import { useEffect, useRef } from "react";

interface QuickAction {
  /** Visible label, e.g. "Bruk min" or "Bruk Kanta sin". */
  label: string;
  /** Score that fires onSelect when this action is tapped. Null hides the action. */
  score: number | null;
}

interface ChipPickerPopoverProps {
  /** Currently-highlighted value in the picker (existing felles or snitt). */
  value: number | null;
  /** Called when the user taps a chip. The popover should close after. */
  onSelect: (next: number) => void;
  /** Called when the user taps outside or presses Escape. */
  onDismiss: () => void;
  /** Accessible name for the dialog (e.g. "Felles for Kjøkken"). */
  ariaLabel: string;
  /** Optional clear button — fires on tap. Hidden when undefined. */
  onClear?: () => void;
  /**
   * Optional quick-action shortcuts shown above the chip grid. Each
   * one calls `onSelect(score)` when tapped. Items with `score === null`
   * are skipped (e.g. the partner action when the partner hasn't scored
   * the criterion). User feedback: many couples won't want to negotiate
   * a felles score — they want to keep one person's score as felles
   * directly. These shortcuts make that one tap.
   */
  quickActions?: QuickAction[];
}

/**
 * Compact chip-picker rendered as a floating popover above the matrix
 * (D8 — popover, not full chip-rad). Eleven chips arranged 6+5,
 * touch-friendly with chips ≥ 44px.
 *
 * Behaviour:
 *   - Tap a chip → fires onSelect(n); parent closes the popover.
 *   - Tap outside → fires onDismiss; no save.
 *   - Press Escape → fires onDismiss; no save.
 *   - When `onClear` is provided, a "Fjern felles" button is shown so
 *     the user can revert to the snitt placeholder.
 */
export function ChipPickerPopover({
  value,
  onSelect,
  onDismiss,
  ariaLabel,
  onClear,
  quickActions,
}: ChipPickerPopoverProps) {
  const visibleQuickActions = (quickActions ?? []).filter(
    (a): a is QuickAction & { score: number } => a.score !== null,
  );
  const ref = useRef<HTMLDivElement | null>(null);

  // Escape + click-outside dismisses without save.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    function onPointer(e: PointerEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    }
    document.addEventListener("keydown", onKey);
    // Use pointerdown so it fires before any synthetic click on a chip
    // inside the popover. We check containment, so internal taps are
    // not affected.
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onDismiss]);

  // Modal-style backdrop dismisses on click. We render it under a
  // <div role="dialog"> so screen readers announce the popover.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-fg/30"
        onClick={onDismiss}
      />
      <div
        ref={ref}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-surface p-5 shadow-elevated"
        data-testid="chip-picker-popover"
      >
        <p className="mb-3 font-headline text-base font-bold text-fg">
          Velg felles score
        </p>

        {visibleQuickActions.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {visibleQuickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => onSelect(a.score)}
                className="min-h-touch rounded-full bg-primary-container px-4 text-sm font-medium text-primary-container-fg transition hover:brightness-95"
              >
                {a.label} ({a.score})
              </button>
            ))}
          </div>
        ) : null}

        {/* Chips 1-10 in 5×2 grid. 0 was removed from the picker per
           user feedback — same reason as ScoreChipRow. */}
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const selected = value === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Felles: ${n}`}
                onClick={() => onSelect(n)}
                className={[
                  "min-h-touch rounded-md px-2 py-2 text-sm font-medium tabular-nums",
                  "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selected
                    ? "bg-primary text-primary-fg shadow-sm"
                    : "bg-surface-strong text-fg-muted hover:bg-surface-stronger hover:text-fg",
                ].join(" ")}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="min-h-touch rounded-full px-4 text-sm font-medium text-danger hover:bg-status-bud-inne/15"
            >
              Fjern felles
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-touch rounded-full px-4 text-sm font-medium text-fg hover:bg-surface-muted"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
