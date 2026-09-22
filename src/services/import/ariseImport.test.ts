import { describe, expect, it } from 'vitest';
import { normalizeHeader, parseAriseRecords } from './ariseImport';

describe('normalizeHeader', () => {
  it('verwijdert vraagtekens en punten en verlaagt', () => {
    expect(normalizeHeader('ARISE?')).toBe('arise');
    expect(normalizeHeader('Species status?')).toBe('species status');
    expect(normalizeHeader('Occ. status?')).toBe('occ status');
    expect(normalizeHeader('  Collected? ')).toBe('collected');
  });
});

describe('parseAriseRecords', () => {
  const headers = [
    'Kingdom',
    'Family',
    'Genus',
    'Species',
    'Species status?',
    'All',
    'ARISE?',
    'Non-ARISE',
    'Occ. status?',
    'Collected?',
    'Locality',
  ];

  function rec(values: Record<string, unknown>): Record<string, unknown> {
    return values;
  }

  it('koppelt variabele kolomnamen aan de canonieke velden', () => {
    const records = [
      rec({
        Kingdom: 'Fungi',
        Family: 'Russulaceae',
        Genus: 'Russula',
        Species: 'Russula vesca',
        'Species status?': 'Wanted',
        All: '3',
        'ARISE?': '1',
        'Non-ARISE': '2',
        'Occ. status?': '1a',
        'Collected?': '0',
        Locality: 'Netherlands',
      }),
    ];
    const result = parseAriseRecords(records, headers);
    expect(result.rows).toHaveLength(1);
    const r = result.rows[0];
    expect(r.species).toBe('Russula vesca');
    expect(r.speciesStatus).toBe('Wanted');
    expect(r.allBarcodes).toBe(3);
    expect(r.ariseBarcodes).toBe(1);
    expect(r.otherBarcodes).toBe(2);
    expect(r.occurrenceStatus).toBe('1a');
    expect(r.collected).toBe(0);
    expect(r.locality).toBe('Netherlands');
  });

  it('filtert niet-Fungi weg', () => {
    const records = [
      rec({ Kingdom: 'Animalia', Species: 'Some animal', Genus: 'X', Family: 'Y' }),
      rec({ Kingdom: 'Fungi', Species: 'Russula vesca', Genus: 'Russula', Family: 'Russulaceae' }),
    ];
    const result = parseAriseRecords(records, headers);
    expect(result.rows).toHaveLength(1);
    expect(result.filteredNonFungi).toBe(1);
    expect(result.rows[0].species).toBe('Russula vesca');
  });

  it('slaat rijen zonder soortnaam over', () => {
    const records = [rec({ Kingdom: 'Fungi', Species: '', Genus: 'X', Family: 'Y' })];
    const result = parseAriseRecords(records, headers);
    expect(result.rows).toHaveLength(0);
    expect(result.skippedNoSpecies).toBe(1);
  });

  it('zet niet-numerieke barcodewaarden om naar null', () => {
    const records = [
      rec({
        Kingdom: 'Fungi',
        Species: 'Russula vesca',
        Genus: 'Russula',
        Family: 'Russulaceae',
        All: '',
        'ARISE?': 'n.v.t.',
      }),
    ];
    const result = parseAriseRecords(records, headers);
    expect(result.rows[0].allBarcodes).toBeNull();
    expect(result.rows[0].ariseBarcodes).toBeNull();
  });
});
