import { describe, expect, test } from 'vitest';
import { MEMBERS } from '$data';
import { SEAM_ROOMS } from '$data/districts/seam';
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
import type { BattleState } from '$engine/types';
import { botFight } from '../sim/bot';

/**
 * SM-3 (seam-grows P1, P4; Seam §1 "Re-laying"): the base Seam's rooms re-laid at per-place sizes,
 * at least four start points, tuned for two. Depth 1 bites on turn 1 whatever the draw; no other
 * start point sits beside a foe; every variant of a depth carries that depth's hearing setups.
 */

const at = (spec: BoardSpec, c: Coord) => spec.tiles[c.y * spec.width + c.x];
const adjacent = (a: Coord, b: Coord): boolean => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const coords = (spec: BoardSpec): Coord[] =>
  spec.tiles.map((_, i) => ({ x: i % spec.width, y: Math.floor(i / spec.width) }));
const foes = (spec: BoardSpec) => spec.units.filter((u) => u.kind === 'enemy');
const isState = (spec: BoardSpec, c: Coord, id: string): boolean =>
  c.x >= 0 && c.y >= 0 && c.x < spec.width && c.y < spec.height && at(spec, c)?.state?.id === id;

/** Runs of `n` or more tiles of state `id` in a row or column; each run as its tiles. */
function runs(spec: BoardSpec, id: string, n: number): Coord[][] {
  const out: Coord[][] = [];
  for (const d of [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ]) {
    for (const c of coords(spec)) {
      if (!isState(spec, c, id) || isState(spec, { x: c.x - d.x, y: c.y - d.y }, id)) continue;
      const run: Coord[] = [];
      for (let p = c; isState(spec, p, id); p = { x: p.x + d.x, y: p.y + d.y }) run.push(p);
      if (run.length >= n) out.push(run);
    }
  }
  return out;
}
const onEdgeAlong = (spec: BoardSpec, run: Coord[]): boolean => {
  const a = run[0] as Coord;
  const b = run[run.length - 1] as Coord;
  const horizontal = a.y === b.y;
  return horizontal ? a.x === 0 || b.x === spec.width - 1 : a.y === 0 || b.y === spec.height - 1;
};

/** The P4 hearing setups a board carries. */
function setups(spec: BoardSpec) {
  const vents = spec.tiles.filter((t) => t.terrain.vent);
  return {
    oilLineByWall: runs(spec, 'slick', 3).some((r) => onEdgeAlong(spec, r)),
    oilLine: runs(spec, 'slick', 3).length > 0,
    plates: spec.tiles.filter((t) => t.state?.id === 'plate').length >= 2,
    plateRun: runs(spec, 'plate', 2).length > 0,
    vent: vents.length > 0,
    ventCloud: vents.some((t) => t.state?.id === 'cloud'),
  };
}

const ROOMS = SEAM_ROOMS;
const variants = ROOMS.flatMap((room, depth) =>
  room.variants.map((v) => ({ depth, name: v.name, layout: v.layout, spec: parseBoard(v.layout) })),
);

/** The board with the founders on start points `i` and `j` and the other start points cleared. */
function seated(layout: string, i: number, j: number): string {
  const [first, second] = FOUNDERS.map((id) => MEMBERS[id].token);
  let n = -1;
  return layout
    .split('\n')
    .map((row) =>
      row
        .split(' ')
        .map((tok) => {
          if (!tok.startsWith('P')) return tok;
          n++;
          const rest = tok.slice(1) || '';
          if (n === i) return `${first}${rest}`;
          if (n === j) return `${second}${rest}`;
          return rest || '.';
        })
        .join(' '),
    )
    .join('\n');
}

/** Every seating of the pair on two start points (both orders). */
function seatings(layout: string, starts: number): BattleState[] {
  const party = Object.fromEntries(
    FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
  );
  const out: BattleState[] = [];
  for (let i = 0; i < starts; i++) {
    for (let j = 0; j < starts; j++) {
      if (i === j) continue;
      out.push(createBattle({ title: 't', board: seated(layout, i, j), seed: 1, party }).state);
    }
  }
  return out;
}

/** Foes telegraphing an attack at an apprentice beside them (range 1) on turn 1. */
const bitesNow = (s: BattleState) =>
  s.units.filter((u) => {
    if (u.kind !== 'enemy' || u.hp <= 0 || u.intent?.kind !== 'attack') return false;
    const target = step(u.pos, u.intent.dir);
    return s.units.some((m) => m.kind === 'member' && m.pos.x === target.x && m.pos.y === target.y);
  });

