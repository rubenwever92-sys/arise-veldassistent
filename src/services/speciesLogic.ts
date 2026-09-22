// Naamnormalisatie en ARISE-statusberekeningen. Puur en zonder side effects,
// zodat deze logica los getest kan worden.

import type { AriseDisplayStatus, AriseRawStatus } from '../types';

/**
 * Normaliseert een wetenschappelijke naam voor zoeken en koppelen:
 * trimt, verwijdert dubbele spaties en maakt lowercase.
 * De oorspronkelijke naam blijft elders ongewijzigd bewaard.
 */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Stabiele interne id afgeleid van de genormaliseerde naam. */
export function speciesIdFromName(name: string): string {
  return normalizeName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Mapt de originele ARISE-status naar de weergavestatus. */
export function toDisplayStatus(raw: AriseRawStatus | null): AriseDisplayStatus {
  if (!raw) return 'ONBEKEND';
  switch (raw.trim().toLowerCase()) {
    case 'priority':
      return 'PRIORITY';
    case 'wanted':
      return 'WANTED';
    case 'unwanted':
      return 'NIET NODIG';
    default:
      return 'ONBEKEND';
  }
}

/** ARISE streeft naar drie Nederlandse referenties per soort. */
export const TARGET_BARCODES = 3;

/**
 * Indicatieve berekening van het aantal nog benodigde exemplaren.
 * nogNodig = max(0, 3 - ariseBarcodes - collected)
 */
export function calcStillNeeded(
  ariseBarcodes: number | null,
  collected: number | null,
): number {
  const a = ariseBarcodes ?? 0;
  const c = collected ?? 0;
  return Math.max(0, TARGET_BARCODES - a - c);
}

/**
 * Controleert of de indicatieve berekening en de officiële ARISE-status
 * met elkaar in tegenspraak zijn. Zo ja, dan moet de interface waarschuwen
 * en de officiële status leidend houden.
 */
export function statusConflicts(
  raw: AriseRawStatus | null,
  ariseBarcodes: number | null,
  collected: number | null,
): boolean {
  if (!raw) return false;
  const display = toDisplayStatus(raw);
  const stillNeeded = calcStillNeeded(ariseBarcodes, collected);
  // "NIET NODIG" terwijl de berekening nog exemplaren vraagt, of andersom.
  if (display === 'NIET NODIG' && stillNeeded > 0) return true;
  if ((display === 'PRIORITY' || display === 'WANTED') && stillNeeded === 0) return true;
  return false;
}
