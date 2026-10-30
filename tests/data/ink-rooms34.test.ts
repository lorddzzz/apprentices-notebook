import { describe, expect, test } from 'vitest';
import { INK_LETTERS } from '$data/districts/inkQuarter/papers';
import { INK_ROOMS_12 } from '$data/districts/inkQuarter/rooms12';
import { HEART_RULES, INK_ROOMS_34, NOTARY_DESK } from '$data/districts/inkQuarter/rooms34';
import {
  compiledFor,
  createBattle,
  FOUNDERS,
  newProfile,
  parseBoard,
  returnCheck,
  startTrip,
} from '$engine';
import { CLOCK_RULE_ID } from '$engine/districts/inkQuarter/clock';
import { HEART_ROSTER } from '$engine/districts/inkQuarter/standIn';
import type { Coord } from '$engine/grid';
import { bankPages, pagesHeld } from '$engine/rivals/pages';
import { checkRoom } from '$engine/rooms';
import { listRules } from '$engine/rules';
import { awardsPage } from '$engine/standIn';
import { botFight } from '../sim/bot';

/**
 * IQ-10 (ink-quarter-plan P1, P3, P9, P10; design §1): rooms 3 and 4 and the heart, three
 * layouts each. Room 3 is 6x9 (adds forwarding); room 4 is 6x9 (all three writs); the heart is
 * 7x9 (the stand-in postmaster, a Sealer, two dead letters; the clock rule).
 */

const [three, four, heart] = INK_ROOMS_34;
if (!three || !four || !heart) throw new Error('missing room');
const ROOMS = [three, four, heart];
const adjacent = (a: Coord, b: Coord): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const pieceCount = (layout: string, id: string): number =>
  parseBoard(layout).tiles.filter((t) => t.piece?.id === id).length;
const defs = (layout: string): string =>
  parseBoard(layout)
    .units.map((u) => u.def)
    .sort()
    .join(',');

describe('ink rooms 3, 4 and the heart (IQ-10)', () => {
  test('three layouts each, passing checkRoom at their size with four or more start points', () => {
    ROOMS.forEach((room, i) => {
      expect(room.variants).toHaveLength(3);
      for (const v of room.variants) {
        expect(checkRoom(v.layout), v.name).toEqual([]);
        const spec = parseBoard(v.layout);
        expect([spec.width, spec.height], v.name).toEqual(i === 2 ? [7, 9] : [6, 9]);
        expect(spec.starts.length, v.name).toBeGreaterThanOrEqual(4);
      }
    });
  });

  test('no start point sits beside or on a foe or a writ', () => {
    for (const room of ROOMS)
      for (const v of room.variants) {
        const spec = parseBoard(v.layout);
        for (const p of spec.starts) {
          for (const u of spec.units)
            expect(adjacent(p, u.at), `${v.name} P by ${u.def}`).toBe(false);
          expect(spec.tiles[p.y * spec.width + p.x]?.piece, `${v.name} P on a writ`).toBeFalsy();
        }
      }
  });

  test('foes per room; the heart matches HEART_ROSTER', () => {
    for (const v of three.variants)
      expect(defs(v.layout), v.name).toBe(
        'deadLetter,deadLetter,deadLetter,deadLetter,deadLetter,sealer',
      );
    for (const v of four.variants)
      expect(defs(v.layout), v.name).toBe('deadLetter,deadLetter,deadLetter,sealer,sorter,sorter');
    for (const v of heart.variants)
      expect(defs(v.layout), v.name).toBe([...HEART_ROSTER].sort().join(','));
  });

  test('writs by room: room 3 adds a forward/address pair; room 4 has all three', () => {
    for (const v of three.variants) {
      expect(pieceCount(v.layout, 'inkQuarter:forward'), v.name).toBe(1);
      expect(pieceCount(v.layout, 'inkQuarter:address'), v.name).toBe(1);
      expect(pieceCount(v.layout, 'inkQuarter:return'), v.name).toBeGreaterThanOrEqual(1);
      expect(pieceCount(v.layout, 'inkQuarter:order'), v.name).toBe(0);
    }
    for (const v of four.variants) {
      expect(pieceCount(v.layout, 'inkQuarter:forward'), v.name).toBeGreaterThanOrEqual(1);
      expect(pieceCount(v.layout, 'inkQuarter:address'), v.name).toBeGreaterThanOrEqual(1);
      expect(pieceCount(v.layout, 'inkQuarter:return'), v.name).toBeGreaterThanOrEqual(1);
      expect(pieceCount(v.layout, 'inkQuarter:order'), v.name).toBeGreaterThanOrEqual(2);
    }
  });

  test("room 3's notary desk spot is a free tile in every layout", () => {
    for (const v of three.variants) {
      const spec = parseBoard(v.layout);
      const at = (c: Coord): boolean => c.x === NOTARY_DESK.x && c.y === NOTARY_DESK.y;
      expect(spec.tiles[NOTARY_DESK.y * spec.width + NOTARY_DESK.x]?.piece, v.name).toBeFalsy();
      expect(spec.starts.some(at), v.name).toBe(false);
      expect(
        spec.units.some((u) => at(u.at)),
        v.name,
      ).toBe(false);
    }
  });

  test('each room files its letter (rooms 1-2 too); only the heart is a heart', () => {
    const all = [...INK_ROOMS_12, ...INK_ROOMS_34];
    expect(all.map((r) => r.lore)).toEqual(INK_LETTERS.map((l) => l.id));
    expect(all.map((r) => r.heart)).toEqual([false, false, false, false, true]);
    expect(heart.picks).toBe(2);
    expect(HEART_RULES).toEqual([CLOCK_RULE_ID]);
  });

  test('clearing the heart awards no page, and the heart is a return point', () => {
    const p = newProfile();
    const v = heart.variants[0];
    if (!v) throw new Error('no variant');
    const b = structuredClone(
      createBattle({ title: heart.title, board: v.layout, seed: 1, lineup: FOUNDERS }).state,
    );
    for (const u of b.units) if (u.kind === 'enemy') u.hp = 0;
    expect(awardsPage({ def: 'postmaster' })).toBe(false);
    expect(pagesHeld(bankPages(p, b, 'inkQuarter', awardsPage))).toEqual([]);
    const shape = { ret: { kind: 'until', after: 0 } as const, length: 5 };
    const t = { ...startTrip(p, 3), encounter: 4 };
    expect(returnCheck(t, shape)).toEqual({ ok: true });
    expect(returnCheck({ ...t, encounter: 2 }, shape).ok).toBe(false);
  });

  test('the bot wins every layout over a seed sample (founding pair, fresh HP)', () => {
    const table: string[] = [];
    ROOMS.forEach((room, ri) => {
      for (const v of room.variants) {
        let wins = 0;
        const seeds = [1, 2];
        for (const seed of seeds) {
          const s0 = createBattle({
            title: room.title,
            board: v.layout,
            seed,
            lineup: FOUNDERS,
            party: Object.fromEntries(
              FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
            ),
          }).state;
          if (ri === 2) s0.rules = listRules(s0, [...HEART_RULES]);
          if (botFight(s0).state.phase === 'won') wins++;
        }
        table.push(`${v.name}: ${wins}/${seeds.length}`);
        expect(wins, v.name).toBeGreaterThanOrEqual(ri === 2 ? 1 : 2);
      }
    });
    if (process.env.INK_TABLE) process.stderr.write(`${table.join('\n')}\n`);
  });
});
