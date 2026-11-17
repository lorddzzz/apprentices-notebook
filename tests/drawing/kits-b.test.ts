import { describe, expect, it } from 'vitest';
import type { Drawing } from '$data';
import { COSTS, NEEDS } from '$data/drawing';
import { checkGenerated, GEN_KITS, generateRoom, HEART_FRAMES, specFor } from '$engine/drawing';
import { heatAt, heatSetup } from '$engine/drawing/kits/bathhouses';
import { heartDrawing, heartRoom, inputFor } from './fixtures';
import { SCRIPTS_B } from './kits-b.scripts';

/**
 * Pack J's kits and frames beyond the shared acceptance tests (EN-K4): what each frame
 * declares, which master stands on which ground, the heat and the span choice at every length.
 */

const MASTERS = ['bathSteward'] as const;
const kitOf = (district: string) => {
  const kit = GEN_KITS.find((k) => k.district === district);
  if (!kit) throw new RangeError(`No kit for ${district}`);
  return kit;
};
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

describe('Pack J frames (EN-K4)', () => {
  it('EN-K4: every frame takes its needs and cost from the drawing table', () => {
    for (const master of MASTERS) {
      const frame = HEART_FRAMES[master];
      expect(frame?.master).toBe(master);
      expect(frame?.cost).toBe(COSTS.hearts[master]);
      expect(frame?.needs.map((n) => n.reason)).toEqual((NEEDS[master] ?? []).map((n) => n.reason));
      expect(frame?.setup.foe).toBe(master);
      expect(frame?.escorts).toEqual([]);
      expect(SCRIPTS_B[master]?.length).toBeGreaterThan(0);
    }
  });

  it('EN-K4: the Steward stands on a connected cloud of four or more tiles', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { room, masterOnBoard } = heartRoom('bathSteward', seed);
      expect(masterOnBoard).toBe(true);
      const { width: w, height: h, tiles } = room.layout;
      const cloud = (x: number, y: number): boolean =>
        x >= 0 && y >= 0 && x < w && y < h && tiles[y * w + x]?.state?.id === 'cloud';
      const steward = room.layout.units.find((u) => u.def === 'bathSteward');
      expect(cloud(steward?.at.x ?? -1, steward?.at.y ?? -1)).toBe(true);
      const seen = new Set<string>([`${steward?.at.x},${steward?.at.y}`]);
      const queue = [steward?.at as { x: number; y: number }];
      for (let c = queue.pop(); c; c = queue.pop()) {
        for (const [dx, dy] of NEIGHBOURS) {
          const n = { x: c.x + dx, y: c.y + dy };
          if (cloud(n.x, n.y) && !seen.has(`${n.x},${n.y}`)) {
            seen.add(`${n.x},${n.y}`);
            queue.push(n);
          }
        }
      }
      expect(seen.size).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('Pack J kits (EN-K4)', () => {
  it('EN-K4: the boil-over brings its vents, and heat 1 to 4 is written out for every length', () => {
    const baths = kitOf('bathhouses');
    expect(baths.rules.map((r) => r.id)).toEqual(['bathhouses:boilOver']);
    expect(baths.shapes.map((s) => s.id)).toEqual(['bathhouses:heat']);
    expect(heatAt(0, 3)).toBe(1);
    const table = [3, 4, 5, 6].map((length) =>
      Array.from({ length }, (_, room) => heatAt(room, length)),
    );
    expect(table).toEqual([
      [1, 2, 4],
      [1, 2, 3, 4],
      [1, 1, 2, 3, 4],
      [1, 1, 2, 2, 3, 4],
    ]);
    const drawing: Drawing = { ...heartDrawing('bathSteward'), length: 4 };
    for (const seed of [1, 2, 3]) {
      for (let room = 0; room < 3; room++) {
        const input = inputFor(drawing, seed, room);
        const made = generateRoom(input);
        expect(checkGenerated(made.layout, specFor(input, seed))).toEqual([]);
        expect(made.layout.tiles.some((t) => t.terrain.vent)).toBe(true);
      }
    }
  }, 120_000);

  it('EN-K4: a cooled room runs one lower and never below 1, the heart never cooled', () => {
    const at = (room: number, length: number, pendingCool: number) =>
      heatSetup({ room, length, state: { pendingCool } }).rulesConfig?.['bathhouses:boilOver'];
    expect(at(1, 5, 1)).toEqual({ heat: 1 });
    expect(at(0, 5, 1)).toEqual({ heat: 1 });
    expect(at(3, 5, 1)).toEqual({ heat: 2 });
    expect(at(4, 5, 1)).toEqual({ heat: 4 });
  });
});
