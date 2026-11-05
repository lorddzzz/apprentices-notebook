import { describe, expect, test } from 'vitest';
import { DISTRICT_IDS } from '$data';
import {
  BATH_ROOMS_34,
  LANDMARK_MOSAIC,
  LANDMARK_VARIANT,
  PICKS_BY_HEAT,
  TOWEL_BEARER_SPOT,
  tableForHeat,
} from '$data/districts/bathhouses';
import { BOIL_CAPACITY_PIPS, HEAT, type HeatLevel } from '$data/districts/bathhouses/types';
import { parseBoard } from '$engine';
import type { Coord } from '$engine/grid';
import { createRng, deriveSeed } from '$engine/rng';
import { checkRoom } from '$engine/rooms';

/** BH-7 (bathhouses-plan): rooms 3 and 4, three layouts each, 7x9. Play-through: tests/sim. */

const [three, four] = BATH_ROOMS_34;
if (!three || !four) throw new Error('missing room');
const ROOMS = [three, four];
const dist = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const defs = (layout: string): string =>
  parseBoard(layout)
    .units.map((u) => u.def)
    .sort()
    .join(',');

describe('bathhouse rooms 3 and 4 (BH-7)', () => {
  test('three layouts each, base heat 3 and 4, loot from the heat table', () => {
    expect(ROOMS.map((r) => r.heatBase)).toEqual([3, 4]);
    ROOMS.forEach((room, i) => {
      const h = (i + 3) as HeatLevel;
      expect(room.variants).toHaveLength(3);
      expect(new Set(room.variants.map((v) => v.name)).size).toBe(3);
      expect(room.loot).toBe(tableForHeat(h));
      expect(room.picks).toBe(PICKS_BY_HEAT[h]);
      expect(room.depth).toBe(i + 3);
    });
  });

  test('every layout passes checkRoom at 7x9 with four or more start points', () => {
    for (const room of ROOMS)
      for (const v of room.variants) {
        expect(checkRoom(v.layout), v.name).toEqual([]);
        const spec = parseBoard(v.layout);
        expect([spec.width, spec.height], v.name).toEqual([7, 9]);
        expect(spec.starts.length, v.name).toBeGreaterThanOrEqual(4);
      }
  });

  test('rosters: room 3 attendant, boilerman, rat, two bathers; room 4 two attendants, boilerman, two bathers', () => {
    for (const v of three.variants)
      expect(defs(v.layout), v.name).toBe(
        'attendant,boilerman,dissolvedBather,dissolvedBather,rat',
      );
    for (const v of four.variants)
      expect(defs(v.layout), v.name).toBe(
        'attendant,attendant,boilerman,dissolvedBather,dissolvedBather',
      );
  });

  test('P is fair for a 5-6 HP body: three or more tiles from every foe', () => {
    for (const room of ROOMS)
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        for (const p of spec.starts)
          for (const u of spec.units)
            expect(dist(p, u.at), `${v.name} P by ${u.def}`).toBeGreaterThanOrEqual(3);
      }
  });

  test('one vent a room with the boilerman beside it; the vent alone is slow to fill the gauge', () => {
    ROOMS.forEach((room, i) => {
      const row = HEAT[(i + 3) as HeatLevel];
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        const vents = spec.tiles.flatMap((t, n) =>
          t.terrain.vent ? [{ x: n % spec.width, y: Math.floor(n / spec.width) }] : [],
        );
        expect(vents, v.name).toHaveLength(1);
        const man = spec.units.find((u) => u.def === 'boilerman');
        expect(man && vents[0] && dist(man.at, vents[0]), v.name).toBe(1);
        const rounds = Math.ceil((BOIL_CAPACITY_PIPS * 4) / (row.ventQuarters + row.tileQuarters));
        // Heat 4's vent is 3 rounds; heat 3's is 4.
        expect(rounds, v.name).toBeGreaterThanOrEqual(i === 0 ? 4 : 3);
      }
    });
  });

  test('every bather starts dissolved in a cloud with an open tile beside it', () => {
    for (const room of ROOMS)
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        const tile = (c: Coord) => spec.tiles[c.y * spec.width + c.x];
        for (const bather of spec.units.filter((u) => u.def === 'dissolvedBather')) {
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
      }
  });

  test('the landmark: the pool hall variant holds the towel-bearer spot on an empty tile', () => {
    const v = three.variants[LANDMARK_VARIANT];
    expect(v?.name).toBe('The long pool hall');
    const spec = parseBoard(v?.layout ?? '');
    const at = TOWEL_BEARER_SPOT;
    expect(spec.units.some((u) => dist(u.at, at) === 0)).toBe(false);
    expect(spec.starts.some((p) => dist(p, at) === 0)).toBe(false);
    const t = spec.tiles[at.y * spec.width + at.x];
    expect(t?.terrain.vent).toBeFalsy();
    expect(t?.state).toBeFalsy();
    expect(LANDMARK_MOSAIC.length).toBeGreaterThan(0);
  });

  test('the landmark variant is selectable by seed (the draw variantFor makes for room 3)', () => {
    // variantFor salt for a kit district: 3000 + 100 * district index + encounter (room 3 = 2).
    const salt = 3000 + 100 * DISTRICT_IDS.indexOf('bathhouses') + 2;
    const picks = new Set<number>();
    for (let seed = 1; seed <= 60; seed++)
      picks.add(createRng(deriveSeed(seed, salt)).int(0, three.variants.length - 1));
    expect(picks.has(LANDMARK_VARIANT)).toBe(true);
    expect(picks.size).toBe(3);
  });
});
