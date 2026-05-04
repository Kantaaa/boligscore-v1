import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";

import { extractEnergimerke, extractFromText } from "./extractEnergimerke";

describe("extractEnergimerke — text patterns", () => {
  it("parses 'Energimerking: A - Mørkegrønn'", () => {
    expect(extractFromText("Energimerking: A - Mørkegrønn")).toEqual({
      letter: "A",
      color: "dark_green",
    });
  });

  it("parses real FINN format 'Energimerking: E - Oransje'", () => {
    expect(extractFromText("Energimerking: E - Oransje")).toEqual({
      letter: "E",
      color: "orange",
    });
  });

  it.each([
    ["B - Lysegrønn", "B", "light_green"],
    ["C - Gul", "C", "yellow"],
    ["G - Rød", "G", "red"],
  ])("parses 'Energimerking: %s'", (suffix, letter, color) => {
    expect(extractFromText(`Energimerking: ${suffix}`)).toEqual({
      letter,
      color,
    });
  });

  it("returns letter only when color is missing", () => {
    expect(extractFromText("Energimerking: D")).toEqual({
      letter: "D",
      color: null,
    });
  });

  it("ignores 'Energimerking' followed by descriptive text (no rating)", () => {
    // FINN sometimes shows the heading "Energimerking" above an explanatory
    // paragraph "Energiattesten utgjør…" — the negative lookahead must
    // prevent matching the leading 'E' of "Energiattesten".
    const text =
      "Energimerking\nEnergiattesten utgjør en del av informasjonen kjøper får.";
    expect(extractFromText(text)).toEqual({ letter: null, color: null });
  });

  it("returns nulls when no Energimerking text present", () => {
    expect(extractFromText("Random unrelated content")).toEqual({
      letter: null,
      color: null,
    });
  });

  it("accepts English snake_case color words as a fallback", () => {
    expect(extractFromText("Energimerking: B - light_green")).toEqual({
      letter: "B",
      color: "light_green",
    });
  });

  it("returns letter + null color when color word is unrecognized", () => {
    expect(extractFromText("Energimerking: F - bluebellish")).toEqual({
      letter: "F",
      color: null,
    });
  });
});

describe("extractEnergimerke — DOM", () => {
  it("scans body text via Cheerio root", () => {
    const $ = cheerio.load(
      `<html><body><section><p>Energimerking: B - Lysegrønn</p></section></body></html>`,
    );
    expect(extractEnergimerke($)).toEqual({
      letter: "B",
      color: "light_green",
    });
  });

  it("returns nulls when body lacks any Energimerking marker", () => {
    const $ = cheerio.load(`<html><body><h1>Storgata 1</h1></body></html>`);
    expect(extractEnergimerke($)).toEqual({ letter: null, color: null });
  });
});
