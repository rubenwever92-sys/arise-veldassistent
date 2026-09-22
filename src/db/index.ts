// IndexedDB-laag via Dexie. Definieert de tabellen en centrale db-instantie.

import Dexie, { type Table } from 'dexie';
import type {
  Species,
  Collection,
  Photo,
  Setting,
  ImportRecord,
} from '../types';

export class AriseDatabase extends Dexie {
  species!: Table<Species, string>;
  collections!: Table<Collection, string>;
  photos!: Table<Photo, string>;
  settings!: Table<Setting, string>;
  imports!: Table<ImportRecord, string>;

  constructor() {
    super('arise-veldassistent');
    this.version(1).stores({
      // Alleen geïndexeerde velden worden opgesomd; overige velden worden
      // gewoon opgeslagen zonder index.
      species: 'id, normalizedName, genus, family, ariseStatus, nmvPriority, source',
      collections: 'id, speciesId, scientificName, sampleId, status, date, updatedAt',
      photos: 'id, collectionId, createdAt',
      settings: 'key',
      imports: 'id, type, importedAt',
    });
  }
}

export const db = new AriseDatabase();

/** Leest een instelling of geeft de meegegeven fallback terug. */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}

/** Schrijft een instelling weg. */
export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}
