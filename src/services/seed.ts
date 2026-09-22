// Laadt de meegeleverde NMV-soorten in IndexedDB bij de eerste start.

import { db, getSetting, setSetting } from '../db';
import type { ImportRecord, Species } from '../types';
import seed from '../data/nmvSeed.json';

const SEED_KEY = 'nmvSeedLoaded';

interface NmvSeedFile {
  sourceFile: string;
  generatedAt: string;
  count: number;
  species: Species[];
}

/**
 * Zorgt dat de database gevuld is met de standaard-NMV-lijst.
 * Draait idempotent: bij een reeds geladen seed gebeurt er niets.
 */
export async function ensureSeeded(): Promise<void> {
  const loaded = await getSetting<boolean>(SEED_KEY, false);
  const existing = await db.species.count();
  if (loaded && existing > 0) return;

  const data = seed as NmvSeedFile;

  await db.transaction('rw', db.species, db.imports, db.settings, async () => {
    await db.species.bulkPut(data.species);

    const importedAt = data.generatedAt || new Date().toISOString();
    const record: ImportRecord = {
      id: `nmv-seed-${importedAt}`,
      type: 'nmv',
      fileName: data.sourceFile,
      speciesCount: data.count,
      importedAt,
    };
    await db.imports.put(record);
    await setSetting(SEED_KEY, true);
    await setSetting('lastNmvImport', importedAt);
  });
}
