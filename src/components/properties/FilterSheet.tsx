"use client";

import { useEffect, useState } from "react";

import type {
  PropertyFilters,
  PropertyStatus,
} from "@/lib/properties/types";

import { StatusBadge } from "./StatusBadge";

/**
 * Filter UI rendered as a bottom sheet on mobile and a popover-styled
 * modal on desktop (D5). Collects status / price / BRA / område and
 * calls back with the updated filters.
 */
interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  statuses: PropertyStatus[];
  current: PropertyFilters;
  onApply: (next: PropertyFilters) => void;
}

export function FilterSheet({
  open,
  onClose,
  statuses,
  current,
  onApply,
}: FilterSheetProps) {
  const [draft, setDraft] = useState<PropertyFilters>(current);

  useEffect(() => {
    setDraft(current);
  }, [current, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function toggleStatus(id: string) {
    const set = new Set(draft.statusIds ?? []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setDraft({ ...draft, statusIds: Array.from(set) });
  }

  function clear() {
    setDraft({});
  }

  function apply() {
    onApply(draft);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filtrer boliger"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-t-lg border border-border bg-surface p-4 shadow-xl sm:rounded-lg">
        <h3 className="text-base font-semibold">Filtrer</h3>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium">Status</legend>
          <ul className="flex flex-wrap gap-2">
            {statuses.map((s) => {
              const active = (draft.statusIds ?? []).includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggleStatus(s.id)}
                    aria-pressed={active}
                    className={[
                      "rounded-full",
                      active ? "ring-2 ring-primary" : "",
                    ].join(" ")}
                  >
                    <StatusBadge status={s} variant="inline" />
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <fieldset className="mt-4 grid grid-cols-2 gap-2">
          <legend className="col-span-2 text-sm font-medium">
            Pris (NOK)
          </legend>
          <NumberField
            label="Fra"
            value={draft.priceMin ?? null}
            onChange={(v) => setDraft({ ...draft, priceMin: v })}
          />
          <NumberField
            label="Til"
            value={draft.priceMax ?? null}
            onChange={(v) => setDraft({ ...draft, priceMax: v })}
          />
        </fieldset>

        <fieldset className="mt-4 grid grid-cols-2 gap-2">
          <legend className="col-span-2 text-sm font-medium">BRA (m²)</legend>
          <NumberField
            label="Fra"
            value={draft.braMin ?? null}
            onChange={(v) => setDraft({ ...draft, braMin: v })}
          />
          <NumberField
            label="Til"
            value={draft.braMax ?? null}
            onChange={(v) => setDraft({ ...draft, braMax: v })}
          />
        </fieldset>

        <fieldset className="mt-4">
          <label className="block text-sm font-medium" htmlFor="filter-area">
            Område (i adresse)
          </label>
          <input
            id="filter-area"
            type="text"
            value={draft.area ?? ""}
            onChange={(e) => setDraft({ ...draft, area: e.target.value })}
            className="mt-1 w-full min-h-touch rounded-md border border-border bg-surface px-3 text-fg"
          />
        </fieldset>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={clear}
            className="min-h-touch rounded-md px-4 text-fg hover:bg-surface-raised"
          >
            Nullstill
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-touch rounded-md px-4 text-fg hover:bg-surface-raised"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={apply}
            className="min-h-touch rounded-md bg-primary px-4 text-primary-fg"
          >
            Bruk
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-fg-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        onChange={(e) => {
          const t = e.target.value.trim();
          if (t === "") return onChange(null);
          const n = Number(t);
          onChange(Number.isFinite(n) ? n : null);
        }}
        className="mt-1 w-full min-h-touch rounded-md border border-border bg-surface px-3 text-fg"
      />
    </label>
  );
}
