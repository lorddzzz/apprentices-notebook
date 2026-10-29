import { describe, expect, test } from 'vitest';
import { CANAL_ROOMS, MOOR_PIECE, MOORING_BONUS } from '$data/districts/canals';
import {
  type BoardSpec,
  compiledFor,
  createBattle,
  FOUNDERS,
  newProfile,
  parseBoard,
} from '$engine';
import { type Coord, step } from '$engine/grid';
import { checkRoom } from '$engine/rooms';
import { botFight } from '../sim/bot';

/**
 * CN-3 (canals-revisit P1, P2, P5): rooms 1 and 2 are re-laid, three layouts each. Room 1 is
 * 5×9 (one lane down a long quay), room 2 is 6×9 (a two-wide lane, the barge's run); both have
 * four start points. Authoring rules: no `P` on water, none beside a round-one foe except the
 * eel's flanks in room 1, and room 2's mooring lies a few drifts downstream of the crate.
 */

const ROOMS = [CANAL_ROOMS[0], CANAL_ROOMS[1]];
const specs = (room: (typeof CANAL_ROOMS)[number]) =>
  room.variants.map((v) => ({ name: v.name, spec: parseBoard(v.layout) }));

const adjacent = (a: Coord, b: Coord): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const at = (spec: BoardSpec, c: Coord) => spec.tiles[c.y * spec.width + c.x];
const foes = (spec: BoardSpec) => spec.units.filter((u) => u.kind === 'enemy' && u.def !== 'barge');

/** Drifts from `from` along the water arrows; the step count at which `to` is reached, or null. */
function driftsTo(spec: BoardSpec, from: Coord, to: Coord): number | null {
  let c = from;
  for (let n = 0; n <= spec.width * spec.height; n++) {
    if (c.x === to.x && c.y === to.y) return n;
    const dir = at(spec, c)?.terrain.water;
    if (!dir) return null;
    c = step(c, dir);
    if (c.x < 0 || c.y < 0 || c.x >= spec.width || c.y >= spec.height) return null;
  }
  return null;
}

describe('canal rooms 1 and 2 (CN-3)', () => {
  test('three layouts each, the three §5.5 names kept', () => {
    expect(ROOMS.map((r) => r?.variants.map((v) => v.name))).toEqual([
      ['The towpath', 'The coal wharf', 'The lamplit quay'],
      ['The drowned arcade', 'The eel steps', 'The lock cottage'],
    ]);
  });

  test('P1: every layout passes checkRoom at its size with four start points', () => {
    ROOMS.forEach((room, i) => {
      if (!room) throw new Error('missing room');
      for (const { name, spec } of specs(room)) {
        expect(checkRoom(room.variants.find((v) => v.name === name)?.layout ?? ''), name).toEqual(
          [],
        );
        expect([spec.width, spec.height], name).toEqual(i === 0 ? [5, 9] : [6, 9]);
        expect(spec.starts, name).toHaveLength(4);
      }
    });
  });

  test('P2: no start point on water, none beside a round-one foe (room 1: the eel excepted)', () => {
    ROOMS.forEach((room, i) => {
      if (!room) throw new Error('missing room');
      for (const { name, spec } of specs(room)) {
        for (const p of spec.starts) {
          expect(at(spec, p)?.terrain.water, `${name} P on water`).toBeFalsy();
          for (const f of foes(spec)) {
            if (i === 0 && f.def === 'eel') continue;
            expect(adjacent(p, f.at), `${name} P beside ${f.def}`).toBe(false);
          }
        }
      }
    });
  });

  test('P2: room 1 seats two start points beside the eel; room 2 none', () => {
    ROOMS.forEach((room, i) => {
      if (!room) throw new Error('missing room');
      for (const { name, spec } of specs(room)) {
        const eel = spec.units.filter((u) => u.def === 'eel');
        expect(eel, name).toHaveLength(1);
        const beside = spec.starts.filter((p) => adjacent(p, eel[0]?.at ?? { x: -9, y: -9 }));
        if (i === 0) expect(beside.length, name).toBeGreaterThanOrEqual(2);
        else expect(beside, name).toHaveLength(0);
      }
    });
  });

  test('foes: room 1 an eel and two rats; room 2 an eel, a rat and a moth', () => {
    const count = (spec: BoardSpec) =>
      foes(spec)
        .map((u) => u.def)
        .sort()
        .join(',');
    ROOMS.forEach((room, i) => {
      if (!room) throw new Error('missing room');
      for (const { name, spec } of specs(room)) {
        expect(count(spec), name).toBe(i === 0 ? 'eel,rat,rat' : 'eel,moth,rat');
      }
    });
  });

  test('room 1 has no barge and no mooring; room 2 has both and the mooring bonus', () => {
    const [one, two] = ROOMS;
    if (!one || !two) throw new Error('missing room');
    for (const { name, spec } of specs(one)) {
      expect(
        spec.units.some((u) => u.def === 'barge'),
        name,
      ).toBe(false);
      expect(
        spec.tiles.some((t) => t.piece),
        name,
      ).toBe(false);
    }
    expect(one).not.toHaveProperty('bonus');
    expect(CANAL_ROOMS[1]).toHaveProperty('bonus', MOORING_BONUS);
    for (const { name, spec } of specs(two)) {
      expect(
        spec.units.filter((u) => u.def === 'barge'),
        name,
      ).toHaveLength(1);
      expect(
        spec.tiles.filter((t) => t.piece),
        name,
      ).toHaveLength(1);
    }
  });

  test('P5: the crate sits on water and the current alone brings it to the mooring in 4–6 drifts', () => {
    const two = ROOMS[1];
    if (!two) throw new Error('missing room');
    for (const { name, spec } of specs(two)) {
      const crate = spec.units.find((u) => u.def === 'barge');
      const moorIdx = spec.tiles.findIndex((t) => t.piece?.id === MOOR_PIECE);
      if (!crate || moorIdx < 0) throw new Error(`${name}: crate or mooring missing`);
      expect(at(spec, crate.at)?.terrain.water, name).toBeTruthy();
      expect(
        at(spec, { x: moorIdx % spec.width, y: Math.floor(moorIdx / spec.width) })?.terrain.water,
        name,
      ).toBeTruthy();
      const moor = { x: moorIdx % spec.width, y: Math.floor(moorIdx / spec.width) };
      const n = driftsTo(spec, crate.at, moor);
      expect(n, name).not.toBeNull();
      expect(n ?? 0, name).toBeGreaterThanOrEqual(4);
      expect(n ?? 99, name).toBeLessThanOrEqual(6);
    }
  });
});

describe('canal rooms 1 and 2 play (CN-3)', () => {
  test('the bot wins every layout with the founding pair on fresh HP', () => {
    for (const room of ROOMS) {
      if (!room) throw new Error('missing room');
      for (const v of room.variants) {
        for (const seed of [1, 2, 3]) {
          const fight = botFight(
            createBattle({
              title: room.title,
              board: v.layout,
              seed,
              lineup: FOUNDERS,
              party: Object.fromEntries(
                FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
              ),
            }).state,
          );
          expect(fight.state.phase, `${v.name} seed ${seed}`).toBe('won');
        }
      }
    }
  });
});
