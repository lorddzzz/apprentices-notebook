import { describe, expect, test } from 'vitest';
import { DISTRICTS, MEMBER_IDS, type MemberId } from '$data';
import {
  type Action,
  type Aim,
  applyAction,
  type BattleState,
  boardOf,
  createBattle,
  describeLog,
  type GameEvent,
  isLegal,
  legalAims,
  legalMoves,
  memberById,
  scenarioSpec,
} from '$engine';

/** The canal lock (K-10, K-11, K-22, design §5.3): a puzzle room that only the current can solve. */

const gate = DISTRICTS.canals.gate;
if (gate.kind !== 'threshold') throw new Error('the canals have a threshold');
const LOCK = gate.room;

const START: Record<MemberId, string> = {
  draughtsman: ['.     .   . . .', 'Bolt> Ink . . .', 'x     .   . . x'].join('\n'),
  stoker: ['x Boltv x', '. Spark .', '. .     .', '. .     .', '. .     .', 'x .     x'].join('\n'),
};

function lock(lattices: Partial<Record<MemberId, string>> = START): BattleState {
  const spec = scenarioSpec({ board: LOCK.board, lattices: { ...START, ...lattices } });
  return createBattle({ ...spec, title: LOCK.name, objective: LOCK.goal }).state;
}

