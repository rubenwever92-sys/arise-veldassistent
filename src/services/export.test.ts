import { describe, expect, it } from 'vitest';
import { buildExportRows, exportFileName } from './export';
import { DEFAULT_CHECKLIST } from './collections';
import type { Collection } from '../types';

function collection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'c1',
    speciesId: 'russula-vesca',
    scientificName: 'Russula vesca',
    sampleId: 'ARISE-1',
    date: '2026-09-22',
    notes: 'substraat: hout',
    checklist: DEFAULT_CHECKLIST.map((c, i) => ({ ...c, done: i < 3 })),
    status: 'open',
    createdAt: '2026-09-22T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildExportRows', () => {
  it('bevat de kernvelden en checklistvoortgang', () => {
    const rows = buildExportRows([collection()]);
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r['Sample ID']).toBe('ARISE-1');
    expect(r['Soortnaam']).toBe('Russula vesca');
    expect(r['Datum']).toBe('22-09-2026');
    expect(r['Status']).toBe('Openstaand');
    expect(r['Voortgang']).toBe('3/12');
    expect(r['Notities']).toBe('substraat: hout');
  });

  it('zet elk checklistitem om naar Ja/Nee', () => {
    const rows = buildExportRows([collection()]);
    const r = rows[0];
    expect(r['ARISE Sample/QR-ID geregistreerd']).toBe('Ja');
    expect(r['Klaar om naar Naturalis te sturen']).toBe('Nee');
  });

  it('toont gereedstatus', () => {
    const rows = buildExportRows([collection({ status: 'ready' })]);
    expect(rows[0]['Status']).toBe('Gereed');
  });
});

describe('exportFileName', () => {
  it('bevat de extensie en het prefix', () => {
    expect(exportFileName('csv')).toMatch(/^arise-collecties-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
