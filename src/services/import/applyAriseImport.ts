// Toepassen van een ARISE-import op de database. Veilig: raakt alleen de
// soortentabel aan en maakt vooraf een herstelpunt van de bestaande soorten.

import { v4 as uuidv4 } from 'uuid';
import { db, setSetting } from '../../db';
import type { ImportRecord, Species } from '../../types';
import { parseAriseWorkbook } from './ariseImport';
import { mergeSpecies, type ImportControlReport } from '../merge';

const RESTORE_POINT_KEY = 'speciesRestorePoint';

export interface AriseImportResult {
  report: ImportControlReport;
  fungiCount: number;
  skippedNoSpecies: number;
  filteredNonFungi: number;
  detectedColumns: string[];
  importedAt: string;
  fileName: string;
}

/**
 * Verwerkt een ARISE-bestand volledig lokaal:
 * parseert, filtert op Fungi, merget met bestaande soorten, maakt een
 * herstelpunt en schrijft de bijgewerkte soorten weg. Collecties, foto's en
 * notities blijven onaangeroerd.
 */
export async function applyAriseImport(
  data: ArrayBuffer,
  fileName: string,
): Promise<AriseImportResult> {
  const parsed = parseAriseWorkbook(data, true);
  if (parsed.rows.length === 0) {
    throw new Error(
      'Geen Fungi-soorten gevonden. Controleer of het juiste ARISE-bestand is gekozen.',
    );
  }

  const importedAt = new Date().toISOString();
  const existing = await db.species.toArray();
  const { species, report } = mergeSpecies(existing, parsed.rows, importedAt);

  await db.transaction('rw', db.species, db.imports, db.settings, async () => {
    // Herstelpunt van de bestaande soorten (alleen soortenreferentiedata).
    await createRestorePoint(existing);

    await db.species.clear();
    await db.species.bulkPut(species);

    const record: ImportRecord = {
      id: uuidv4(),
      type: 'arise',
      fileName,
      speciesCount: parsed.rows.length,
      importedAt,
    };
    await db.imports.put(record);
    await setSetting('lastAriseImport', importedAt);
  });

  return {
    report,
    fungiCount: parsed.rows.length,
    skippedNoSpecies: parsed.skippedNoSpecies,
    filteredNonFungi: parsed.filteredNonFungi,
    detectedColumns: parsed.detectedColumns,
    importedAt,
    fileName,
  };
}

/** Slaat de huidige soorten op als herstelpunt (overschrijft de vorige). */
async function createRestorePoint(species: Species[]): Promise<void> {
  await setSetting(RESTORE_POINT_KEY, {
    createdAt: new Date().toISOString(),
    species,
  });
}

/** Zet de soorten terug naar het laatste herstelpunt, indien aanwezig. */
export async function restoreSpeciesFromRestorePoint(): Promise<boolean> {
  const row = await db.settings.get(RESTORE_POINT_KEY);
  if (!row) return false;
  const point = row.value as { species: Species[] } | undefined;
  if (!point?.species) return false;

  await db.transaction('rw', db.species, async () => {
    await db.species.clear();
    await db.species.bulkPut(point.species);
  });
  return true;
}
