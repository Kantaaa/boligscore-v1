"use client";

import { useEffect, useRef, useState } from "react";

import {
  NOTES_SAVED_LABEL,
  NOTES_SAVING_LABEL,
} from "@/lib/scoring/types";

const IDLE_DEBOUNCE_MS = 1000;
const SAVED_FLASH_MS = 1500;

type SaveState = "idle" | "saving" | "saved" | "error";

interface SectionNotesProps {
  /** Initial body from the server. */
  initialBody: string;
  /** True for viewers — textarea read-only. */
  readOnly?: boolean;
  /** Accessible name (section label). */
  ariaLabel: string;
  /**
   * Async save callback. Returns null on success or an error message
   * on failure (parent translates RLS / network errors as needed).
   */
  onSave: (body: string) => Promise<string | null>;
}

/**
 * One textarea per section. Autosaves on:
 *   - blur (immediate save), and
 *   - 1-second idle while typing (debounced).
 *
 * Indicator shows "lagrer..." during the in-flight request and
 * "lagret" briefly afterwards (D8). A failed save shows an inline
 * error; the user keeps their typed content (we don't roll back the
 * textarea text — that would be hostile).
 */
export function SectionNotes({
  initialBody,
  readOnly = false,
  ariaLabel,
  onSave,
}: SectionNotesProps) {
  const [body, setBody] = useState(initialBody);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>(initialBody);
  const inFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (flashRef.current) clearTimeout(flashRef.current);
    };
  }, []);

  async function commit(next: string) {
    if (next === lastSavedRef.current) return;
    if (inFlightRef.current) {
      // Coalesce: re-schedule once the in-flight save returns.
      // Simplest: leave debounce running so the next interval picks
      // up the latest value.
      return;
    }
    inFlightRef.current = true;
    setState("saving");
    setError(null);
    const result = await onSave(next);
    inFlightRef.current = false;
    if (result === null) {
      lastSavedRef.current = next;
      setState("saved");
      if (flashRef.current) clearTimeout(flashRef.current);
      flashRef.current = setTimeout(() => {
        setState((s) => (s === "saved" ? "idle" : s));
      }, SAVED_FLASH_MS);
    } else {
      setState("error");
      setError(result);
    }
  }

  function scheduleSave(next: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      commit(next);
    }, IDLE_DEBOUNCE_MS);
  }

  function handleBlur() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    commit(body);
  }

  return (
    <div className="space-y-2">
      <textarea
        aria-label={ariaLabel}
        value={body}
        readOnly={readOnly}
        rows={3}
        placeholder={readOnly ? undefined : "Skriv en kort huskelapp …"}
        onChange={(e) => {
          const next = e.target.value;
          setBody(next);
          if (!readOnly) scheduleSave(next);
        }}
        onBlur={() => {
          if (!readOnly) handleBlur();
        }}
        className={[
          "min-h-[5.5rem] w-full resize-y rounded-lg bg-surface-muted px-4 py-3 text-sm text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          readOnly ? "cursor-default opacity-80" : "",
        ].join(" ")}
      />
      <div className="flex items-center justify-between text-xs">
        <span className="text-fg-muted">
          Privat — kun synlig for deg.
        </span>
        <span aria-live="polite" className="tabular-nums">
          {state === "saving" ? (
            <span className="text-fg-muted">{NOTES_SAVING_LABEL}</span>
          ) : null}
          {state === "saved" ? (
            <span className="text-primary">✓ {NOTES_SAVED_LABEL}</span>
          ) : null}
          {state === "error" && error ? (
            <span role="alert" className="text-danger">
              {error}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
