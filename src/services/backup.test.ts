import { describe, expect, it } from 'vitest';
import {
  buildBackupData,
  validateBackupData,
  BACKUP_APP_ID,
} from './backup';
import type { Collection, ImportRecord, Photo, Setting, Species } from '../types';

function species(name: string): Species {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    scientificName: name,
    normalizedName: name.toLowerCase(),
    genus: 'Russula',
    family: 'Russulaceae',
    nsrStatus: '1a',
    nmvPriority: true,
    ariseStatus: null,
    barcodeAll: null,
    barcodeArise: null,
    barcodeNonArise: null,
    collected: null,
    locality: '',
    lastAriseImport: null,
    source: 'nmv',
  };
}

function collection(): Collection {
  return {
    id: 'c1',
    speciesId: 'russula-vesca',
    scientificName: 'Russula vesca',
    sampleId: 'ARISE-1',
    date: '2026-09-22',
    notes: 'test',
    checklist: [],
    status: 'open',
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
  };
}

function photo(): Photo {
  return {
    id: 'p1',
    collectionId: 'c1',
    blob: new Blob(['x'], { type: 'image/jpeg' }),
    fileName: 'foto.jpg',
    createdAt: '2026-09-22T00:00:00.000Z',
  };
}

describe('buildBackupData', () => {
  it('bundelt alle tabellen met tellingen en foto-metadata zonder blob', () => {
    const settings: Setting[] = [
      { key: 'lastAriseImport', value: '2026-09-18' },
      { key: 'speciesRestorePoint', value: { species: [] } },
    ];
    const imports: ImportRecord[] = [];
    const data = buildBackupData(
      [species('Russula vesca')],
      [collection()],
      settings,
      imports,
      [photo()],
    );

    expect(data.app).toBe(BACKUP_APP_ID);
    expect(data.counts).toEqual({ species: 1, collections: 1, photos: 1 });
    // Herstelpunt hoort niet in de backup.
    expect(data.settings.find((s) => s.key === 'speciesRestorePoint')).toBeUndefined();
    // Foto-metadata bevat geen blob.
    expect(data.photos[0]).toEqual({
      id: 'p1',
      collectionId: 'c1',
      fileName: 'foto.jpg',
      createdAt: '2026-09-22T00:00:00.000Z',
    });
  });
});

describe('validateBackupData', () => {
  it('accepteert een geldige backup', () => {
    const data = buildBackupData([], [], [], [], []);
    expect(validateBackupData(data)).toBe(true);
  });

  it('weigert onjuiste objecten', () => {
    expect(validateBackupData(null)).toBe(false);
    expect(validateBackupData({})).toBe(false);
    expect(validateBackupData({ app: 'iets-anders', version: 1 })).toBe(false);
  });
});
