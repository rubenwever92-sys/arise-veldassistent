// Samenvoegen van de ARISE Targetlist met de bestaande (NMV-)soorten.
// Koppelt op de genormaliseerde wetenschappelijke naam en levert daarnaast
// een importcontrole-rapport. Pure functie, los testbaar.

import type { Species } from '../types';
import type { AriseRow } from './import/ariseImport';
import { normalizeName, speciesIdFromName } from './speciesLogic';

export interface ImportControlReport {
  /** ARISE-soorten die exact op een bestaande NMV-soort koppelen. */
  exactMatches: number;
  /** Nieuwe ARISE-soorten die nog niet bestonden. */
  newAriseSpecies: number;
  /** Bestaande NMV-soorten zonder ARISE-match. */
  nmvWithoutArise: string[];
  /** Wetenschappelijke namen die meer dan eens in de ARISE-lijst voorkomen. */
  duplicateNames: string[];
  /** ARISE-soorten met ontbrekende sleutelgegevens (status of genus/familie). */
  missingData: string[];
}

export interface MergeResult {
  species: Species[];
  report: ImportControlReport;
}

/**
 * Voegt ARISE-rijen samen met de bestaande soorten.
 * - Bestaande soorten behouden hun oorspronkelijke wetenschappelijke naam,
 *   nmvPriority en (indien aanwezig) NSR-status.
 * - ARISE levert de actuele status, barcodes, collected en locality.
 * - Collecties, foto's en notities blijven volledig ongemoeid (andere tabellen).
 */
export function mergeSpecies(
  existing: Species[],
  ariseRows: AriseRow[],
  importDateIso: string,
): MergeResult {
  const byName = new Map<string, Species>();
  for (const s of existing) {
    byName.set(s.normalizedName, { ...s });
  }

  const seen = new Set<string>();
  const duplicateSet = new Set<string>();
  const missingData: string[] = [];
  let exactMatches = 0;
  let newAriseSpecies = 0;
  const matchedNames = new Set<string>();

  for (const row of ariseRows) {
    const norm = normalizeName(row.species);
    if (!norm) continue;

    if (seen.has(norm)) {
      duplicateSet.add(row.species);
    }
    seen.add(norm);

    if (!row.speciesStatus || (!row.genus && !row.family)) {
      missingData.push(row.species);
    }

    const current = byName.get(norm);
    if (current) {
      exactMatches++;
      matchedNames.add(norm);
      byName.set(norm, {
        ...current,
        genus: row.genus || current.genus,
        family: row.family || current.family,
        nsrStatus: current.nsrStatus || row.occurrenceStatus,
        ariseStatus: row.speciesStatus || null,
        barcodeAll: row.allBarcodes,
        barcodeArise: row.ariseBarcodes,
        barcodeNonArise: row.otherBarcodes,
        collected: row.collected,
        locality: row.locality,
        lastAriseImport: importDateIso,
        source: 'both',
      });
    } else {
      newAriseSpecies++;
      matchedNames.add(norm);
      byName.set(norm, {
        id: speciesIdFromName(row.species),
        scientificName: row.species,
        normalizedName: norm,
        genus: row.genus,
        family: row.family,
        nsrStatus: row.occurrenceStatus,
        nmvPriority: false,
        ariseStatus: row.speciesStatus || null,
        barcodeAll: row.allBarcodes,
        barcodeArise: row.ariseBarcodes,
        barcodeNonArise: row.otherBarcodes,
        collected: row.collected,
        locality: row.locality,
        lastAriseImport: importDateIso,
        source: 'arise',
      });
    }
  }

  const nmvWithoutArise: string[] = [];
  for (const s of existing) {
    if (!matchedNames.has(s.normalizedName) && s.nmvPriority) {
      nmvWithoutArise.push(s.scientificName);
    }
  }

  return {
    species: [...byName.values()],
    report: {
      exactMatches,
      newAriseSpecies,
      nmvWithoutArise,
      duplicateNames: [...duplicateSet],
      missingData,
    },
  };
}
