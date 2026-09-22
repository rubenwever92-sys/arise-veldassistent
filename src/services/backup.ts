// Backup maken en herstellen. De backup is één ZIP met alle databasegegevens
// als JSON plus de gekoppelde foto's. Herstel valideert het bestand eerst en
// overschrijft bestaande gegevens pas na bevestiging door de aanroeper.

import { db } from '../db';
import type { Collection, ImportRecord, Photo, Setting, Species } from '../types';

export const BACKUP_APP_ID = 'arise-veldassistent';
export const BACKUP_VERSION = 1;

/** Foto-metadata in de backup-JSON; de blob staat als apart bestand in de zip. */
export interface PhotoMeta {
  id: string;
  collectionId: string;
  fileName: string;
  createdAt: string;
}

/** Structuur van data.json in de backup. */
export interface BackupData {
  app: string;
  version: number;
  exportedAt: string;
  counts: {
    species: number;
    collections: number;
    photos: number;
  };
  species: Species[];
  collections: Collection[];
  settings: Setting[];
  imports: ImportRecord[];
  photos: PhotoMeta[];
}

/** Instellingen die niet in de backup horen (intern herstelpunt is te groot). */
const EXCLUDED_SETTINGS = new Set(['speciesRestorePoint']);

/** Stelt het backup-JSON-object samen uit de opgehaalde tabellen. */
export function buildBackupData(
  species: Species[],
  collections: Collection[],
  settings: Setting[],
  imports: ImportRecord[],
  photos: Photo[],
): BackupData {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      species: species.length,
      collections: collections.length,
      photos: photos.length,
    },
    species,
    collections,
    settings: settings.filter((s) => !EXCLUDED_SETTINGS.has(s.key)),
    imports,
    photos: photos.map((p) => ({
      id: p.id,
      collectionId: p.collectionId,
      fileName: p.fileName,
      createdAt: p.createdAt,
    })),
  };
}

/** Controleert of een geparset object een geldige backup is. */
export function validateBackupData(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<BackupData>;
  return (
    d.app === BACKUP_APP_ID &&
    typeof d.version === 'number' &&
    Array.isArray(d.species) &&
    Array.isArray(d.collections) &&
    Array.isArray(d.settings) &&
    Array.isArray(d.imports) &&
    Array.isArray(d.photos)
  );
}

/** Bestandsnaam, bijv. arise-veldassistent-backup-2026-09-22.zip. */
export function backupFileName(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${BACKUP_APP_ID}-backup-${d.getFullYear()}-${mm}-${dd}.zip`;
}

/** Maakt een backup-ZIP en biedt deze als download aan. */
export async function createBackup(): Promise<void> {
  const [species, collections, settings, imports, photos] = await Promise.all([
    db.species.toArray(),
    db.collections.toArray(),
    db.settings.toArray(),
    db.imports.toArray(),
    db.photos.toArray(),
  ]);

  const data = buildBackupData(species, collections, settings, imports, photos);

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file('data.json', JSON.stringify(data, null, 2));

  const photoFolder = zip.folder('photos');
  for (const p of photos) {
    photoFolder?.file(p.id, p.blob);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const { saveAs } = await import('file-saver');
  saveAs(blob, backupFileName());
}

/** Leest en valideert een backup-ZIP zonder de database te wijzigen. */
export async function readBackup(file: File | Blob): Promise<BackupData> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(file);
  const entry = zip.file('data.json');
  if (!entry) {
    throw new Error('Ongeldige backup: data.json ontbreekt.');
  }
  const parsed = JSON.parse(await entry.async('string'));
  if (!validateBackupData(parsed)) {
    throw new Error('Ongeldige of beschadigde backup.');
  }
  return parsed;
}

/**
 * Herstelt een backup-ZIP. Overschrijft alle tabellen met de backupinhoud.
 * Roep dit pas aan nadat de gebruiker heeft bevestigd.
 */
export async function restoreBackup(file: File | Blob): Promise<BackupData> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(file);

  const entry = zip.file('data.json');
  if (!entry) throw new Error('Ongeldige backup: data.json ontbreekt.');
  const data = JSON.parse(await entry.async('string'));
  if (!validateBackupData(data)) throw new Error('Ongeldige of beschadigde backup.');

  // Foto-blobs uit de zip reconstrueren.
  const photos: Photo[] = [];
  for (const meta of data.photos) {
    const photoEntry = zip.file(`photos/${meta.id}`);
    if (!photoEntry) continue;
    const blob = await photoEntry.async('blob');
    photos.push({
      id: meta.id,
      collectionId: meta.collectionId,
      fileName: meta.fileName,
      createdAt: meta.createdAt,
      blob,
    });
  }

  await db.transaction(
    'rw',
    db.species,
    db.collections,
    db.settings,
    db.imports,
    db.photos,
    async () => {
      await Promise.all([
        db.species.clear(),
        db.collections.clear(),
        db.settings.clear(),
        db.imports.clear(),
        db.photos.clear(),
      ]);
      await db.species.bulkPut(data.species);
      await db.collections.bulkPut(data.collections);
      await db.settings.bulkPut(data.settings);
      await db.imports.bulkPut(data.imports);
      await db.photos.bulkPut(photos);
    },
  );

  return data;
}
