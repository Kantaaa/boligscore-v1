"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Native `<input type="range">` styled with Tailwind. The thumb is at
 * least 44×44px to satisfy the touch-target floor (conventions.md).
 *
 * Eager-save semantics (D10): the parent passes a `commit` callback.
 * We call it on `pointerup`/`touchend`/`change` (settle) — the last
 * value the user lands on is what gets persisted. We also debounce
 * keyboard arrow-key changes so holding the arrow doesn't fire one
 * server action per key event.
 */
interface WeightSliderProps {
  value: number;
  onCommit: (newValue: number) => void;
  /** Disabled state for viewers (read-only). */
  disabled?: boolean;
  /** ID for the visually-hidden label association. */
  inputId: string;
  /** Accessible name (criterion label). */
  ariaLabel: string;
  /** Show "lagret" pulse when this becomes true. */
  savedFlash?: boolean;
}

const KEYBOARD_DEBOUNCE_MS = 250;

export function WeightSlider({
  value,
  onCommit,
  disabled = false,
  inputId,
  ariaLabel,
  savedFlash = false,
}: WeightSliderProps) {
  // Local state so the thumb tracks the pointer in real time without
  // round-tripping every microsecond. We commit on release.
  const [localValue, setLocalValue] = useState<number>(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactingRef = useRef(false);

  // Sync from props when the parent updates (e.g. after a reset).
  useEffect(() => {
    if (interactingRef.current) return;
    setLocalValue(value);
  }, [value]);

  // Cleanup pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function commitNow(next: number) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (next !== value) {
      onCommit(next);
    }
  }

  function scheduleCommit(next: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      commitNow(next);
    }, KEYBOARD_DEBOUNCE_MS);
  }

  return (
    <div className="flex items-center gap-3">
      <input
        id={inputId}
        type="range"
        min={0}
        max={10}
        step={1}
        disabled={disabled}
        value={localValue}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={localValue}
        onPointerDown={() => {
          interactingRef.current = true;
        }}
        onPointerUp={() => {
          interactingRef.current = false;
          commitNow(localValue);
        }}
        onPointerCancel={() => {
          interactingRef.current = false;
        }}
        onTouchEnd={() => {
          interactingRef.current = false;
          commitNow(localValue);
        }}
        onChange={(e) => {
          const next = Number(e.target.value);
          setLocalValue(next);
          // Keyboard arrow keys also fire change but no pointer events;
          // debounce so holding an arrow doesn't spam the server.
          scheduleCommit(next);
        }}
        className={[
          "vekter-slider min-w-0 flex-1",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].join(" ")}
      />
      <span
        className={[
          "min-w-[2.5rem] text-right tabular-nums text-sm font-medium",
          savedFlash ? "vekter-saved text-primary" : "text-fg",
        ].join(" ")}
        aria-live="polite"
      >
        {savedFlash ? (
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>✓</span>
            <span className="sr-only">lagret</span>
            <span aria-hidden>{localValue}</span>
          </span>
        ) : (
          <span>{localValue}</span>
        )}
      </span>
    </div>
  );
}
