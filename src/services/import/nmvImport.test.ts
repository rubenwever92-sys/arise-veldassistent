import { describe, expect, it } from 'vitest';
import { parseNmvRows } from './nmvImport';

const header = [
  'family',
  'genus',
  'species',
  'Status in Nederlandse soortenregister',
  'Macrofungi',
  'Priority',
];

// Rijen 0-9 leeg, rij 10 = koppen, rij 11+ = data.
function buildRows(dataRows: unknown[][]): unknown[][] {
  const rows: unknown[][] = [];
  for (let i = 0; i < 10; i++) rows.push([]);
  rows.push(header);
  return rows.concat(dataRows);
}

describe('parseNmvRows', () => {
  it('leest een geldige rij correct in', () => {
    const rows = buildRows([
      ['Xylariaceae', 'Hypoxylon', 'Hypoxylon subticinense', '1a', 'Ja', 'Ja'],
    ]);
    const { species, skipped } = parseNmvRows(rows);
    expect(skipped).toBe(0);
    expect(species).toHaveLength(1);
    const s = species[0];
    expect(s.scientificName).toBe('Hypoxylon subticinense');
    expect(s.genus).toBe('Hypoxylon');
    expect(s.family).toBe('Xylariaceae');
    expect(s.nsrStatus).toBe('1a');
    expect(s.nmvPriority).toBe(true);
    expect(s.source).toBe('nmv');
    expect(s.ariseStatus).toBeNull();
  });

  it('slaat rijen zonder soortnaam over', () => {
    const rows = buildRows([
      ['Xylariaceae', 'Hypoxylon', '', '1a', 'Ja', 'Ja'],
      ['Russulaceae', 'Russula', 'Russula vesca', '1b', 'Ja', 'Ja'],
    ]);
    const { species, skipped } = parseNmvRows(rows);
    expect(skipped).toBe(1);
    expect(species).toHaveLength(1);
    expect(species[0].scientificName).toBe('Russula vesca');
  });

  it('normaliseert de naam', () => {
    const rows = buildRows([
      ['Russulaceae', 'Russula', '  Russula   vesca ', '1a', 'Ja', 'Ja'],
    ]);
    const { species } = parseNmvRows(rows);
    expect(species[0].normalizedName).toBe('russula vesca');
    expect(species[0].id).toBe('russula-vesca');
  });
});
