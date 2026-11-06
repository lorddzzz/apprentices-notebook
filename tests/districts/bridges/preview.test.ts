import { describe, expect, test } from 'vitest';
import { collapseStep } from '$engine/districts/bridges/collapse';
import { crackedSet, previewCollapse } from '$engine/districts/bridges/preview';
import { cracksOf, scanBridges } from '$engine/districts/bridges/support';
import { createRng } from '$engine/rng';
import { board, draft } from '../../scenarios/harness';

/** BR-4: the preview equals the real dusk result. */
const key = (c: { x: number; y: number }) => `${c.x},${c.y}`;

describe('BR-4 preview', () => {
  test('warn tiles on the falling set, pulses on grounded units, none on fliers', () => {
    const s = board('{pier} {span} . {span} S{span} m{span}');
    const shapes = previewCollapse(s, scanBridges(s));
    const tiles = shapes.filter((p) => p.kind === 'tile').map((p) => key(p.at));
    expect(tiles).toEqual(['3,0', '4,0', '5,0']);
    expect(shapes.filter((p) => p.kind === 'pulse').map((p) => key(p.at))).toEqual(['4,0']);
    expect(crackedSet(s).map(key)).toEqual(cracksOf(s).map(key));
  });

  test('a supported bridge previews nothing', () => {
    const s = board('{pier} {span} S r');
    expect(previewCollapse(s, scanBridges(s))).toEqual([]);
  });

  test('property: preview tiles and units equal what collapseStep drops', () => {
    const rng = createRng(4242);
    const tokens = ['.', '{span}', '{span}', '{span:1}', '{pier}', '{keystone:2}', 'r', 'm', 'b'];
    for (let n = 0; n < 40; n++) {
      const row = (): string =>
        Array.from({ length: 5 }, () => {
          const t = tokens[rng.int(0, tokens.length - 1)] as string;
          return rng.next() < 0.25 && t.startsWith('{span') ? `r${t}` : t;
        }).join(' ');
      const s = board(`${row()}\n${row()}\nS . . . .`);
      const own = scanBridges(s);
      const shapes = previewCollapse(s, own);
      const r = draft(s, (ctx) => {
        collapseStep(ctx, own);
      });
      const ev = r.events.find((e) => e.type === 'bridges:collapse') as unknown as
        | { data: { tiles: { x: number; y: number }[]; units: string[] } }
        | undefined;
      const tiles = shapes.filter((p) => p.kind === 'tile').map((p) => key(p.at));
      const units = shapes
        .filter((p) => p.kind === 'pulse')
        .map((p) => s.units.find((u) => key(u.pos) === key(p.at))?.id)
        .sort();
      if (!ev) {
        expect(tiles).toEqual([]);
        expect(units).toEqual([]);
        continue;
      }
      expect(tiles).toEqual(ev.data.tiles.map(key));
      expect(units).toEqual([...ev.data.units].sort());
    }
  });
});
