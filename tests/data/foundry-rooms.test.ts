import { describe, expect, test } from 'vitest';
import type { MemberId } from '$data';
import { FOUNDRY_ROOMS_12 } from '$data/districts/foundry';
import type { KitRoomDef } from '$data/districts/index';
import { type BattleState, type Dir, parseBoard } from '$engine';
import { checkRoom } from '$engine/rooms';
import { ev } from '../districts/foundry/helpers';
import { act, cast, type Step, withLattices } from '../scenarios/harness';

/**
 * BF-10 and BF-11 (foundry-plan P6, P12, P22, P23): rooms 1 to 4, three layouts each. Every great
 * bell has a scripted solve: apprentices start on a `P`, walk, and cast with the starting runes
 * plus Brass, all inside one player turn (nothing in these solves needs a round).
 */

type At = readonly [number, number];
interface Shot {
  who: MemberId;
  /** Where the member walks first (absent: it casts from its start point). */
  to?: At;
  aim: Dir;
  lattice?: string;
}
interface Script {
  /** The start points the members take, by member. */
  starts: Partial<Record<MemberId, At>>;
  shots: readonly Shot[];
}

const TOKEN: Partial<Record<MemberId, string>> = { draughtsman: 'D', stoker: 'S', runaway: 'R' };
const BOLT = 'Bolt> Strike';

/** The room's layout with the named members standing on their start points and every other `P` bare. */
function fielded(layout: string, starts: Script['starts']): string {
  const spots = new Map(
    Object.entries(starts).map(([m, at]) => [`${(at as At)[0]},${(at as At)[1]}`, m as MemberId]),
  );
  const rows = layout.split('\n').map((row, y) =>
    row
      .split(/\s+/)
      .map((cell, x) => {
        const m = spots.get(`${x},${y}`);
        if (m) {
          if (cell !== 'P') throw new Error(`(${x},${y}) is not a start point: ${cell}`);
          return TOKEN[m];
        }
        return cell === 'P' ? '.' : cell;
      })
      .join(' '),
  );
  return rows.join('\n');
}

/** Plays a script and returns the final state with the whole log. */
function play(
  layout: string,
  script: Script,
  opts: { hp?: Record<string, number> } = {},
): { state: BattleState; events: Step['events'] } {
  const lattices: Partial<Record<MemberId, string>> = {};
  for (const m of Object.keys(script.starts) as MemberId[]) lattices[m] = BOLT;
  for (const shot of script.shots) if (shot.lattice) lattices[shot.who] = shot.lattice;
  let state = withLattices(fielded(layout, script.starts), lattices, opts);
  const events: Step['events'] = [];
  for (const shot of script.shots) {
    if (shot.to) {
      const r = applyMove(state, shot.who, shot.to);
      state = r.state;
      events.push(...r.events);
    }
    const r = cast(state, shot.who, shot.aim);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

const applyMove = (state: BattleState, who: MemberId, to: At) =>
  act(state, { type: 'move', unit: who, to: { x: to[0], y: to[1] } });

const [one, two] = FOUNDRY_ROOMS_12;
if (!one || !two) throw new Error('missing room');

const defs = (layout: string): string =>
  parseBoard(layout)
    .units.map((u) => u.def)
    .sort()
    .join(',');
const tonesOf = (layout: string): string[] =>
  [...new Set([...layout.matchAll(/(?:bell|rope):(low|mid|high)/g)].map((m) => m[1] ?? ''))].sort();

function expectRoom(room: KitRoomDef, size: [number, number], foes: string, tones: number): void {
  expect(room.variants).toHaveLength(3);
  expect(new Set(room.variants.map((v) => v.name)).size).toBe(3);
  expect(room.layout).toBe(room.variants[0]?.layout);
  expect(room.heart).toBe(false);
  expect(room.bonus?.goal).toEqual({ piece: 'foundry:greatBell', state: 'rung' });
  for (const v of room.variants) {
    expect(checkRoom(v.layout), v.name).toEqual([]);
    const spec = parseBoard(v.layout);
    expect([spec.width, spec.height], v.name).toEqual(size);
    expect(spec.starts.length, v.name).toBeGreaterThanOrEqual(4);
    expect(defs(v.layout), v.name).toBe(foes);
    expect(tonesOf(v.layout), v.name).toHaveLength(tones);
    expect(v.layout, v.name).toMatch(/\{bell:/);
    expect(v.layout.match(/\{greatBell:/g), v.name).toHaveLength(1);
  }
}

const rung = (events: Step['events']) => ev(events, 'foundry:bellRung');

describe('foundry rooms 1 and 2 (BF-10)', () => {
  test('BF-10: rooms 1 and 2 pass checkRoom', () => {
    expectRoom(one, [5, 7], 'clapper,ringer', 2);
    expectRoom(two, [6, 7], 'clapper,ringer,ringer', 2);
    expect(one.depth).toBe(1);
    expect(two.depth).toBe(2);
    expect(one.bonus?.reward).toEqual({ kind: 'state', tag: 'peal' });
    for (const v of one.variants) expect(v.layout).toContain('{greatBell:1}');
    for (const v of two.variants) expect(v.layout).toContain('{greatBell:2}');
  });

  test('BF-10: lock 1 reach has a scripted solve', () => {
    const solves: Script[] = [
      { starts: { draughtsman: [0, 6] }, shots: [{ who: 'draughtsman', to: [0, 3], aim: 'up' }] },
      { starts: { draughtsman: [4, 6] }, shots: [{ who: 'draughtsman', to: [4, 3], aim: 'up' }] },
      { starts: { draughtsman: [2, 6] }, shots: [{ who: 'draughtsman', to: [2, 3], aim: 'up' }] },
    ];
    one.variants.forEach((v, i) => {
      const r = play(v.layout, solves[i] as Script);
      expect(rung(r.events), v.name).toHaveLength(1);
      expect(ev(r.events, 'foundry:bellRung')[0]?.data).toMatchObject({ note: 1, lock: 'reach' });
    });
  });

  test('BF-10: lock 2 match has a scripted solve', () => {
    const brass = 'Bolt> Brass Strike';
    const solves: Script[] = [
      {
        starts: { draughtsman: [1, 5] },
        shots: [{ who: 'draughtsman', to: [1, 4], aim: 'up', lattice: brass }],
      },
      {
        starts: { draughtsman: [3, 6] },
        shots: [{ who: 'draughtsman', to: [4, 5], aim: 'up', lattice: brass }],
      },
      {
        starts: { draughtsman: [2, 6] },
        shots: [{ who: 'draughtsman', to: [2, 4], aim: 'up', lattice: brass }],
      },
    ];
    two.variants.forEach((v, i) => {
      const r = play(v.layout, solves[i] as Script);
      expect(rung(r.events), v.name).toHaveLength(1);
      expect(rung(r.events)[0]?.data).toMatchObject({ note: 2, lock: 'match', hang: 'mid' });
      // Control: without the retune the same strike rings low and the great bell stays silent.
      const plain = play(v.layout, {
        ...(solves[i] as Script),
        shots: (solves[i] as Script).shots.map((s) => ({ ...s, lattice: BOLT })),
      });
      expect(rung(plain.events), `${v.name} without Brass`).toHaveLength(0);
    });
  });
});
