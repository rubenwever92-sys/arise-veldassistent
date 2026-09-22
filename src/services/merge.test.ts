import { describe, expect, it } from 'vitest';
import { mergeSpecies } from './merge';
import type { Species } from '../types';
import type { AriseRow } from './import/ariseImport';

function nmvSpecies(name: string, genus: string, family: string): Species {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    scientificName: name,
    normalizedName: name.toLowerCase(),
    genus,
    family,
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

function ariseRow(partial: Partial<AriseRow> & { species: string }): AriseRow {
  return {
    kingdom: 'Fungi',
    phylum: '',
    class: '',
    order: '',
    family: '',
    genus: '',
    speciesStatus: 'Wanted',
    allBarcodes: 0,
    ariseBarcodes: 0,
    otherBarcodes: 0,
    occurrenceStatus: '',
    collected: 0,
    locality: '',
    ...partial,
  };
}

const IMPORT_DATE = '2026-09-18T00:00:00.000Z';

describe('mergeSpecies', () => {
  it('koppelt een ARISE-soort exact op een NMV-soort', () => {
    const existing = [nmvSpecies('Russula vesca', 'Russula', 'Russulaceae')];
    const rows = [
      ariseRow({
        species: 'Russula vesca',
        genus: 'Russula',
        family: 'Russulaceae',
        speciesStatus: 'Priority',
        allBarcodes: 2,
        ariseBarcodes: 1,
        otherBarcodes: 1,
        collected: 0,
      }),
    ];
    const { species, report } = mergeSpecies(existing, rows, IMPORT_DATE);
    expect(report.exactMatches).toBe(1);
    expect(report.newAriseSpecies).toBe(0);

    const s = species.find((x) => x.normalizedName === 'russula vesca')!;
    expect(s.ariseStatus).toBe('Priority');
    expect(s.nmvPriority).toBe(true);
    expect(s.barcodeArise).toBe(1);
    expect(s.source).toBe('both');
    expect(s.lastAriseImport).toBe(IMPORT_DATE);
  });

  it('is hoofdletter- en spatieongevoelig bij het koppelen', () => {
    const existing = [nmvSpecies('Russula vesca', 'Russula', 'Russulaceae')];
    const rows = [ariseRow({ species: '  RUSSULA   VESCA ' })];
    const { report } = mergeSpecies(existing, rows, IMPORT_DATE);
    expect(report.exactMatches).toBe(1);
  });

  it('voegt nieuwe ARISE-soorten toe met nmvPriority false', () => {
    const existing = [nmvSpecies('Russula vesca', 'Russula', 'Russulaceae')];
    const rows = [
      ariseRow({ species: 'Amanita muscaria', genus: 'Amanita', family: 'Amanitaceae' }),
    ];
    const { species, report } = mergeSpecies(existing, rows, IMPORT_DATE);
    expect(report.newAriseSpecies).toBe(1);
    const s = species.find((x) => x.normalizedName === 'amanita muscaria')!;
    expect(s.nmvPriority).toBe(false);
    expect(s.source).toBe('arise');
  });

  it('behoudt NMV-soorten zonder ARISE-match en rapporteert ze', () => {
    const existing = [
      nmvSpecies('Russula vesca', 'Russula', 'Russulaceae'),
      nmvSpecies('Cortinarius armillatus', 'Cortinarius', 'Cortinariaceae'),
    ];
    const rows = [ariseRow({ species: 'Russula vesca' })];
    const { species, report } = mergeSpecies(existing, rows, IMPORT_DATE);
    expect(species).toHaveLength(2);
    expect(report.nmvWithoutArise).toEqual(['Cortinarius armillatus']);
  });

  it('detecteert dubbele namen in de ARISE-lijst', () => {
    const rows = [
      ariseRow({ species: 'Russula vesca' }),
      ariseRow({ species: 'Russula vesca' }),
    ];
    const { report } = mergeSpecies([], rows, IMPORT_DATE);
    expect(report.duplicateNames).toEqual(['Russula vesca']);
  });

  it('signaleert records met ontbrekende gegevens', () => {
    const rows = [
      ariseRow({ species: 'Zonder status', speciesStatus: '', genus: 'X', family: 'Y' }),
    ];
    const { report } = mergeSpecies([], rows, IMPORT_DATE);
    expect(report.missingData).toContain('Zonder status');
  });

  it('verwijdert geen bestaande soorten bij een lege ARISE-lijst', () => {
    const existing = [nmvSpecies('Russula vesca', 'Russula', 'Russulaceae')];
    const { species } = mergeSpecies(existing, [], IMPORT_DATE);
    expect(species).toHaveLength(1);
    expect(species[0].ariseStatus).toBeNull();
  });
});
