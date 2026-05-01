"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { useActiveHousehold } from "@/components/households/ActiveHouseholdProvider";
import { canWrite } from "@/lib/households/roles";
import type {
  PropertyFilters,
  PropertyListRow,
  PropertySort,
  PropertyStatus,
} from "@/lib/properties/types";
import { listProperties } from "@/server/properties/listProperties";

import { FAB } from "./FAB";
import { FilterSheet } from "./FilterSheet";
import { PropertyCard } from "./PropertyCard";

const SORT_STORAGE_KEY = "boligscore.propertySort";

const SORT_OPTIONS: { value: PropertySort; label: string }[] = [
  { value: "felles", label: "Felles total" },
  { value: "price", label: "Pris" },
  { value: "newest", label: "Nyeste først" },
  { value: "your", label: "Din score" },
];

interface PropertyListClientProps {
  initialRows: PropertyListRow[];
  statuses: PropertyStatus[];
  /** Active household id at SSR time (so the first paint matches). */
  initialHouseholdId: string | null;
}

/**
 * Client wrapper for `/app`. Owns the search/sort/filter state and
 * refetches via the listProperties server action when state changes.
 *
 * Sort persists per active household in localStorage (spec scenario
 * "Sort persists"). On first render we pick the stored value if any.
 */
export function PropertyListClient({
  initialRows,
  statuses,
  initialHouseholdId,
}: PropertyListClientProps) {
  const { activeHouseholdId, memberships } = useActiveHousehold();
  const householdId = activeHouseholdId ?? initialHouseholdId;
  const myRole =
    memberships.find((m) => m.id === householdId)?.role ?? null;
  const canCreate = myRole !== null && canWrite(myRole);

  const [rows, setRows] = useState<PropertyListRow[]>(initialRows);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<PropertySort>("felles");
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [_pending, startTransition] = useTransition();
  void _pending;
  const [error, setError] = useState<string | null>(null);

  // Hydrate the saved sort from localStorage once we know which
  // household is active (sort key is per-household).
  useEffect(() => {
    if (typeof window === "undefined" || !householdId) return;
    try {
      const raw = window.localStorage.getItem(
        `${SORT_STORAGE_KEY}.${householdId}`,
      );
      if (raw && SORT_OPTIONS.some((o) => o.value === raw)) {
        setSort(raw as PropertySort);
      }
    } catch {
      /* ignore */
    }
  }, [householdId]);

  // Debounce the search input by 250ms (spec).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Refetch when any input changes.
  useEffect(() => {
    if (!householdId) return;
    let cancelled = false;
    startTransition(async () => {
      const r = await listProperties({
        householdId,
        sort,
        filters,
        search: debouncedSearch,
      });
      if (cancelled) return;
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setRows(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [householdId, sort, filters, debouncedSearch]);

  // Persist sort.
  useEffect(() => {
    if (typeof window === "undefined" || !householdId) return;
    try {
      window.localStorage.setItem(
        `${SORT_STORAGE_KEY}.${householdId}`,
        sort,
      );
    } catch {
      /* ignore */
    }
  }, [sort, householdId]);

  const activeFilterChips = useMemo(
    () => buildFilterChips(filters, statuses),
    [filters, statuses],
  );

  const isEmpty = rows.length === 0;
  const hasAnyFilter =
    debouncedSearch.length > 0 ||
    (filters.statusIds && filters.statusIds.length > 0) ||
    filters.priceMin != null ||
    filters.priceMax != null ||
    filters.braMin != null ||
    filters.braMax != null ||
    (filters.area && filters.area.length > 0);

  return (
    <section
      aria-labelledby="boliger-heading"
      className="relative space-y-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 id="boliger-heading" className="text-2xl font-semibold">
          Boliger
        </h1>
      </header>

      <div className="space-y-2">
        <label htmlFor="property-search" className="sr-only">
          Søk etter adresse
        </label>
        <input
          id="property-search"
          type="search"
          inputMode="search"
          placeholder="Søk etter adresse"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-h-touch rounded-md border border-border bg-surface px-3 text-fg"
        />

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-fg-muted">
            <span>Sortering:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as PropertySort)}
              className="min-h-touch rounded-md border border-border bg-surface px-2 text-sm text-fg"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="min-h-touch rounded-md border border-border bg-surface px-3 text-sm"
          >
            Filtrer
          </button>
        </div>

        {activeFilterChips.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Aktive filtre">
            {activeFilterChips.map((chip) => (
              <li key={chip.key}>
                <button
                  type="button"
                  onClick={() => setFilters(chip.removeFrom(filters))}
                  className="inline-flex min-h-touch items-center gap-2 rounded-full border border-border bg-surface-raised px-3 text-xs text-fg"
                >
                  <span>{chip.label}</span>
                  <span aria-hidden>×</span>
                  <span className="sr-only">Fjern filter</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setFilters({})}
                className="min-h-touch rounded-full px-3 text-xs text-primary hover:bg-primary/10"
              >
                Fjern filtre
              </button>
            </li>
          </ul>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-status-bud-inne">{error}</p>
      ) : null}

      {isEmpty && hasAnyFilter ? (
        <NoResultsState
          onClear={() => {
            setFilters({});
            setSearch("");
          }}
        />
      ) : isEmpty ? (
        <EmptyState canCreate={canCreate} />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <PropertyCard row={row} />
            </li>
          ))}
        </ul>
      )}

      {canCreate ? <FAB href="/app/bolig/ny" label="Ny bolig" /> : null}

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        statuses={statuses}
        current={filters}
        onApply={(next) => setFilters(next)}
      />
    </section>
  );
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface p-8 text-center">
      <div aria-hidden className="text-5xl">🏡</div>
      <h2 className="text-lg font-semibold">Ingen boliger ennå</h2>
      <p className="max-w-md text-sm text-fg-muted">
        Legg til en bolig for å starte vurderingen sammen med
        husstanden.
      </p>
      {canCreate ? (
        <a
          href="/app/bolig/ny"
          className="mt-2 min-h-touch rounded-md bg-primary px-4 py-2 text-primary-fg"
        >
          + Legg til bolig
        </a>
      ) : null}
    </div>
  );
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface p-8 text-center">
      <h2 className="text-lg font-semibold">
        Ingen boliger matcher filtrene
      </h2>
      <p className="text-sm text-fg-muted">
        Prøv å justere søk eller filtre.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-2 min-h-touch rounded-md border border-border bg-surface px-4 py-2"
      >
        Fjern filtre
      </button>
    </div>
  );
}

