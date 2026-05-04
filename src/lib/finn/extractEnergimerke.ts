import type * as cheerio from "cheerio";

import type { EnergimerkeColor, EnergimerkeLetter } from "./types";

export interface EnergimerkeResult {
  letter: EnergimerkeLetter | null;
  color: EnergimerkeColor | null;
}

const NORWEGIAN_TO_COLOR: Record<string, EnergimerkeColor> = {
  // Norwegian color words FINN renders next to the letter
  "mørkegrønn": "dark_green",
  "mørke grønn": "dark_green",
  "lysegrønn": "light_green",
  "lyse grønn": "light_green",
  "gul": "yellow",
  "oransje": "orange",
  "rød": "red",
  // English snake_case fallbacks (in case FINN ever ships them, or future JSON-LD)
  "dark_green": "dark_green",
  "light_green": "light_green",
  "yellow": "yellow",
  "orange": "orange",
  "red": "red",
};

// Match e.g. "Energimerking: E - Oransje" or "Energimerking E" (letter only).
// The negative lookahead after the letter prevents matching "Energimerking\nEnergiattesten…"
// where the next char "n" is part of a different word.
const ENERGIMERKE_RE =
  /Energimerking[:\s]+([A-G])(?![a-zæøåA-ZÆØÅ])(?:\s*[-–—]\s*([A-Za-zæøåÆØÅ_ ]+))?/u;

export function extractEnergimerke(
  $: cheerio.CheerioAPI,
): EnergimerkeResult {
  // TODO(monitoring): emit a log when body has "Energimerking" but the
  // regex below returns null — likely indicates FINN changed the format.
  const text = $("body").text();
  return extractFromText(text);
}

export function extractFromText(text: string): EnergimerkeResult {
  const m = text.match(ENERGIMERKE_RE);
  if (!m) return { letter: null, color: null };
  const letter = m[1]!.toUpperCase() as EnergimerkeLetter;
  let color: EnergimerkeColor | null = null;
  if (m[2]) {
    const colorWord = m[2].trim().toLowerCase();
    color = NORWEGIAN_TO_COLOR[colorWord] ?? null;
  }
  return { letter, color };
}