/** Plays the actions in order; every one must be legal. Returns the final state and every event. */
function play(start: BattleState, actions: readonly Action[]) {
  let state = start;
  const events: GameEvent[] = [];
  for (const a of actions) {
    const r = applyAction(state, a);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

const burned = (events: readonly GameEvent[]) => events.some((e) => e.type === 'gateBurns');

const OIL_D = ['.     .   . . .', 'Bolt> Oil . . .', 'x     .   . . x'].join('\n');
/** Bolt, Oil and Spark in one chain: the shot leaves a flame on oil. */
const FIRE_S = ['x Boltv x', '. Oil .', '. Spark .', '. . .', '. . .', 'x . x'].join('\n');
const SPARK_D = ['.     .   . . .', 'Bolt> Spark . . .', 'x     .   . . x'].join('\n');
const SPLASH_FIRE_D = ['.     .   .     . .', 'Splash> Oil Spark . .', 'x     .   .     . x'].join(
  '\n',
);
const OIL_S = ['x Boltv x', '. Oil .', '. . .', '. . .', '. . .', 'x . x'].join('\n');
const SPLASH_OIL_D = ['.     .   . . .', 'Splash> Oil . . .', 'x     .   . . x'].join('\n');
const SPLASH_SPARK_S = ['x Splashv x', '. Spark .', '. . .', '. . .', '. . .', 'x . x'].join('\n');

const first = (s: BattleState, m: MemberId) => {
  const spell = memberById(s, m).spells[0];
  if (!spell) throw new Error(`${m} has no spell`);
  return spell.key;
};
const cast = (
  s: BattleState,
  m: MemberId,
  dir: 'up' | 'down' | 'left' | 'right' | Aim,
): Action => ({
  type: 'cast',
  unit: m,
  spell: first(s, m),
  aim: typeof dir === 'string' ? { kind: 'dir', dir } : dir,
});
const mv = (m: MemberId, x: number, y: number): Action => ({ type: 'move', unit: m, to: { x, y } });
const END: Action = { type: 'endTurn' };

function expectWin(start: BattleState, actions: (s: BattleState) => Action[]) {
  let r = play(start, actions(start));
  // Then the current does the rest: let rounds pass (the lane is short).
  for (let i = 0; i < 8 && r.state.phase === 'player'; i++) {
    const more = play(r.state, [END]);
    r = { state: more.state, events: [...r.events, ...more.events] };
  }
  expect(r.state.phase).toBe('won');
  expect(r.events.some((e) => e.type === 'gateBurns')).toBe(true);
  return r;
}

describe('the canal lock: a room only the current opens', () => {
  test('no enemies, a gate, a grate above it, and the party on the quay', () => {
    const s = lock();
    expect(s.units.every((u) => u.kind === 'member')).toBe(true);
    expect(s.tiles.flat().filter((t) => t.gate)).toHaveLength(1);
    expect(s.tiles.flat().filter((t) => t.grate)).toHaveLength(1);
    expect(boardOf(s)).toBe(
      boardOf(createBattle({ title: 't', board: LOCK.board, seed: 1 }).state),
    );
  });

  test('solution 1: lay oil at the grate turn after turn, then spark the whole slick', () => {
    const r = expectWin(lock({ draughtsman: OIL_D }), (s) => [
      mv('draughtsman', 2, 1),
      cast(s, 'draughtsman', 'down'),
      END,
      cast(s, 'draughtsman', 'down'),
      END,
      cast(s, 'draughtsman', 'down'),
      END,
      cast(s, 'draughtsman', 'down'),
      END,
      cast(s, 'draughtsman', 'down'),
      mv('draughtsman', 3, 0),
      mv('stoker', 2, 1),
      cast(s, 'stoker', 'down'),
    ]);
    expect(describeLog(r.events).some((l) => l.includes('lock gate'))).toBe(true);
  });

  test('solution 2: a wide oil slick from the Stoker, two turns, then a spark', () => {
    expectWin(lock({ draughtsman: SPARK_D, stoker: OIL_S }), (s) => [
      mv('stoker', 2, 1),
      cast(s, 'stoker', 'down'),
      END,
      cast(s, 'stoker', 'down'),
      END,
      mv('stoker', 3, 1),
      mv('draughtsman', 2, 1),
      cast(s, 'draughtsman', 'down'),
    ]);
  });

  test('solution 3: Splash oil wide below the grate, let it drift, Splash a spark on it', () => {
    expectWin(lock({ draughtsman: SPLASH_OIL_D, stoker: SPLASH_SPARK_S }), (s) => [
      mv('draughtsman', 2, 1),
      cast(s, 'draughtsman', { kind: 'tile', at: { x: 2, y: 4 } }),
      END,
      cast(s, 'stoker', { kind: 'tile', at: { x: 2, y: 4 } }),
    ]);
  });
});

// ── No drift-free solution ──────────────────────────────

/** Every legal action a member could take next: a move, a cast with any aim, a shove. */
function options(s: BattleState, m: MemberId): Action[] {
  const out: Action[] = [];
  const u = memberById(s, m);
  if (!u.moved) for (const to of legalMoves(s, m)) out.push({ type: 'move', unit: m, to });
  for (const spell of u.spells) {
    for (const aim of legalAims(s, m, spell.key)) {
      const a: Action = { type: 'cast', unit: m, spell: spell.key, aim };
      if (isLegal(s, a) === null) out.push(a);
    }
  }
  for (const dir of ['up', 'down', 'left', 'right'] as const) {
    const a: Action = { type: 'shove', unit: m, dir };
    if (isLegal(s, a) === null) out.push(a);
  }
  return out;
}

/** True when some single turn (no round end), members in `order`, burns the gate. */
function burnsInOneTurn(start: BattleState, order: readonly MemberId[]): Action[] | null {
  const seen = new Set<string>();
  const key = (s: BattleState, i: number) =>
    `${i}|${boardOf(s)}|${s.units.map((u) => (u.kind === 'member' ? `${u.moved}${u.acted}${u.hp}` : '')).join(',')}`;
  const go = (s: BattleState, i: number, path: Action[]): Action[] | null => {
    const k = key(s, i);
    if (seen.has(k)) return null;
    seen.add(k);
    const m = order[i];
    if (m === undefined) return null;
    const done = go(s, i + 1, path); // this member is done
    if (done) return done;
    for (const a of options(s, m)) {
      const r = applyAction(s, a);
      if (r.state.phase === 'won' || burned(r.events)) return [...path, a];
      const found = go(r.state, i, [...path, a]);
      if (found) return found;
    }
    return null;
  };
  return go(start, 0, []);
}

describe('the lock has no drift-free solution', () => {
  const sets: Record<string, Partial<Record<MemberId, string>>> = {
    'oil and fire both': { draughtsman: OIL_D, stoker: FIRE_S },
    'wide oil for the Stoker, a spark for the Draughtsman': { draughtsman: SPARK_D, stoker: OIL_S },
    'one Splash that oils and lights': { draughtsman: SPLASH_FIRE_D },
  };
  for (const [name, lattices] of Object.entries(sets)) {
    test(`no single turn burns the gate with ${name}`, () => {
      const start = lock(lattices);
      for (const order of [MEMBER_IDS, [...MEMBER_IDS].reverse()]) {
        expect(burnsInOneTurn(start, order), order.join(' then ')).toBeNull();
      }
      // An exhaustive search: ~4 s locally, slower on CI.
    }, 60_000);
  }
});
