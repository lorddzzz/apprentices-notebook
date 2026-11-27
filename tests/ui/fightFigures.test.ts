import { render } from 'svelte/server';
import { describe, expect, test, vi } from 'vitest';
import { EMPTY_OVERLAY } from '../../src/app/overlay';
import { viewOfSpec } from '../../src/app/view';
import { parseBoard } from '../../src/engine';
import BattleBoard from '../../src/ui/components/board/BattleBoard.svelte';
import { enemyArtId, figureSize } from '../../src/ui/components/board/fightArt';
import { byRow, FEET, FIGURE_SCALE } from '../../src/ui/components/board/figure';
import { CELL } from '../../src/ui/components/board/geometry';

/** FT-9, FT-10: figure art on the 128x176 canvas, drawn by row, HP under the foot, vector fallback. */

const shipped = vi.hoisted(() => ({ ids: new Set<string>() }));
vi.mock('../../src/ui/art/registry', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/ui/art/registry')>();
  return {
    ...real,
    artUrl: (id: string) => (shipped.ids.has(id) ? `/art/${id}.webp` : null),
    artSize: () => null,
  };
});

// A rat above the party's Draughtsman (D) in column 0, and a second rat beside the Draughtsman.
const BOARD = ['r . .', 'D r .', '. . .'].join('\n');

function view(maxHp?: number) {
  const v = viewOfSpec(parseBoard(BOARD));
  if (maxHp) for (const u of v.units) Object.assign(u, { hp: Math.min(u.hp, maxHp), maxHp });
  return v;
}
const html = (v = view(), props: Record<string, unknown> = {}) =>
  render(BattleBoard, {
    props: { view: v, kit: { district: 'seam', arena: false }, ontap: () => {}, ...props },
  }).body;

const hrefs = (out: string) => [...out.matchAll(/<image[^>]*href="([^"]+)"/g)].map((m) => m[1]);

describe('FT-9 unit figures', () => {
  test('a shipped figure draws as an <image> at the figure scale, feet at the baseline', () => {
    const rat = enemyArtId('rat');
    expect(rat).not.toBeNull();
    shipped.ids = new Set([rat as string]);
    const out = html();
    expect(hrefs(out)).toContain(`/art/${rat}.webp`);
    const size = figureSize(rat as never);
    expect(size).toEqual({ w: 128, h: 176, feetY: 160 });
    expect(out).toContain(`height="${176 * FIGURE_SCALE}"`);
    // The canvas hangs from its feet: top = FEET - 160 * scale, a third of a cell into the row above.
    expect(FEET - 160 * FIGURE_SCALE).toBeCloseTo(-CELL / 3 - 0.0, -1);
    expect(out).toContain(`y="${FEET - 160 * FIGURE_SCALE}"`);
  });

  test('only shipped figures draw an <image>; the rest keep their vector token', () => {
    shipped.ids = new Set();
    const zero = html();
    expect(hrefs(zero)).toEqual([]);
    expect(zero.match(/class="unit[ "]/g)).toHaveLength(3);
    shipped.ids = new Set([enemyArtId('rat') as string]);
    const one = html();
    expect(hrefs(one)).toHaveLength(2); // both rats; the Draughtsman has no art here and stays a vector
    expect(one.match(/class="unit[ "]/g)).toHaveLength(3);
  });

  test('no district, no art: the vector draws', () => {
    shipped.ids = new Set([enemyArtId('rat') as string]);
    expect(hrefs(html(view(), { kit: undefined }))).toEqual([]);
  });

  test('a party member draws from units/shared when shipped', () => {
    shipped.ids = new Set(['units/shared/draughtsman']);
    const out = html();
    expect(hrefs(out)).toEqual(['/art/units/shared/draughtsman.webp']);
    expect(out).toContain('data-rim="party"');
  });

  test('figures sort by row, then column', () => {
    const order = byRow(view().units).map((u) => `${u.pos.x},${u.pos.y}`);
    expect(order).toEqual(['0,0', '0,1', '1,1']);
    const out = html();
    const at = [...out.matchAll(/transform: translate\((\d+)px, (\d+)px\)/g)].map(
      (m) => `${Number(m[1]) / CELL},${Number(m[2]) / CELL}`,
    );
    expect(at).toEqual(order);
  });

  test('every cell has one hit rect and it is after all artwork', () => {
    shipped.ids = new Set([enemyArtId('rat') as string]);
    const out = html();
    expect(out.match(/class="hit/g)).toHaveLength(9);
    expect(out.indexOf('data-hit')).toBeGreaterThan(out.lastIndexOf('<image'));
    expect(out.indexOf('data-hit')).toBeGreaterThan(out.indexOf('data-layer="overlay"'));
  });
});

describe('FT-10 HP and selection', () => {
  const pips = (maxHp: number) => {
    const out = html(view(maxHp));
    const g = out.split('data-layer="hp"')[1] ?? '';
    const first = g.split('data-hp=')[1] ?? '';
    return { rects: (first.split('data-hp=')[0] ?? '').match(/<rect/g)?.length ?? 0, out, first };
  };

  test('HP sits in the overlay group, not in the figure', () => {
    const { out } = pips(6);
    expect(out.indexOf('data-layer="hp"')).toBeGreaterThan(out.indexOf('data-layer="overlay"'));
    const units = out.slice(out.indexOf('data-layer="units"'), out.indexOf('data-layer="overlay"'));
    expect(units).not.toContain('data-hp');
  });

  test('6 and 8 draw one pip each; 10 draws a number', () => {
    expect(pips(6).rects).toBe(6);
    expect(pips(8).rects).toBe(8);
    const ten = pips(10);
    expect(ten.rects).toBe(1); // the backing pill
    expect(ten.first).toMatch(/>\d+\/10</);
    expect(ten.first).not.toContain('--mono');
  });

  test('the selection ring has a dark, a light and a hue stroke (greyscale-safe)', () => {
    const v = view();
    const id = v.units[0]?.id;
    const out = html(v, { overlay: { ...EMPTY_OVERLAY, selected: id } });
    const ring = out.split('data-trait="selected"')[1]?.split('</g>')[0] ?? '';
    expect(ring).toContain('stroke="var(--ink)"');
    expect(ring).toContain('stroke="var(--parchment)"');
    expect(ring).toContain('stroke="var(--select)"');
  });
});
