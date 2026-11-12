import { describe, expect, test } from 'vitest';
import type { DistrictId } from '$data';
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

describe('KIT-R3 heart frames', () => {
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
