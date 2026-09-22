// Zoeken en rangschikken van soorten. Werkt volledig lokaal op de
// IndexedDB-inhoud en is los testbaar via rankSpecies.

import { db } from '../db';
import type { Species } from '../types';
import { normalizeName } from './speciesLogic';

export const MAX_RESULTS = 30;

/**
 * Rangschikt soorten op relevantie voor een zoekterm:
 * 1. exacte soortnaam
 * 2. soortnaam begint met de zoekterm
 * 3. genus exact
 * 4. overige gedeeltelijke matches (naam, genus, familie)
 */
export function rankSpecies(all: Species[], term: string): Species[] {
  const q = normalizeName(term);
  if (!q) return [];

  const scored: { s: Species; score: number }[] = [];
  for (const s of all) {
    const name = s.normalizedName;
    const genus = s.genus.toLowerCase();
    const family = s.family.toLowerCase();

    let score = -1;
    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (genus === q) score = 2;
    else if (name.includes(q) || genus.includes(q) || family.includes(q)) score = 3;

    if (score >= 0) scored.push({ s, score });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return a.s.scientificName.localeCompare(b.s.scientificName);
  });

  return scored.slice(0, MAX_RESULTS).map((x) => x.s);
}

/** Voert een zoekopdracht uit tegen de volledige soortentabel. */
export async function searchSpecies(term: string): Promise<Species[]> {
  if (!term.trim()) return [];
  const all = await db.species.toArray();
  return rankSpecies(all, term);
}