describe('Seam rooms re-laid (SM-3)', () => {
  test('per-place sizes; every layout passes checkRoom with at least four start points', () => {
    const sizes = [
      ['5x6', '6x6', '6x6'],
      ['6x7', '6x7', '6x7'],
      ['6x8', '7x8', '7x8'],
      ['7x8', '7x8', '7x8'],
    ];
    ROOMS.forEach((room, d) => {
      expect(
        room.variants.map((v) => {
          const s = parseBoard(v.layout);
          return `${s.width}x${s.height}`;
        }),
        room.id,
      ).toEqual(sizes[d]);
      for (const v of room.variants) {
        expect(checkRoom(v.layout), v.name).toEqual([]);
        expect(parseBoard(v.layout).starts.length, v.name).toBeGreaterThanOrEqual(4);
      }
    });
  });

  test('foes per depth: three rats; two rats and a familiar; two rats and a sentry; the Marginalia and two familiars', () => {
    const want = [
      'rat,rat,rat',
      'familiar,rat,rat',
      'rat,rat,sentry',
      'familiar,familiar,marginalia',
    ];
    for (const v of variants) {
      expect(
        foes(v.spec)
          .map((u) => u.def)
          .sort()
          .join(','),
        v.name,
      ).toBe(want[v.depth]);
    }
  });

  test('depth 1: every start point is beside exactly one rat (the strict turn-1 bite)', () => {
    for (const v of variants.filter((x) => x.depth === 0)) {
      for (const p of v.spec.starts) {
        expect(
          foes(v.spec).filter((f) => adjacent(p, f.at)).length,
          `${v.name} ${p.x},${p.y}`,
        ).toBe(1);
      }
    }
  });

  test('depth 1: every seating of the pair opens with a bite on turn 1', () => {
    for (const v of variants.filter((x) => x.depth === 0)) {
      for (const s of seatings(v.layout, v.spec.starts.length)) {
        expect(s.round).toBe(1);
        expect(s.phase).toBe('player');
        expect(bitesNow(s).length, v.name).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('depths 2-4: no start point beside a foe; no seating is struck at range 1 on turn 1', () => {
    for (const v of variants.filter((x) => x.depth > 0)) {
      for (const p of v.spec.starts) {
        for (const f of foes(v.spec)) {
          expect(adjacent(p, f.at), `${v.name} P ${p.x},${p.y} beside ${f.def}`).toBe(false);
        }
      }
      for (const s of seatings(v.layout, v.spec.starts.length)) {
        expect(bitesNow(s), v.name).toEqual([]);
      }
    }
  });

  test("depth 3: no start point in a sentry's row or column", () => {
    for (const v of variants.filter((x) => x.depth === 2)) {
      const sentry = foes(v.spec).find((u) => u.def === 'sentry');
      if (!sentry) throw new Error(`${v.name}: no sentry`);
      for (const p of v.spec.starts) {
        expect(p.x === sentry.at.x || p.y === sentry.at.y, `${v.name} ${p.x},${p.y}`).toBe(false);
      }
    }
  });

  test('P4: every variant of a depth carries its hearing setups', () => {
    for (const v of variants) {
      const got = setups(v.spec);
      const want =
        v.depth === 0
          ? { oilLineByWall: true, plates: true }
          : v.depth === 1
            ? { oilLine: true, ventCloud: true, plateRun: true }
            : v.depth === 2
              ? { plates: true, vent: true }
              : { plates: true, vent: true };
      expect(got, v.name).toMatchObject(want);
    }
  });
});

describe('Seam rooms play (SM-3)', () => {
  const party = () =>
    Object.fromEntries(
      FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
    );
  const fight = (title: string, layout: string, seed: number) =>
    botFight(createBattle({ title, board: layout, seed, lineup: FOUNDERS, party: party() }).state);

  test('the bot wins rooms 1-3 with the founding pair on fresh HP', () => {
    for (const room of ROOMS.slice(0, 3)) {
      for (const v of room.variants) {
        let wins = 0;
        for (const seed of [1, 2, 3, 4, 5])
          if (fight(room.title, v.layout, seed).state.phase === 'won') wins++;
        expect(wins, v.name).toBeGreaterThanOrEqual(4);
      }
    }
  });

  test('the heart plays to an end and is no walkover', () => {
    const heart = ROOMS[3];
    if (!heart) throw new Error('missing heart');
    const rows: string[] = [];
    let wins = 0;
    for (const v of heart.variants) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const phase = fight(heart.title, v.layout, seed).state.phase;
        rows.push(`${v.name} ${seed} ${phase}`);
        if (phase === 'won') wins++;
      }
    }
    console.log(rows.join('\n'), wins);
    expect(wins).toBeGreaterThan(0);
  });
});
