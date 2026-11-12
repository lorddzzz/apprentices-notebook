import { describe, expect, test } from 'vitest';
import type { DistrictId } from '$data';
import { BATH_HEART } from '$data/districts/bathhouses';
import { CANAL_ROOMS } from '$data/districts/canals';
import { SEAM_ROOMS } from '$data/districts/seam';
import { KIT } from '$engine/districts';
import { HEART_ROSTER } from '$engine/districts/inkQuarter/postmaster';
import type { HeartSetup } from '$engine/districts/types';
import { type BoardSpec, parseBoard, serializeBoard } from '$engine/notation';
import { checkRoom, ROOM_LIMITS } from '$engine/rooms';

/**
 * KIT-R3 heart frames. `blank(w, h)` is an empty board and `heartOf` reads a district's registered
 * heart; each district's test (KIT-R3b copies the ink quarter's) checks that the frame is pure and
 * seeded, places the master and its roster without stacking, and passes `checkRoom` on legal sizes.
 */

const blank = (w: number, h: number): BoardSpec =>
  parseBoard(Array.from({ length: h }, () => Array(w).fill('.').join(' ')).join('\n'));

const heartOf = (id: DistrictId): HeartSetup => {
  const heart = KIT.modules[id]?.heart;
  if (!heart) throw new Error(`${id} registers no heart`);
  return heart;
};

const foesOf = (b: BoardSpec): string[] =>
  b.units
    .filter((u) => u.kind === 'enemy')
    .map((u) => u.def)
    .sort();

/** The ink frame's boards before the helper took over its steps (7x9, seeds 1-4). */
const INK_RECORDED: readonly string[] = [
  '. x       . .        . z       .\n. .       . .        p .       .\n. x       . .        . .       .\n. .       . .        . .       .\n. .       . {return} . .       .\n. {order} . .        . {order} .\n. .       . .        . .       .\n. .       . .        . .       .\nP P       P P        . .       .',
  '. x       . .        . z       .\n. .       . .        p .       .\n. x       . .        . .       .\n. .       . .        . .       .\n. .       . {return} . .       .\n. {order} . .        . {order} .\n. .       . .        . .       .\n. .       . .        . .       .\nP P       P P        . .       .',
  '. z       . .        . x       .\n. .       . .        p .       .\n. .       . .        . x       .\n. .       . .        . .       .\n. .       . {return} . .       .\n. {order} . .        . {order} .\n. .       . .        . .       .\n. .       . .        . .       .\nP P       P P        . .       .',
  '. x       . .        . z       .\n. .       . .        p .       .\n. x       . .        . .       .\n. .       . .        . .       .\n. .       . {return} . .       .\n. {order} . .        . {order} .\n. .       . .        . .       .\n. .       . .        . .       .\nP P       P P        . .       .',
];

/**
 * The shared loop: the master and its roster on each size (5x5, 7x9, the real room size and two
 * more), seeded, no stacked tiles, enough starts, `checkRoom` clean on legal sizes.
 */
function checkFrame(id: DistrictId, source: string, master: string, realSize: [number, number]) {
  const heart = heartOf(id);
  expect(heart.foe).toBe(master);
  const roster = foesOf(parseBoard(source));
  expect(roster).toContain(master);
  for (const [w, h] of [[5, 5], [7, 9], realSize, [5, 6]] as const) {
    for (const seed of [1, 2, 3, 4]) {
      const framed = heart.frame(blank(w, h), seed);
      expect([framed.width, framed.height]).toEqual([w, h]);
      expect(foesOf(framed)).toEqual(roster);
      const cells = framed.units.map((u) => `${u.at.x},${u.at.y}`);
      expect(new Set(cells).size).toBe(cells.length);
      expect(framed.starts.length).toBeGreaterThanOrEqual(ROOM_LIMITS.minStarts);
      expect(heart.frame(blank(w, h), seed)).toEqual(framed);
      if (h >= ROOM_LIMITS.minHeight) expect(checkRoom(serializeBoard(framed))).toEqual([]);
    }
  }
  const seen = new Set(
    [1, 2, 3, 4, 5, 6, 7, 8].map((s) => serializeBoard(heart.frame(blank(7, 9), s))),
  );
  expect(seen.size).toBeGreaterThan(1);
}

const firstHeart = (
  rooms: readonly { heart?: boolean; variants?: readonly { layout: string }[] }[],
) => {
  const layout = rooms.find((r) => r.heart)?.variants?.[0]?.layout;
  if (!layout) throw new Error('no authored heart');
  return layout;
};
const sizeOf = (layout: string): [number, number] => {
  const b = parseBoard(layout);
  return [b.width, b.height];
};

