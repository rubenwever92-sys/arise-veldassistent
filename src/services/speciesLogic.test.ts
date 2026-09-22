import { describe, expect, it } from 'vitest';
import {
  normalizeName,
  speciesIdFromName,
  toDisplayStatus,
  calcStillNeeded,
  statusConflicts,
} from './speciesLogic';

describe('normalizeName', () => {
  it('trimt en verlaagt', () => {
    expect(normalizeName('  Russula   Vesca ')).toBe('russula vesca');
  });
  it('verwijdert dubbele spaties', () => {
    expect(normalizeName('Cortinarius   armillatus')).toBe('cortinarius armillatus');
  });
});

describe('speciesIdFromName', () => {
  it('maakt een stabiele slug', () => {
    expect(speciesIdFromName('Russula vesca')).toBe('russula-vesca');
    expect(speciesIdFromName('  Russula   vesca ')).toBe('russula-vesca');
  });
});

describe('toDisplayStatus', () => {
  it('mapt de ARISE-statussen', () => {
    expect(toDisplayStatus('Priority')).toBe('PRIORITY');
    expect(toDisplayStatus('Wanted')).toBe('WANTED');
    expect(toDisplayStatus('Unwanted')).toBe('NIET NODIG');
  });
  it('is hoofdletterongevoelig', () => {
    expect(toDisplayStatus('wanted')).toBe('WANTED');
  });
  it('geeft ONBEKEND bij ontbrekende of onbekende status', () => {
    expect(toDisplayStatus(null)).toBe('ONBEKEND');
    expect(toDisplayStatus('iets')).toBe('ONBEKEND');
  });
});

describe('calcStillNeeded', () => {
  it.each([
    [0, 0, 3],
    [1, 0, 2],
    [1, 1, 1],
    [2, 1, 0],
    [0, 3, 0],
    [3, 0, 0],
  ])('arise=%i collected=%i -> %i', (arise, collected, expected) => {
    expect(calcStillNeeded(arise, collected)).toBe(expected);
  });

  it('behandelt null als 0', () => {
    expect(calcStillNeeded(null, null)).toBe(3);
  });
});

describe('statusConflicts', () => {
  it('signaleert NIET NODIG terwijl nog nodig > 0', () => {
    expect(statusConflicts('Unwanted', 0, 0)).toBe(true);
  });
  it('signaleert WANTED terwijl niets meer nodig', () => {
    expect(statusConflicts('Wanted', 3, 0)).toBe(true);
  });
  it('geen conflict bij consistente waarden', () => {
    expect(statusConflicts('Wanted', 1, 0)).toBe(false);
    expect(statusConflicts('Unwanted', 3, 0)).toBe(false);
  });
  it('geen conflict zonder status', () => {
    expect(statusConflicts(null, 0, 0)).toBe(false);
  });
});
