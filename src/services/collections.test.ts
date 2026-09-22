import { describe, expect, it } from 'vitest';
import { DEFAULT_CHECKLIST, checklistProgress, isReady } from './collections';
import type { ChecklistItem } from '../types';

function build(doneKeys: string[]): ChecklistItem[] {
  return DEFAULT_CHECKLIST.map((c) => ({ ...c, done: doneKeys.includes(c.key) }));
}

describe('checklist', () => {
  it('heeft twaalf standaarditems', () => {
    expect(DEFAULT_CHECKLIST).toHaveLength(12);
  });

  it('telt voltooide items', () => {
    const list = build(['sample-id', 'dna-sample']);
    expect(checklistProgress(list)).toBe(2);
  });

  it('is niet gereed bij openstaande items', () => {
    const list = build(['sample-id']);
    expect(isReady(list)).toBe(false);
  });

  it('is gereed wanneer alles is afgevinkt', () => {
    const list = DEFAULT_CHECKLIST.map((c) => ({ ...c, done: true }));
    expect(isReady(list)).toBe(true);
    expect(checklistProgress(list)).toBe(12);
  });

  it('is niet gereed bij een lege lijst', () => {
    expect(isReady([])).toBe(false);
  });
});
