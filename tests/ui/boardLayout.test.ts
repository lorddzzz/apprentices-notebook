import { render } from 'svelte/server';
import { describe, expect, test, vi } from 'vitest';
import { viewOfSpec } from '../../src/app/view';
import { parseBoard } from '../../src/engine';
import { sceneRect, stampsOf, TILE_STAMP } from '../../src/ui/components/board/art';
import BattleBoard from '../../src/ui/components/board/BattleBoard.svelte';

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

/** FT-6, FT-7, FT-8: the five layers, the read-only board, the scene and the material stamps. */

const shipped = vi.hoisted(() => ({ ids: new Set<string>() }));
vi.mock('../../src/ui/art/registry', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/ui/art/registry')>();
  return {
    ...real,
    artUrl: (id: string) => (shipped.ids.has(id) ? `/art/${id}.webp` : null),
    artSize: () => null,
  };
});

const BOARD = ['D S .', 'o r *', '. ~ {wall}'].join('\n');
const view = () => viewOfSpec(parseBoard(BOARD));
const html = (props: Record<string, unknown>) =>
  render(BattleBoard, { props: { view: view(), ...props } }).body;

describe('FT-8 BattleBoard layers', () => {
  test('layers appear in order scene<tiles<units<overlay<fx', () => {
    const out = html({ ontap: () => {} });
    const at = ['scene', 'tiles', 'units', 'overlay', 'fx'].map((l) =>
      out.indexOf(`data-layer="${l}"`),
    );
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // The hit rects come after every layer, above all artwork.
    expect(out.indexOf('data-hit')).toBeGreaterThan(at[4] ?? Infinity);
  });

  test('the scrim covers scene, tiles and units but sits below the overlay', () => {
    const out = html({ ontap: () => {}, beat: { kind: 'burst', name: 'Burst', first: false } });
    const scrim = out.indexOf('data-scrim');
    expect(scrim).toBeGreaterThan(out.indexOf('data-layer="units"'));
    expect(scrim).toBeLessThan(out.indexOf('data-layer="overlay"'));
    expect(html({ ontap: () => {} })).not.toContain('data-scrim');
  });

  test('readonly renders no hit rects and no focusable cells', () => {
    const live = html({ ontap: () => {} });
    expect(live).toMatch(/class="hit[ "]/);
    expect(live).toContain('tabindex="0"');
    const ro = html({ readonly: true });
    expect(ro).not.toMatch(/class="hit[ "]/);
    expect(ro).not.toContain('data-hit');
    expect(ro).not.toContain('tabindex');
    expect(ro).not.toContain('role="button"');
  });
});

describe('FT-6 SceneLayer', () => {
  test('a district with no shipped art draws the vector wash; no district draws nothing', () => {
    shipped.ids.clear();
    expect(html({ kit: { district: 'seam' } })).toContain('data-scene="wash"');
    expect(html({ kit: { district: 'canals' } })).toContain('data-scene="wash"');
    expect(html({})).not.toContain('data-scene');
    expect(html({ kit: { district: 'seam' } })).not.toContain('<image');
  });

  test('shipped scene art is an <image> with its real href, covering the board', () => {
    shipped.ids.add('scenes/seam/fight');
    try {
      const out = html({ kit: { district: 'seam' } });
      expect(out).toContain('data-scene="art"');
      expect(out).toContain('href="/art/scenes/seam/fight.webp"');
    } finally {
      shipped.ids.clear();
    }
    const r = sceneRect(6, 6, 'scenes/seam/fight');
    expect(r.w).toBeGreaterThanOrEqual(624 - 1e-9);
    expect(r.h).toBeGreaterThanOrEqual(624 - 1e-9);
    expect(r.x).toBeLessThanOrEqual(-24 + 1e-9);
    expect(r.x + r.w).toBeGreaterThanOrEqual(600 - 1e-9);
  });
});

describe('FT-7 TileLayer', () => {
  test('every material has its own stamp silhouette, so none needs colour', () => {
    const paths = Object.values(TILE_STAMP).map((s) => s.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test('a tile wears the stamp of its layer or terrain; clouds wear none', () => {
    const base = { vent: false };
    expect(stampsOf({ ...base, state: 'fire' })).toEqual(['fire']);
    expect(stampsOf({ ...base, state: 'cloud' })).toEqual([]);
    expect(stampsOf({ ...base, state: null, water: 'down' })).toEqual(['water']);
    expect(stampsOf({ ...base, state: 'wall', water: 'down' })).toEqual(['wall', 'water']);
    expect(stampsOf({ ...base, state: null })).toEqual([]);
  });

  test('tile art replaces the vector body but the stamp stays vector', () => {
    shipped.ids.add('tiles/seam/slick');
    try {
      const out = html({ kit: { district: 'seam' } });
      expect(out).toContain('href="/art/tiles/seam/slick.webp"');
      expect(out).toContain('data-art="slick"');
      expect(out).toContain('data-stamp="slick"');
      expect(out).not.toContain('data-state="slick"');
    } finally {
      shipped.ids.clear();
    }
    const plain = html({ kit: { district: 'seam' } });
    expect(plain).toContain('data-state="slick"');
    expect(plain).toContain('data-stamp="slick"');
  });
});
