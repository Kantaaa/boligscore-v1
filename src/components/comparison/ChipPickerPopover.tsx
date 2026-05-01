"use client";

import { useEffect, useRef } from "react";

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
}: ChipPickerPopoverProps) {
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
        className="relative z-10 w-full max-w-sm rounded-lg border border-border bg-surface p-4 shadow-xl"
        data-testid="chip-picker-popover"
      >
        <p className="mb-3 text-sm font-medium text-fg">Velg felles score</p>
        {/* 6 chips top, 5 chips bottom */}
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => {
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
                  "min-h-touch rounded-md border px-2 py-2 text-sm font-medium tabular-nums",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selected
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-border bg-surface text-fg hover:bg-surface-raised",
                ].join(" ")}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="min-h-touch rounded-md px-3 text-sm text-status-bud-inne hover:bg-status-bud-inne/10"
            >
              Fjern felles
            </button>
          ) : null}
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-touch rounded-md px-3 text-sm text-fg hover:bg-surface-raised"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
