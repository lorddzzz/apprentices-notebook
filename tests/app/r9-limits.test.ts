import { describe, expect, test } from 'vitest';
import type { Drawing } from '$data';
import { newSave } from '$engine';
import {
  checkDrawing,
  drawingsOf,
  FOE_LIMIT_SENTENCE,
  NO_FOE_SENTENCE,
  PIECE_LIMIT_SENTENCE,
  paletteOf,
  readDrawing,
} from '$engine/drawing';
import { blankDrawing, saveDraft, tableView } from '../../src/app/drawing';
import { fullHousehold } from '../drawing/fixtures';

const p = fullHousehold();
const palette = paletteOf(p);
const base: Drawing = {
  ...blankDrawing(p),
  name: 'Counted',
  rule: null,
  pieces: [],
  shape: 'plain',
};
const reasons = (d: Drawing): string[] => checkDrawing(p, d).map((i) => i.reason);

describe('R9: storeDrawing keeps what readDrawing keeps', () => {
  test('the palette has enough foes and pieces to go over the limits', () => {
    expect(palette.foes.length).toBeGreaterThanOrEqual(4);
    expect(palette.pieces.length).toBeGreaterThanOrEqual(3);
  });

  test('no foe, four foes and three pieces each have their sentence in checkDrawing', () => {
    expect(reasons({ ...base, foes: [] })).toContain(NO_FOE_SENTENCE);
    expect(reasons({ ...base, foes: palette.foes.slice(0, 4) })).toContain(FOE_LIMIT_SENTENCE);
    expect(reasons({ ...base, pieces: palette.pieces.slice(0, 3) })).toContain(
      PIECE_LIMIT_SENTENCE,
    );
    // the edges are fine
    expect(reasons({ ...base, foes: palette.foes.slice(0, 3), pieces: [] })).not.toContain(
      FOE_LIMIT_SENTENCE,
    );
    expect(reasons({ ...base, foes: palette.foes.slice(0, 1) })).not.toContain(NO_FOE_SENTENCE);
  });

  test('storeDrawing refuses what readDrawing would drop, with the sentence', () => {
    const save = { ...newSave(1), profile: p };
    const cases: [Drawing, string][] = [
      [{ ...base, foes: [] }, NO_FOE_SENTENCE],
      [{ ...base, foes: palette.foes.slice(0, 4) }, FOE_LIMIT_SENTENCE],
      [{ ...base, pieces: palette.pieces.slice(0, 3) }, PIECE_LIMIT_SENTENCE],
    ];
    for (const [d, sentence] of cases) {
      expect(() => saveDraft(save, 0, d)).toThrow(sentence);
    }
  });

  test('whatever it stores reads back whole', () => {
    const save = { ...newSave(1), profile: p };
    for (const foes of [1, 2, 3]) {
      for (const pieces of [0, 1, 2]) {
        const d: Drawing = {
          ...base,
          foes: palette.foes.slice(0, foes),
          pieces: palette.pieces.slice(0, pieces),
        };
        if (checkDrawing(p, d).length > 0) continue;
        const stored = drawingsOf(saveDraft(save, 0, d).profile)[0];
        expect(readDrawing(JSON.parse(JSON.stringify(stored)))).toEqual(d);
      }
    }
  });

  test('the table still says "Draw at least one foe." once, from the engine', () => {
    const v = tableView(p, 0, { ...base, foes: [] }, null);
    expect(v.issues.filter((i) => i.reason === NO_FOE_SENTENCE)).toHaveLength(1);
    expect(v.canSave).toBe(false);
  });
});
