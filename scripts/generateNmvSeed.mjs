// Genereert het NMV-seedbestand (src/data/nmvSeed.json) uit het meegeleverde
// Excelbestand, zodat de 469 soorten standaard aanwezig zijn bij eerste start.
// Uitvoeren met: node scripts/generateNmvSeed.mjs

import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const COL = { family: 0, genus: 1, species: 2, nsrStatus: 3, macrofungi: 4, priority: 5 };
const FIRST_DATA_ROW_INDEX = 11;

function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
function speciesIdFromName(name) {
  return normalizeName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const inputPath = resolve(root, '20260724_Priority_Macrofungi.xlsx');
const wb = XLSX.read(readFileSync(inputPath), { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

const species = [];
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

const seed = {
  sourceFile: '20260724_Priority_Macrofungi.xlsx',
  generatedAt: new Date().toISOString(),
  count: species.length,
  species,
};

const outDir = resolve(root, 'src', 'data');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'nmvSeed.json');
writeFileSync(outPath, JSON.stringify(seed, null, 2), 'utf8');

console.log(`NMV-seed geschreven: ${outPath}`);
console.log(`Soorten: ${species.length}, overgeslagen: ${skipped}`);
