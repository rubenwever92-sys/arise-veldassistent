// Collectiebeheer: aanmaken, bijwerken, checklist en afgeleide status.

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { ChecklistItem, Collection, Species } from '../types';
import { todayIso } from '../utils/date';

/** Standaardchecklist voor een nieuwe collectie (spec-volgorde). */
export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { key: 'sample-id', label: 'ARISE Sample/QR-ID geregistreerd', done: false },
  { key: 'dna-sample', label: 'DNA-monster genomen', done: false },
  { key: 'dna-labeled', label: 'DNA-buisje gelabeld', done: false },
  { key: 'voucher', label: 'Voucher/collectie meegenomen', done: false },
  { key: 'field-photo', label: "Veldfoto('s) gemaakt", done: false },
  { key: 'home-photo', label: 'Collectie thuis gefotografeerd', done: false },
  { key: 'description', label: 'Beschrijving gemaakt', done: false },
  { key: 'metadata', label: 'Metadata ingevuld', done: false },
  { key: 'dried', label: 'Collectie gedroogd op maximaal 40 °C', done: false },
  { key: 'packed', label: 'Gedroogde collectie verpakt', done: false },
  { key: 'dna-added', label: 'DNA-buisje bij collectie gevoegd', done: false },
  { key: 'ready-to-send', label: 'Klaar om naar Naturalis te sturen', done: false },
];

/** Aantal voltooide checklistitems. */
export function checklistProgress(checklist: ChecklistItem[]): number {
  return checklist.filter((c) => c.done).length;
}

/** Een collectie is gereed wanneer alle checklistitems voltooid zijn. */
export function isReady(checklist: ChecklistItem[]): boolean {
  return checklist.length > 0 && checklist.every((c) => c.done);
}

/** Maakt een nieuwe collectie aan, optioneel voorgevuld met een soort. */
export async function createCollection(species?: Species | null): Promise<Collection> {
  const now = new Date().toISOString();
  const collection: Collection = {
    id: uuidv4(),
    speciesId: species?.id ?? null,
    scientificName: species?.scientificName ?? '',
    sampleId: '',
    date: todayIso(),
    notes: '',
    checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c })),
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
  await db.collections.put(collection);
  return collection;
}

/** Slaat wijzigingen op en werkt status en updatedAt automatisch bij. */
export async function saveCollection(collection: Collection): Promise<Collection> {
  const updated: Collection = {
    ...collection,
    status: isReady(collection.checklist) ? 'ready' : 'open',
    updatedAt: new Date().toISOString(),
  };
  await db.collections.put(updated);
  return updated;
}

/** Verwijdert een collectie en de bijbehorende foto's. */
export async function deleteCollection(id: string): Promise<void> {
  await db.transaction('rw', db.collections, db.photos, async () => {
    await db.photos.where('collectionId').equals(id).delete();
    await db.collections.delete(id);
  });
}