interface FilterChip {
  key: string;
  label: string;
  removeFrom: (f: PropertyFilters) => PropertyFilters;
}

function buildFilterChips(
  filters: PropertyFilters,
  statuses: PropertyStatus[],
): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const id of filters.statusIds ?? []) {
    const s = statuses.find((x) => x.id === id);
    if (!s) continue;
    chips.push({
      key: `status:${id}`,
      label: `Status: ${s.label}`,
      removeFrom: (f) => ({
        ...f,
        statusIds: (f.statusIds ?? []).filter((x) => x !== id),
      }),
    });
  }
  if (filters.priceMin != null) {
    chips.push({
      key: "price-min",
      label: `Pris ≥ ${filters.priceMin.toLocaleString("nb-NO")}`,
      removeFrom: (f) => ({ ...f, priceMin: null }),
    });
  }
  if (filters.priceMax != null) {
    chips.push({
      key: "price-max",
      label: `Pris ≤ ${filters.priceMax.toLocaleString("nb-NO")}`,
      removeFrom: (f) => ({ ...f, priceMax: null }),
    });
  }
  if (filters.braMin != null) {
    chips.push({
      key: "bra-min",
      label: `BRA ≥ ${filters.braMin}`,
      removeFrom: (f) => ({ ...f, braMin: null }),
    });
  }
  if (filters.braMax != null) {
    chips.push({
      key: "bra-max",
      label: `BRA ≤ ${filters.braMax}`,
      removeFrom: (f) => ({ ...f, braMax: null }),
    });
  }
  if (filters.area && filters.area.length > 0) {
    chips.push({
      key: "area",
      label: `Område: ${filters.area}`,
      removeFrom: (f) => ({ ...f, area: null }),
    });
  }
  return chips;
}
