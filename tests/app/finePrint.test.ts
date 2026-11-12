import { describe, expect, test } from 'vitest';
import { LINES } from '$data';
import { finePrint } from '../../src/app/study';

/** IQ-F3: the fine-print count reads only lines the engine can stamp (no `pending` row). */

describe('finePrint', () => {
  test('IQ-F3: finePrint counts no pending row', () => {
    for (const rune of ['sentence', 'levy', 'tally'] as const) {
      const live = LINES.filter((l) => l.subject === rune && !l.pending);
      const all = finePrint(
        live.map((l) => l.id),
        rune,
      );
      expect(all.total, rune).toBe(live.length);
      expect(all.witnessed, rune).toBe(live.length);
      expect(finePrint([], rune).witnessed, rune).toBe(0);
    }
  });

  test('IQ-F3: the Contracts runes have their stamped margin rows in the count', () => {
    expect(finePrint([], 'sentence').total).toBe(
      LINES.filter((l) => l.subject === 'sentence').length,
    );
    expect(finePrint([], 'levy').total).toBe(LINES.filter((l) => l.subject === 'levy').length);
    expect(finePrint([], 'tally').total).toBe(LINES.filter((l) => l.subject === 'tally').length);
  });
});
