import { describe, expect, test } from 'vitest';
import { INK_ROOMS_12 } from '$data/districts/inkQuarter/rooms12';
import { compiledFor, createBattle, FOUNDERS, newProfile, parseBoard } from '$engine';
import { type Coord } from '$engine/grid';
import { checkRoom } from '$engine/rooms';
import { botFight } from '../sim/bot';

/**
 * IQ-9 (ink-quarter-plan P1, design §1): rooms 1 and 2 of the ink-makers' quarter, three
 * layouts each. Room 1 is 6x8 (return stamps, dead letters); room 2 is 6x9 (adds the standing
 * order and a Sorter).
 */

const [one, two] = INK_ROOMS_12;
if (!one || !two) throw new Error('missing room');
const ROOMS = [one, two];
const adjacent = (a: Coord, b: Coord): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const pieceCount = (layout: string, id: string): number =>
  parseBoard(layout).tiles.filter((t) => t.piece?.id === id).length;

describe('ink rooms 1 and 2 (IQ-9)', () => {
  test('three layouts each, passing checkRoom at their size with four or more start points', () => {
    ROOMS.forEach((room, i) => {
      expect(room.variants).toHaveLength(3);
      for (const v of room.variants) {
        expect(checkRoom(v.layout), v.name).toEqual([]);
        const spec = parseBoard(v.layout);
        expect([spec.width, spec.height], v.name).toEqual(i === 0 ? [6, 8] : [6, 9]);
        expect(spec.starts.length, v.name).toBeGreaterThanOrEqual(4);
      }
    });
  });

  test('no start point sits beside or on a foe or a writ', () => {
    for (const room of ROOMS) {
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        for (const p of spec.starts) {
          for (const u of spec.units)
            expect(adjacent(p, u.at), `${v.name} P by ${u.def}`).toBe(false);
          const t = spec.tiles[p.y * spec.width + p.x];
          expect(t?.piece, `${v.name} P on a writ`).toBeFalsy();
        }
      }
    }
  });

  test('foes per room: room 1 three dead letters; room 2 a Sorter and two dead letters', () => {
    const defs = (layout: string) =>
      parseBoard(layout)
        .units.map((u) => u.def)
        .sort()
        .join(',');
    for (const v of one.variants)
      expect(defs(v.layout), v.name).toBe('deadLetter,deadLetter,deadLetter');
    for (const v of two.variants)
      expect(defs(v.layout), v.name).toBe('deadLetter,deadLetter,sorter');
  });

  test('writs by room: room 1 return only (3+ stamps); room 2 adds orders (2+)', () => {
    for (const v of one.variants) {
      expect(pieceCount(v.layout, 'inkQuarter:return'), v.name).toBeGreaterThanOrEqual(3);
      expect(pieceCount(v.layout, 'inkQuarter:order'), v.name).toBe(0);
    }
    for (const v of two.variants) {
      expect(pieceCount(v.layout, 'inkQuarter:return'), v.name).toBeGreaterThanOrEqual(1);
      expect(pieceCount(v.layout, 'inkQuarter:order'), v.name).toBeGreaterThanOrEqual(2);
    }
  });

  test('no forwarding, address or seal pieces yet (rooms 3 and 4)', () => {
    for (const room of ROOMS)
      for (const v of room.variants) {
        expect(pieceCount(v.layout, 'inkQuarter:forward'), v.name).toBe(0);
        expect(pieceCount(v.layout, 'inkQuarter:wax'), v.name).toBe(0);
      }
  });

  test('the bot wins every layout over a seed sample (founding pair, fresh HP)', () => {
    const table: string[] = [];
    for (const room of ROOMS) {
      for (const v of room.variants) {
        let wins = 0;
        const seeds = [1, 2, 3, 4, 5];
        for (const seed of seeds) {
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
          if (fight.state.phase === 'won') wins++;
        }
        table.push(`${v.name}: ${wins}/${seeds.length}`);
        expect(wins, v.name).toBeGreaterThanOrEqual(4);
      }
    }
    if (process.env.INK_TABLE) console.log(table.join('\n'));
  });
});
