"use server";

import type {
  ActionResult,
  CriteriaCatalog,
  Criterion,
  CriterionSection,
} from "@/lib/weights/types";
import { err, ok } from "@/lib/weights/types";

import { requireUser } from "./_auth";

/**
 * Returns the canonical 22-criterion catalogue + 3 sections, in the
 * canonical sort order for both. Every authenticated user can read
 * (RLS policy `criteria_select` / `criterion_sections_select`).
 */
export async function getCriteria(): Promise<ActionResult<CriteriaCatalog>> {
  const ctx = await requireUser();
  if (!ctx.ok) return ctx;
  const { supabase } = ctx.data;

  const [sectionsRes, criteriaRes] = await Promise.all([
    supabase
      .from("criterion_sections")
      .select("id, key, label, description, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("criteria")
      .select("id, key, section_id, label, description, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  if (sectionsRes.error) return err(sectionsRes.error.message);
  if (criteriaRes.error) return err(criteriaRes.error.message);

  return ok({
    sections: (sectionsRes.data ?? []) as CriterionSection[],
    criteria: (criteriaRes.data ?? []) as Criterion[],
  });
}
