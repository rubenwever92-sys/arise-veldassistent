// Collecties exporteren naar XLSX of CSV. De rijopbouw is puur en testbaar.
// Foto's worden niet in het exportbestand opgenomen.

import type { Collection } from '../types';
import { checklistProgress } from './collections';
import { formatDate } from '../utils/date';

/** Eén platte exportrij per collectie. */
export type ExportRow = Record<string, string>;

/**
 * Bouwt exportrijen uit collecties. Sample ID, soortnaam, datum, status,
 * checklistvoortgang, elk checklistitem en notities worden opgenomen.
 * Modulair opgezet zodat later een ARISE-metadata-export kan worden toegevoegd.
 */
export function buildExportRows(collections: Collection[]): ExportRow[] {
  return collections.map((c) => {
    const row: ExportRow = {
      'Sample ID': c.sampleId,
      Soortnaam: c.scientificName,
      Datum: formatDate(c.date),
      Status: c.status === 'ready' ? 'Gereed' : 'Openstaand',
      Voortgang: `${checklistProgress(c.checklist)}/${c.checklist.length}`,
    };
    for (const item of c.checklist) {
      row[item.label] = item.done ? 'Ja' : 'Nee';
    }
    row['Notities'] = c.notes;
    return row;
  });
}

/** Bestandsnaam met datum, bijv. arise-collecties-2026-09-22.xlsx. */
export function exportFileName(ext: string): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `arise-collecties-${d.getFullYear()}-${mm}-${dd}.${ext}`;
}

/** Exporteert collecties als XLSX-download. */
export async function exportCollectionsXlsx(collections: Collection[]): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = buildExportRows(collections);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Collecties');
  XLSX.writeFile(wb, exportFileName('xlsx'));
}

/** Exporteert collecties als CSV-download. */
export async function exportCollectionsCsv(collections: Collection[]): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = buildExportRows(collections);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const { saveAs } = await import('file-saver');
  saveAs(blob, exportFileName('csv'));
}
