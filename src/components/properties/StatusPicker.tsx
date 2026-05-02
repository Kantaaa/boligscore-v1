"use client";

import { useEffect, useRef } from "react";

import type { PropertyStatus } from "@/lib/properties/types";

import { StatusBadge } from "./StatusBadge";

/**
 * Tiny popover-style picker used by the inline status badge on the
 * Oversikt tab and the property card. Renders all available statuses
 * (global + household-specific) and closes on selection or backdrop
 * click.
 *
 * Mobile / desktop presentation per design D5: bottom sheet on small
 * viewports (sm:hidden anchor), centered popover on larger ones. The
 * implementation is a simple modal-overlay approach that works on both.
 */
interface StatusPickerProps {
  statuses: PropertyStatus[];
  currentStatusId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (statusId: string) => void;
}

export function StatusPicker({
  statuses,
  currentStatusId,
  open,
  onClose,
  onSelect,
}: StatusPickerProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Velg status"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md rounded-t-2xl bg-surface p-5 shadow-elevated sm:rounded-2xl"
      >
        <h3 className="font-headline text-lg font-bold text-fg">Velg status</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {statuses.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(s.id);
                  onClose();
                }}
                aria-pressed={s.id === currentStatusId}
                className={[
                  "rounded-full",
                  s.id === currentStatusId ? "ring-2 ring-primary" : "",
                ].join(" ")}
              >
                <StatusBadge status={s} variant="inline" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-touch rounded-md px-4 text-fg hover:bg-surface-raised"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
