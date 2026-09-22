// ARISE Targetlist importeren uit XLSX/XLS/CSV. De kolomnamen worden tolerant
// genormaliseerd (vraagtekens, hoofdletters, spaties en kleine variaties).

import * as XLSX from 'xlsx';
import type { AriseRawStatus } from '../../types';

/** Genormaliseerde ARISE-rij met de velden die de app gebruikt. */
export interface AriseRow {
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
  speciesStatus: AriseRawStatus;
  allBarcodes: number | null;
  ariseBarcodes: number | null;
  otherBarcodes: number | null;
  occurrenceStatus: string;
  collected: number | null;
  locality: string;
}

export interface AriseParseResult {
  rows: AriseRow[];
  /** Aantal rijen dat is overgeslagen omdat de soortnaam ontbrak. */
  skippedNoSpecies: number;
  /** Aantal rijen dat is uitgefilterd omdat Kingdom niet Fungi is. */
  filteredNonFungi: number;
  /** Totaal aantal databronrijen voor filtering. */
  totalRows: number;
  /** De herkende kolomkoppen (genormaliseerd) uit het bestand. */
  detectedColumns: string[];
}

type CanonicalField =
  | 'kingdom'
  | 'phylum'
  | 'class'
  | 'order'
  | 'family'
  | 'genus'
  | 'species'
  | 'speciesStatus'
  | 'allBarcodes'
  | 'ariseBarcodes'
  | 'otherBarcodes'
  | 'occurrenceStatus'
  | 'collected'
  | 'locality';

/** Aliassen per canoniek veld, reeds genormaliseerd (zie normalizeHeader). */
const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  kingdom: ['kingdom'],
  phylum: ['phylum'],
  class: ['class'],
  order: ['order'],
  family: ['family'],
  genus: ['genus'],
  species: ['species', 'scientific name', 'scientificname'],
  speciesStatus: ['species status', 'speciesstatus', 'status'],
  allBarcodes: ['all', 'allbarcodes', 'all barcodes'],
  ariseBarcodes: ['arise', 'arisebarcodes', 'arise barcodes'],
  otherBarcodes: [
    'non-arise',
    'non arise',
    'nonarise',
    'otherbarcodes',
    'other barcodes',
    'other',
  ],
  occurrenceStatus: [
    'occurrence status',
    'occ status',
    'occurrencestatus',
    'speciesoccurrencestatus',
    'species occurrence status',
  ],
  collected: ['collected'],
  locality: ['locality', 'specieslocality', 'species locality'],
};

/**
 * Normaliseert een kolomkop: lowercase, verwijdert vraagtekens en punten,
 * en comprimeert spaties. Zo matchen 'ARISE?', 'arise' en 'ARISE ' allemaal.
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[?.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Bouwt een index van canoniek veld -> werkelijke kolomnaam in het bestand. */
function mapColumns(headers: string[]): Partial<Record<CanonicalField, string>> {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const map: Partial<Record<CanonicalField, string>> = {};

  for (const field of Object.keys(FIELD_ALIASES) as CanonicalField[]) {
    const aliases = FIELD_ALIASES[field];
    const hit = normalized.find((h) => aliases.includes(h.norm));
    if (hit) map[field] = hit.raw;
  }
  return map;
}

/** Zet een celwaarde om naar een getal of null als het niet numeriek is. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function toText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * Parseert reeds ingelezen rij-objecten (kolomnaam -> waarde).
 * Filtert standaard op Kingdom = Fungi.
 */
export function parseAriseRecords(
  records: Record<string, unknown>[],
  headers: string[],
  filterFungi = true,
): AriseParseResult {
  const cols = mapColumns(headers);
  const rows: AriseRow[] = [];
  let skippedNoSpecies = 0;
  let filteredNonFungi = 0;

  const get = (rec: Record<string, unknown>, field: CanonicalField): unknown => {
    const key = cols[field];
    return key ? rec[key] : undefined;
  };

  for (const rec of records) {
    const species = toText(get(rec, 'species'));
    if (!species) {
      skippedNoSpecies++;
      continue;
    }
    const kingdom = toText(get(rec, 'kingdom'));
    if (filterFungi && kingdom.toLowerCase() !== 'fungi') {
      filteredNonFungi++;
      continue;
    }

    rows.push({
      kingdom,
      phylum: toText(get(rec, 'phylum')),
      class: toText(get(rec, 'class')),
      order: toText(get(rec, 'order')),
      family: toText(get(rec, 'family')),
      genus: toText(get(rec, 'genus')),
      species,
      speciesStatus: toText(get(rec, 'speciesStatus')),
      allBarcodes: toNumber(get(rec, 'allBarcodes')),
      ariseBarcodes: toNumber(get(rec, 'ariseBarcodes')),
      otherBarcodes: toNumber(get(rec, 'otherBarcodes')),
      occurrenceStatus: toText(get(rec, 'occurrenceStatus')),
      collected: toNumber(get(rec, 'collected')),
      locality: toText(get(rec, 'locality')),
    });
  }

  return {
    rows,
    skippedNoSpecies,
    filteredNonFungi,
    totalRows: records.length,
    detectedColumns: Object.values(cols),
  };
}

/**
 * Leest een ARISE-bestand (ArrayBuffer) van type XLSX/XLS/CSV en levert
 * genormaliseerde rijen. Voor CSV wordt het scheidingsteken automatisch herkend.
 */
export function parseAriseWorkbook(
  data: ArrayBuffer,
  filterFungi = true,
): AriseParseResult {
  const wb = XLSX.read(data, { type: 'array', raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];

  const headerMatrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: '',
    blankrows: false,
  });
  const headers = (headerMatrix[0] ?? []).map((h) => String(h));

  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
    raw: false,
  });

  return parseAriseRecords(records, headers, filterFungi);
}
