// NMV-prioriteitenlijst importeren uit een Excel-werkblad.
// De koppen staan op rij 11 (index 10); soortrecords beginnen op rij 12.

import * as XLSX from 'xlsx';
import type { Species } from '../../types';
import { normalizeName, speciesIdFromName } from '../speciesLogic';

/** Kolomindexen binnen de NMV-lijst, zoals aangeleverd. */
const COL = {
  family: 0,
  genus: 1,
  species: 2,
  nsrStatus: 3,
  macrofungi: 4,
  priority: 5,
} as const;

const HEADER_ROW_INDEX = 10;
const FIRST_DATA_ROW_INDEX = 11;

export interface NmvParseResult {
  species: Species[];
  /** Rijen die zijn overgeslagen omdat de soortnaam ontbrak. */
  skipped: number;
}

/**
 * Zet ruwe werkbladrijen (array-of-arrays) om naar Species-records.
 * Gedeeld door de build-time seed-generator en de runtime-importer.
 */
export function parseNmvRows(rows: unknown[][]): NmvParseResult {
  const species: Species[] = [];
  let skipped = 0;

  for (let i = FIRST_DATA_ROW_INDEX; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const rawSpecies = String(row[COL.species] ?? '').trim();
    if (!rawSpecies) {
      skipped++;
      continue;
    }
    const priorityRaw = String(row[COL.priority] ?? '').trim().toLowerCase();
    species.push({
      id: speciesIdFromName(rawSpecies),
      scientificName: rawSpecies,
      normalizedName: normalizeName(rawSpecies),
      genus: String(row[COL.genus] ?? '').trim(),
      family: String(row[COL.family] ?? '').trim(),
      nsrStatus: String(row[COL.nsrStatus] ?? '').trim(),
      nmvPriority: priorityRaw === 'ja' || priorityRaw === 'yes' || priorityRaw === 'true',
      ariseStatus: null,
      barcodeAll: null,
      barcodeArise: null,
      barcodeNonArise: null,
      collected: null,
      locality: '',
      lastAriseImport: null,
      source: 'nmv',
    });
  }

  return { species, skipped };
}

/** Leest een NMV-Excelbestand (ArrayBuffer) en levert Species-records. */
export function parseNmvWorkbook(data: ArrayBuffer): NmvParseResult {
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
  });
  return parseNmvRows(rows);
}

/** Kolomkoppen ter validatie van het aangeleverde bestand. */
export function readHeaderRow(data: ArrayBuffer): string[] {
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: '',
  });
  return (rows[HEADER_ROW_INDEX] ?? []).map((c) => String(c));
}
