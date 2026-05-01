"use client";

interface ScoreChipRowProps {
  /** The current score (0..10), or null if unscored. */
  score: number | null;
  /** True for viewers — chips render disabled. */
  disabled?: boolean;
  /** Accessible name (criterion label). */
  ariaLabel: string;
  /** Tap handler — receives the new score. */
  onSelect: (next: number) => void;
}

/**
 * Chip-rad of 11 buttons (0..10). Touch target ≥ 44×44px per
 * conventions.md.
 *
 * The selected chip fills with the primary color; the rest are
 * outlined. When `disabled`, all chips are non-interactive (viewer
 * mode). When `score` is null, all chips render outlined.
 *
 * Tapping the currently-selected chip ALSO fires `onSelect` — this
 * lets the parent treat double-taps as no-ops at the DB level (the
 * trigger's `OLD.score IS DISTINCT FROM NEW.score` clause filters
 * the no-op out, so no history row is written). Per spec, optimistic
 * UI is unchanged in this case.
 */
export function ScoreChipRow({
  score,
  disabled = false,
  ariaLabel,
  onSelect,
}: ScoreChipRowProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="-mx-1 flex flex-wrap gap-1 px-1"
    >
      {Array.from({ length: 11 }, (_, i) => i).map((n) => {
        const selected = score === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${ariaLabel}: ${n}`}
            disabled={disabled}
            onClick={() => onSelect(n)}
            className={[
              "min-h-touch min-w-touch flex-1 basis-[calc(11.111%-0.25rem)] rounded-md border px-2 py-2 text-sm font-medium tabular-nums",
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              selected
                ? "border-primary bg-primary text-primary-fg"
                : "border-border bg-surface text-fg hover:bg-surface-raised",
              disabled
                ? "cursor-not-allowed opacity-60 hover:bg-surface"
                : "cursor-pointer",
            ].join(" ")}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
