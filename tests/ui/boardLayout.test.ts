import { describe, expect, test } from 'vitest';
import {
  boardLayout,
  boardViewBox,
  CELL,
  fightBoardRect,
  GUTTER,
  LAP,
} from '../../src/ui/components/board/geometry';

/** FT-5: `boardLayout` from the FT-5s spike's numbers (docs/plans/ux-fight-evidence/FT-5s-measured.md). */

/** Every size the plan's matrix lists (FT-D9) sits in cols 5-7 x rows 6-9; the drawn pages cover it all. */
const MATRIX: Array<[number, number]> = [];
for (const cols of [5, 6, 7]) for (const rows of [6, 7, 8, 9]) MATRIX.push([cols, rows]);

const PHONES = [
  { name: '375x812 (44/34)', screen: { w: 375, h: 812 }, safe: { top: 44, bottom: 34 }, floor: 44 },
  { name: '375x667 (20/0)', screen: { w: 375, h: 667 }, safe: { top: 20, bottom: 0 }, floor: 38 },
];

describe('FT-5 boardLayout', () => {
  test('7x9 at 375x812 is at least 44 px', () => {
    const rect = fightBoardRect({ w: 375, h: 812 }, { top: 44, bottom: 34 });
    expect(rect).toEqual({ w: 359, h: 466 });
    const l = boardLayout(7, 9, rect.w, rect.h);
    // The spike measured 49.6 px in the browser.
    expect(l.cell).toBeGreaterThanOrEqual(44);
    expect(l.cell).toBeCloseTo(49.6, 1);
    const se = fightBoardRect({ w: 375, h: 667 }, { top: 20, bottom: 0 });
    expect(boardLayout(7, 9, se.w, se.h).cell).toBeGreaterThanOrEqual(38);
  });

  test('matrix sizes never overflow', () => {
    for (const p of PHONES) {
      const rect = fightBoardRect(p.screen, p.safe);
      for (const [cols, rows] of MATRIX) {
        const l = boardLayout(cols, rows, rect.w, rect.h);
        const label = `${p.name} ${cols}x${rows}`;
        expect(l.width, label).toBeLessThanOrEqual(rect.w + 1e-9);
        expect(l.height, label).toBeLessThanOrEqual(rect.h + 1e-9);
        expect(l.cell, label).toBeGreaterThanOrEqual(p.floor);
        // The grid plus its gutter is exactly the board.
        expect(l.gutter + cols * l.cell, label).toBeCloseTo(l.width, 6);
        expect(l.gutter + rows * l.cell, label).toBeCloseTo(l.height, 6);
      }
    }
  });

  test('never clamps above the available rect', () => {
    // A tiny rectangle shrinks the board below any comfortable size instead of overflowing.
    const small = boardLayout(7, 9, 120, 120);
    expect(small.width).toBeLessThanOrEqual(120);
    expect(small.height).toBeLessThanOrEqual(120);
    expect(small.cell).toBeLessThan(15);
    // A huge one grows the board to fill it on the tight axis: no cap on the cell size.
    const big = boardLayout(5, 6, 3000, 4000);
    expect(big.cell).toBeGreaterThan(CELL);
    expect(Math.max(big.width / 3000, big.height / 4000)).toBeCloseTo(1, 9);
    // A degenerate rectangle gives an empty board, not a negative one.
    expect(boardLayout(6, 6, 0, -5).cell).toBe(0);
  });

  test('lap is a third of a cell', () => {
    for (const [cols, rows] of MATRIX) {
      const l = boardLayout(cols, rows, 359, 466);
      expect(l.lap).toBeCloseTo(l.cell / 3, 9);
    }
    expect(LAP).toBeCloseTo(CELL / 3, 9);
  });

  test('headroom is the gutter plus the slack of a wide rectangle', () => {
    // Height-bound (a wide rectangle): the board fills the height, so only the gutter sits above row 1.
    const tight = boardLayout(7, 9, 600, 466);
    expect(tight.headroom).toBeCloseTo(tight.gutter, 6);
    // A width-bound board in a tall rectangle is centred: the slack splits above and below.
    const wide = boardLayout(5, 6, 359, 600);
    expect(wide.headroom).toBeCloseTo(wide.gutter + (600 - wide.height) / 2, 6);
  });

  test('agrees with the svg viewBox the board is drawn in', () => {
    // The board svg scales its viewBox with `meet`: the same scale boardLayout reports.
    const [, , vbW, vbH] = boardViewBox(7, 9).split(' ').map(Number);
    expect(vbW).toBe(7 * CELL + GUTTER);
    expect(vbH).toBe(9 * CELL + GUTTER);
    const l = boardLayout(7, 9, 359, 466);
    expect(l.scale).toBeCloseTo(Math.min(359 / (vbW ?? 1), 466 / (vbH ?? 1)), 12);
  });
});
