"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Minimal modal primitive used by destructive confirmations
 * (delete household, leave household, remove member). Conventions.md
 * says: modals only for destructive confirmations — everything else
 * uses inline messaging or bottom sheets.
 *
 * Closes on Escape and on backdrop click. Focus trapping is
 * intentionally light: most modals here have at most three focusable
 * elements, so we rely on the browser's default tab order.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
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
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}
