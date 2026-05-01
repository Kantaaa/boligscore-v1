"use server";

import type {
  ActionResult,
  ListPropertiesInput,
  PropertyListRow,
} from "@/lib/properties/types";
import { err, ok } from "@/lib/properties/types";

import { requireUser } from "./_auth";

/**
 * Return the active household's properties via `get_property_list()`.
 *
 * The DB function does the joins and derived totals (D3); this action
 * just funnels filters/search/sort into the appropriate PostgREST
 * conditions.
 *
 * Sort persistence (localStorage) is handled client-side per the spec
 * — this action accepts the sort key from the caller.
 */
export async function listProperties(
  input: ListPropertiesInput,
): Promise<ActionResult<PropertyListRow[]>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx.data;

  const { data, error } = await supabase.rpc("get_property_list", {
    p_household_id: input.householdId,
    p_user_id: user.id,
  });

  if (error) return err(error.message);

  const rows = (data ?? []) as PropertyListRow[];
  const filtered = applyFilters(rows, input);
  const sorted = applySort(filtered, input.sort ?? "felles");
  return ok(sorted);
}

function applyFilters(
  rows: PropertyListRow[],
  input: ListPropertiesInput,
): PropertyListRow[] {
  const f = input.filters ?? {};
  const search = (input.search ?? "").trim().toLowerCase();
  const area = (f.area ?? "").trim().toLowerCase();
  return rows.filter((r) => {
    if (f.statusIds && f.statusIds.length > 0) {
      if (!f.statusIds.includes(r.status_id)) return false;
    }
    if (f.priceMin != null && (r.price == null || r.price < f.priceMin)) {
      return false;
    }
    if (f.priceMax != null && (r.price == null || r.price > f.priceMax)) {
      return false;
    }
    if (f.braMin != null && (r.bra == null || r.bra < f.braMin)) {
      return false;
    }
    if (f.braMax != null && (r.bra == null || r.bra > f.braMax)) {
      return false;
    }
    if (area.length > 0) {
      if (!r.address.toLowerCase().includes(area)) return false;
    }
    if (search.length > 0) {
      if (!r.address.toLowerCase().includes(search)) return false;
    }
    return true;
  });
}

function applySort(
  rows: PropertyListRow[],
  sort: NonNullable<ListPropertiesInput["sort"]>,
): PropertyListRow[] {
  const copy = rows.slice();
  switch (sort) {
    case "price":
      copy.sort((a, b) => nullsLast(a.price, b.price, (x, y) => x - y));
      break;
    case "newest":
      copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
    case "your":
      copy.sort((a, b) => nullsLast(a.your_total, b.your_total, (x, y) => y - x));
      break;
    case "felles":
    default:
      copy.sort((a, b) => nullsLast(a.felles_total, b.felles_total, (x, y) => y - x));
      break;
  }
  return copy;
}

function nullsLast<T>(
  a: T | null,
  b: T | null,
  cmp: (x: T, y: T) => number,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return cmp(a, b);
}
