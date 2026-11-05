import { describe, expect, test } from 'vitest';
import { BATH_ROOMS_12, PICKS_BY_HEAT, tableForHeat } from '$data/districts/bathhouses';
import { BOIL_CAPACITY_PIPS, HEAT, type HeatLevel } from '$data/districts/bathhouses/types';
import { parseBoard } from '$engine';
import type { Coord } from '$engine/grid';
import { checkRoom } from '$engine/rooms';

/**
 * BH-6 (bathhouses-plan): rooms 1 and 2, three layouts each. Room 1 is 6x8 at heat 1, room 2 is
 * 6x9 at heat 2. The bot play-through is tests/sim/bathhouse-rooms12-play.test.ts.
 */

const [one, two] = BATH_ROOMS_12;
if (!one || !two) throw new Error('missing room');
const ROOMS = [one, two];
const dist = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const defs = (layout: string): string =>
  parseBoard(layout)
    .units.map((u) => u.def)
    .sort()
    .join(',');

describe('bathhouse rooms 1 and 2 (BH-6)', () => {
  test('three layouts each, base heat 1 and 2, loot from the heat table', () => {
    expect(ROOMS.map((r) => r.heatBase)).toEqual([1, 2]);
    ROOMS.forEach((room, i) => {
      expect(room.variants).toHaveLength(3);
      expect(new Set(room.variants.map((v) => v.name)).size).toBe(3);
      expect(room.loot).toBe(tableForHeat((i + 1) as HeatLevel));
      expect(room.picks).toBe(PICKS_BY_HEAT[(i + 1) as HeatLevel]);
    });
  });

  test('every layout passes checkRoom at its size with four or more start points', () => {
    ROOMS.forEach((room, i) => {
      for (const v of room.variants) {
        expect(checkRoom(v.layout), v.name).toEqual([]);
        const spec = parseBoard(v.layout);
        expect([spec.width, spec.height], v.name).toEqual(i === 0 ? [6, 8] : [6, 9]);
        expect(spec.starts.length, v.name).toBeGreaterThanOrEqual(4);
      }
    });
  });

  test('rosters: room 1 attendant, boilerman, two rats; room 2 swaps a rat for a bather', () => {
    for (const v of one.variants)
      expect(defs(v.layout), v.name).toBe('attendant,boilerman,rat,rat');
    for (const v of two.variants)
      expect(defs(v.layout), v.name).toBe('attendant,boilerman,dissolvedBather,rat');
  });

  test('P is fair for a 5-6 HP body: three or more tiles from every foe, so no first-round hit', () => {
    for (const room of ROOMS)
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        for (const p of spec.starts)
          for (const u of spec.units)
            expect(dist(p, u.at), `${v.name} P by ${u.def}`).toBeGreaterThanOrEqual(3);
      }
  });

  test('one vent a room, the boilerman beside it, and the vent alone is slow to fill the gauge', () => {
    ROOMS.forEach((room, i) => {
      const row = HEAT[(i + 1) as HeatLevel];
      const capacity = BOIL_CAPACITY_PIPS * 4;
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        const vents = spec.tiles.flatMap((t, n) =>
          t.terrain.vent ? [{ x: n % spec.width, y: Math.floor(n / spec.width) }] : [],
        );
        expect(vents, v.name).toHaveLength(1);
        const man = spec.units.find((u) => u.def === 'boilerman');
        expect(man && vents[0] && dist(man.at, vents[0]), v.name).toBe(1);
        // The vent and the one cloud it lays each round: no party, no feeder.
        const rounds = Math.ceil(capacity / (row.ventQuarters + row.tileQuarters));
        expect(rounds, v.name).toBeGreaterThanOrEqual(4);
      }
    });
  });

  test('the bather starts dissolved in a cloud with an open tile beside it; room 1 has none', () => {
    for (const v of one.variants) expect(defs(v.layout)).not.toContain('dissolvedBather');
    for (const v of two.variants) {
      const spec = parseBoard(v.layout);
      const bather = spec.units.find((u) => u.def === 'dissolvedBather');
      if (!bather) throw new Error(`${v.name}: no bather`);
      const tile = (c: Coord) => spec.tiles[c.y * spec.width + c.x];
      expect(tile(bather.at)?.state?.id, v.name).toBe('cloud');
      const around = [
        { x: bather.at.x - 1, y: bather.at.y },
        { x: bather.at.x + 1, y: bather.at.y },
        { x: bather.at.x, y: bather.at.y - 1 },
        { x: bather.at.x, y: bather.at.y + 1 },
      ].filter((c) => c.x >= 0 && c.y >= 0 && c.x < spec.width && c.y < spec.height);
      expect(
        around.some((c) => !tile(c)?.state && !spec.units.some((u) => dist(u.at, c) === 0)),
        v.name,
      ).toBe(true);
    }
  });
});
