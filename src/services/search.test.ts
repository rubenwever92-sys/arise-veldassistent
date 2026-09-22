import { describe, expect, it } from 'vitest';
import { rankSpecies } from './search';
import type { Species } from '../types';

function makeSpecies(name: string, genus: string, family: string): Species {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    scientificName: name,
    normalizedName: name.toLowerCase(),
    genus,
    family,
    nsrStatus: '',
    nmvPriority: false,
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

const data: Species[] = [
  makeSpecies('Russula vesca', 'Russula', 'Russulaceae'),
  makeSpecies('Russula nigricans', 'Russula', 'Russulaceae'),
  makeSpecies('Cortinarius armillatus', 'Cortinarius', 'Cortinariaceae'),
  makeSpecies('Entoloma sinuatum', 'Entoloma', 'Entolomataceae'),
];

describe('rankSpecies', () => {
  it('geeft niets terug bij lege zoekterm', () => {
    expect(rankSpecies(data, '')).toEqual([]);
  });

  it('vindt op deel van soortnaam', () => {
    const r = rankSpecies(data, 'vesca');
    expect(r[0].scientificName).toBe('Russula vesca');
  });

  it('rangschikt exacte match bovenaan', () => {
    const r = rankSpecies(data, 'Russula vesca');
    expect(r[0].scientificName).toBe('Russula vesca');
  });

  it('vindt op genus', () => {
    const r = rankSpecies(data, 'Russula');
    expect(r.map((s) => s.scientificName)).toContain('Russula vesca');
    expect(r.map((s) => s.scientificName)).toContain('Russula nigricans');
  });

  it('vindt op familie', () => {
    const r = rankSpecies(data, 'Entolomataceae');
    expect(r[0].scientificName).toBe('Entoloma sinuatum');
  });

  it('is hoofdletterongevoelig', () => {
    const r = rankSpecies(data, 'cortinarius');
    expect(r[0].scientificName).toBe('Cortinarius armillatus');
  });
});
