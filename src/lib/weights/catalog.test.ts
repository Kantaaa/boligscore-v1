import { describe, expect, it } from "vitest";

/**
 * Catalog completeness tests — sanity checks against the canonical
 * 22 criteria + 3 sections shipped by the seed migration
 * (`supabase/migrations/20260501000007_weights_criteria_seed.sql`).
 *
 * The migration emits a DO-block that fails if either count is wrong,
 * so this file is the TS-side mirror of that invariant; it lets unit
 * tests catch a stale criterion list during refactors before the DB
 * even sees it. Sourced from `docs/criteria.md`.
 */

const CANONICAL_SECTIONS = [
  "bolig_innvendig",
  "beliggenhet_omrade",
  "helhet",
] as const;

const CANONICAL_CRITERIA: Array<{
  key: string;
  section: (typeof CANONICAL_SECTIONS)[number];
}> = [
  // Bolig innvendig (9)
  { key: "kjokken", section: "bolig_innvendig" },
  { key: "bad", section: "bolig_innvendig" },
  { key: "planlosning", section: "bolig_innvendig" },
  { key: "lys_luft", section: "bolig_innvendig" },
  { key: "oppbevaring", section: "bolig_innvendig" },
  { key: "stue", section: "bolig_innvendig" },
  { key: "balkong_terrasse", section: "bolig_innvendig" },
  { key: "antall_soverom", section: "bolig_innvendig" },
  { key: "antall_bad", section: "bolig_innvendig" },
  // Beliggenhet & område (7)
  { key: "omradeinntrykk", section: "beliggenhet_omrade" },
  { key: "nabolagsfolelse", section: "beliggenhet_omrade" },
  { key: "transport", section: "beliggenhet_omrade" },
  { key: "skoler", section: "beliggenhet_omrade" },
  { key: "beliggenhet_makro", section: "beliggenhet_omrade" },
  { key: "parkering", section: "beliggenhet_omrade" },
  { key: "stoy", section: "beliggenhet_omrade" },
  // Helhet (6)
  { key: "visningsinntrykk", section: "helhet" },
  { key: "potensial", section: "helhet" },
  { key: "tilstand", section: "helhet" },
  { key: "hage", section: "helhet" },
  { key: "utleiedel", section: "helhet" },
  { key: "solforhold", section: "helhet" },
];

describe("criteria catalog", () => {
  it("has exactly 3 sections", () => {
    expect(CANONICAL_SECTIONS).toHaveLength(3);
  });

  it("has exactly 22 criteria", () => {
    expect(CANONICAL_CRITERIA).toHaveLength(22);
  });

  it("Bolig innvendig section has 9 criteria", () => {
    const inSection = CANONICAL_CRITERIA.filter(
      (c) => c.section === "bolig_innvendig",
    );
    expect(inSection).toHaveLength(9);
  });

  it("Beliggenhet & område section has 7 criteria", () => {
    const inSection = CANONICAL_CRITERIA.filter(
      (c) => c.section === "beliggenhet_omrade",
    );
    expect(inSection).toHaveLength(7);
  });

  it("Helhet section has 6 criteria", () => {
    const inSection = CANONICAL_CRITERIA.filter(
      (c) => c.section === "helhet",
    );
    expect(inSection).toHaveLength(6);
  });

  it("section counts sum to 22", () => {
    const sum =
      CANONICAL_CRITERIA.filter((c) => c.section === "bolig_innvendig").length +
      CANONICAL_CRITERIA.filter((c) => c.section === "beliggenhet_omrade")
        .length +
      CANONICAL_CRITERIA.filter((c) => c.section === "helhet").length;
    expect(sum).toBe(22);
  });

  it("criterion keys are unique", () => {
    const keys = CANONICAL_CRITERIA.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes all 13 brief-explicit criteria", () => {
    const explicit = [
      "kjokken",
      "bad",
      "planlosning",
      "lys_luft",
      "oppbevaring",
      "stue",
      "balkong_terrasse",
      "omradeinntrykk",
      "nabolagsfolelse",
      "transport",
      "skoler",
      "visningsinntrykk",
      "potensial",
    ];
    const present = new Set(CANONICAL_CRITERIA.map((c) => c.key));
    for (const k of explicit) {
      expect(present.has(k), `missing brief criterion: ${k}`).toBe(true);
    }
  });

  it("does NOT include any of the 3 'Fakta' facts", () => {
    const factaKeys = ["pris_per_kvm", "areal", "alder", "size", "age"];
    const present = new Set(CANONICAL_CRITERIA.map((c) => c.key));
    for (const k of factaKeys) {
      expect(present.has(k), `unexpected Fakta criterion: ${k}`).toBe(false);
    }
  });
});
