import { beforeEach, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { db } from '../db';
import { buildBackupData, restoreBackup } from './backup';
import { applyAriseImport } from './import/applyAriseImport';
import type { Collection, Photo, Species } from '../types';

function species(name: string, source: Species['source'] = 'nmv'): Species {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    scientificName: name,
    normalizedName: name.toLowerCase(),
    genus: name.split(' ')[0],
    family: 'Russulaceae',
    nsrStatus: '1a',
    nmvPriority: source !== 'arise',
    ariseStatus: null,
    barcodeAll: null,
    barcodeArise: null,
    barcodeNonArise: null,
    collected: null,
    locality: '',
    lastAriseImport: null,
    source,
  };
}

function collection(id: string): Collection {
  return {
    id,
    speciesId: 'russula-vesca',
    scientificName: 'Russula vesca',
    sampleId: 'ARISE-' + id,
    date: '2026-09-22',
    notes: 'veldnotitie',
    checklist: [],
    status: 'open',
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
  };
}

function photo(id: string, collectionId: string): Photo {
  return {
    id,
    collectionId,
    blob: new Blob(['fotodata'], { type: 'image/jpeg' }),
    fileName: 'foto.jpg',
    createdAt: '2026-09-22T00:00:00.000Z',
  };
}

/** Bouwt een ARISE-XLSX in het geheugen en levert een ArrayBuffer. */
function ariseWorkbookBuffer(rows: Record<string, unknown>[]): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return out as ArrayBuffer;
}

beforeEach(async () => {
  await Promise.all([
    db.species.clear(),
    db.collections.clear(),
    db.settings.clear(),
    db.imports.clear(),
    db.photos.clear(),
  ]);
});

describe('restoreBackup', () => {
  it('zet soorten, collecties en foto\u0027s terug uit een zip', async () => {
    const zip = new JSZip();
    const data = buildBackupData(
      [species('Russula vesca')],
      [collection('c1')],
      [{ key: 'lastAriseImport', value: '2026-09-18' }],
      [],
      [photo('p1', 'c1')],
    );
    zip.file('data.json', JSON.stringify(data));
    zip.folder('photos')?.file('p1', new Blob(['fotodata'], { type: 'image/jpeg' }));
    const blob = await zip.generateAsync({ type: 'blob' });

    const restored = await restoreBackup(blob);
    expect(restored.counts.collections).toBe(1);

    expect(await db.species.count()).toBe(1);
    expect(await db.collections.count()).toBe(1);
    expect(await db.photos.count()).toBe(1);
    const p = await db.photos.get('p1');
    expect(p?.fileName).toBe('foto.jpg');
    expect(p?.blob).toBeInstanceOf(Blob);
  });
});

describe('applyAriseImport veiligheid', () => {
  it('verwijdert bestaande collecties en foto\u0027s niet', async () => {
    await db.collections.put(collection('c1'));
    await db.photos.put(photo('p1', 'c1'));
    await db.species.bulkPut([species('Russula vesca')]);

    const buffer = ariseWorkbookBuffer([
      {
        kingdom: 'Fungi',
        family: 'Russulaceae',
        genus: 'Russula',
        species: 'Russula vesca',
        speciesStatus: 'Priority',
        allBarcodes: 2,
        ariseBarcodes: 1,
        otherBarcodes: 1,
        speciesOccurrenceStatus: '1a',
        collected: 0,
        speciesLocality: '',
      },
      {
        kingdom: 'Fungi',
        family: 'Amanitaceae',
        genus: 'Amanita',
        species: 'Amanita muscaria',
        speciesStatus: 'Wanted',
        allBarcodes: 0,
        ariseBarcodes: 0,
        otherBarcodes: 0,
        speciesOccurrenceStatus: '1a',
        collected: 0,
        speciesLocality: '',
      },
    ]);

    const result = await applyAriseImport(buffer, 'test.xlsx');
    expect(result.fungiCount).toBe(2);

    // Collecties en foto's blijven volledig behouden.
    expect(await db.collections.count()).toBe(1);
    expect(await db.photos.count()).toBe(1);
    const c = await db.collections.get('c1');
    expect(c?.sampleId).toBe('ARISE-c1');
    expect(c?.notes).toBe('veldnotitie');

    // Soortdata is wel bijgewerkt.
    const russula = await db.species.get('russula-vesca');
    expect(russula?.ariseStatus).toBe('Priority');
    expect(russula?.source).toBe('both');
  });
});