describe('KIT-R3 heart frames', () => {
  test('KIT-R3: seam frame places the Marginalia on 5x5, 7x9 and the real room size, seeded', () => {
    const layout = firstHeart(SEAM_ROOMS);
    checkFrame('seam', layout, 'marginalia', sizeOf(layout));
    expect(heartOf('seam').rules).toEqual([]);
  });

  test('KIT-R3: canals frame places the lamp-mother on 5x5, 7x9 and the real room size, seeded', () => {
    const layout = firstHeart(CANAL_ROOMS);
    checkFrame('canals', layout, 'mother', sizeOf(layout));
    expect(heartOf('canals').rules).toContain('canals:current');
  });

  test("KIT-R3: canals frame's current is one closed loop and the lamp-mother stands on it", () => {
    const step = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] } as const;
    for (const [w, h] of [
      [5, 5],
      [5, 6],
      [7, 8],
      [7, 9],
    ] as const) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const framed = heartOf('canals').frame(blank(w, h), seed);
        const water = new Map<string, keyof typeof step>();
        framed.tiles.forEach((t, i) => {
          if (t.terrain.water) water.set(`${i % w},${Math.floor(i / w)}`, t.terrain.water);
        });
        expect(water.size).toBeGreaterThanOrEqual(8);
        const start = [...water.keys()][0] as string;
        const seen = new Set<string>();
        let at = start;
        do {
          seen.add(at);
          const dir = water.get(at);
          if (!dir) throw new Error(`the current leaves the loop at ${at}`);
          const [x, y] = at.split(',').map(Number) as [number, number];
          at = `${x + step[dir][0]},${y + step[dir][1]}`;
        } while (at !== start && seen.size <= water.size);
        expect(at).toBe(start);
        expect(seen.size).toBe(water.size);
        // Clockwise: the top row runs right, the bottom row left, and it clears the bottom rows.
        const xs = [...water.keys()].map((k) => Number(k.split(',')[0]));
        const ys = [...water.keys()].map((k) => Number(k.split(',')[1]));
        const [top, bottom] = [Math.min(...ys), Math.max(...ys)];
        expect(bottom - top).toBeGreaterThanOrEqual(2);
        expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThanOrEqual(2);
        expect(bottom).toBeLessThanOrEqual(h - 3);
        for (const [k, dir] of water) {
          const [x, y] = k.split(',').map(Number) as [number, number];
          if (y === top && x < Math.max(...xs)) expect(dir).toBe('right');
          if (y === bottom && x > Math.min(...xs)) expect(dir).toBe('left');
        }
        const mother = framed.units.find((u) => u.def === 'mother');
        expect(mother && water.has(`${mother.at.x},${mother.at.y}`)).toBe(true);
      }
    }
  });

  test('KIT-R3: bathhouses frame places the Bath-Steward on 5x5, 7x9 and the real room size, seeded', () => {
    const layout = firstHeart([BATH_HEART]);
    checkFrame('bathhouses', layout, 'bathSteward', sizeOf(layout));
    expect(heartOf('bathhouses').rules).toContain('bathhouses:boilOver');
  });

  test('KIT-R3: bathhouses frame stands the Steward on a connected cloud of four or more tiles', () => {
    for (const [w, h] of [
      [5, 5],
      [5, 6],
      [7, 8],
      [7, 9],
    ] as const) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const framed = heartOf('bathhouses').frame(blank(w, h), seed);
        const steward = framed.units.find((u) => u.def === 'bathSteward');
        const cloud = (x: number, y: number): boolean =>
          x >= 0 && y >= 0 && x < w && y < h && framed.tiles[y * w + x]?.state?.id === 'cloud';
        if (!steward) throw new Error('no Steward');
        expect(cloud(steward.at.x, steward.at.y)).toBe(true);
        const seen = new Set<string>([`${steward.at.x},${steward.at.y}`]);
        const queue = [steward.at];
        for (let c = queue.pop(); c; c = queue.pop()) {
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const n = { x: c.x + dx, y: c.y + dy };
            if (cloud(n.x, n.y) && !seen.has(`${n.x},${n.y}`)) {
              seen.add(`${n.x},${n.y}`);
              queue.push(n);
            }
          }
        }
        expect(seen.size).toBeGreaterThanOrEqual(4);
      }
    }
  });

  test("KIT-R3: the frame helper leaves the ink frame's boards unchanged", () => {
    const heart = heartOf('inkQuarter');
    const got = [1, 2, 3, 4].map((seed) => serializeBoard(heart.frame(blank(7, 9), seed)));
    expect(got).toEqual(INK_RECORDED);
  });

  test('KIT-R3: inkQuarter frame places the postmaster on 5x5, 7x9 and the real room size, seeded', () => {
    const heart = heartOf('inkQuarter');
    expect(heart.foe).toBe('postmaster');
    expect(heart.rules).toContain('inkQuarter:clock');
    const roster = [...HEART_ROSTER].sort();
    for (const [w, h] of [
      [5, 5],
      [7, 9],
      [6, 8],
      [5, 6],
    ] as const) {
      for (const seed of [1, 2, 3, 4]) {
        const framed = heart.frame(blank(w, h), seed);
        expect([framed.width, framed.height]).toEqual([w, h]);
        expect(foesOf(framed)).toEqual(roster);
        const cells = framed.units.map((u) => `${u.at.x},${u.at.y}`);
        expect(new Set(cells).size).toBe(cells.length);
        expect(framed.starts.length).toBeGreaterThanOrEqual(ROOM_LIMITS.minStarts);
        // Seeded and pure: same seed, same board.
        expect(heart.frame(blank(w, h), seed)).toEqual(framed);
        // Legal sizes pass the room check (5x5 is a test board, below the limit).
        if (h >= ROOM_LIMITS.minHeight) expect(checkRoom(serializeBoard(framed))).toEqual([]);
      }
    }
    const seen = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((s) => serializeBoard(heart.frame(blank(7, 9), s))),
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});
