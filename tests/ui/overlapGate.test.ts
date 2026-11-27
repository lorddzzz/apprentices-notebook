import { render } from 'svelte/server';
import { describe, expect, test } from 'vitest';
import { parseBoard } from '$engine';
import { EMPTY_OVERLAY, type Overlay } from '../../src/app/overlay';
import { viewOfSpec } from '../../src/app/view';
import BattleBoard from '../../src/ui/components/board/BattleBoard.svelte';
import { at } from '../app/battleFixtures';

/** FT-12g, the structural half of the overlap gate (FT-D10): who draws above whom, and where marks sit. */

const board = ['. r .', '. D .', '. . r'].join('\n');
const overlay = (): Overlay => ({
  ...EMPTY_OVERLAY,
  highlights: [
    { kind: 'reach', at: at('A2') },
    { kind: 'aim', at: at('B2') },
    { kind: 'target', at: at('B2') },
    { kind: 'hurt', at: at('B2') },
  ],
  intents: [
    {
      from: at('B1'),
      path: [],
      hit: at('B2'),
      order: 1,
      attack: 'bite',
      dir: 'down',
      emphasis: 'normal',
    },
  ],
});
const html = () => {
  const view = viewOfSpec(parseBoard(board));
  const tile = (i: number) => view.tiles[i] as NonNullable<(typeof view.tiles)[number]>;
  tile(4).jar = { owner: 'x' as never, event: 'step', peek: null };
  tile(8).state = 'cloud';
  tile(8).rounds = 2;
  return render(BattleBoard, {
    props: { view, overlay: overlay(), kit: { district: 'seam' }, ontap: () => {} },
  }).body;
};

describe('overlap gate: draw order', () => {
  test('scene < tiles < units < overlay < fx < hit rects, in the markup', () => {
    const out = html();
    const order = ['scene', 'tiles', 'units', 'overlay', 'fx'].map((l) =>
      out.indexOf(`data-layer="${l}"`),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(out.indexOf('data-hit')).toBeGreaterThan(order[4] ?? 0);
  });

  test('HP, intents and the cast outline are above every figure and jar/cloud', () => {
    const out = html();
    const overlayAt = out.indexOf('data-layer="overlay"');
    const fxAt = out.indexOf('data-layer="fx"');
    const unitsAt = out.indexOf('data-layer="units"');
    const inOverlay = out.slice(overlayAt, fxAt);
    const inUnits = out.slice(unitsAt, overlayAt);
    expect(inOverlay).toContain('data-layer="hp"');
    expect(inOverlay.match(/data-hp="/g)).toHaveLength(3);
    expect(inOverlay).toContain('data-state="hurt"');
    expect(inOverlay).toContain('data-state="aim"');
    expect(inUnits).toContain('data-state="jar"');
    expect(inUnits).toContain('data-state="cloud"');
    expect(inUnits).not.toContain('data-layer="hp"');
    expect(inUnits).not.toContain('data-state="hurt"');
  });

  test('a vertically adjacent pair keeps one hit rect per cell, 100 x 100', () => {
    const out = html();
    const rects = [...out.matchAll(/<rect class="hit[ "][^>]*>/g)].map((m) => m[0]);
    expect(rects).toHaveLength(9);
    for (const r of rects)
      expect(r).toMatch(/width="100"[^>]*height="100"|height="100"[^>]*width="100"/);
  });
});

describe('overlap gate: fixed positions', () => {
  test('masked party harm sits in the top-right corner, above the HP row (y < 72)', () => {
    const out = html();
    const m = out.match(/<g data-state="hurt"[^>]*>[\s\S]*?<\/g>/)?.[0] ?? '';
    const cy = Number(m.match(/<circle[^>]*cy="([\d.]+)"/)?.[1]);
    // B2 is the cell at x 100..200, y 100..200: the mark's centre is 16 below the cell top.
    expect(cy).toBe(116);
    expect(cy - 100 + 13).toBeLessThan(72);
  });

  test('a jar sits above the HP row and below the intent badge', () => {
    const out = html();
    const m = out.match(/transform="translate\(([\d.]+) ([\d.]+)\)" data-state="jar"/);
    const top = Number(m?.[2]) - 100; // the cell top is y 100
    expect(top).toBeGreaterThanOrEqual(32);
    expect(top + 38).toBeLessThanOrEqual(72);
  });
});
