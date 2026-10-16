import { describe, expect, test } from 'vitest';
import { DISTRICTS, type MemberId } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  boardOf,
  isLegal,
  memberById,
  newProfile,
  type Profile,
  parseLattice,
} from '$engine';
import { GameStore } from '../../src/app/game.svelte';
import { memoryBackend } from '../../src/app/save';
import { planThreshold, thresholdOutcome, thresholdStart } from '../../src/app/threshold';
import { ThresholdStore } from '../../src/app/threshold.svelte';

const OIL_D = ['.     .   . . .', 'Bolt> Oil . . .', 'x     .   . . x'].join('\n');
const SPARK_S = ['x Boltv x', '. Spark .', '. .     .', '. .     .', '. .     .', 'x .     x'].join(
  '\n',
);

function heardCanals(): Profile {
  const p = newProfile();
  return {
    ...p,
    lattices: {
      ...p.lattices,
      draughtsman: [...parseLattice(OIL_D).runes],
      stoker: [...parseLattice(SPARK_S).runes],
    },
    city: { ...p.city, heard: ['seam', 'canals'], open: ['seam'], fresh: [] },
  };
}

const gate = DISTRICTS.canals.gate;
if (gate.kind !== 'threshold') throw new Error('the canals have a threshold');

const first = (s: BattleState, m: MemberId) => {
  const spell = memberById(s, m).spells[0];
  if (!spell) throw new Error('no spell');
  return spell.key;
};

/** C2's solution 1 (tests/run/lock.test.ts), then the rounds pass. */
function script(start: BattleState): Action[] {
  const down = (m: MemberId): Action => ({
    type: 'cast',
    unit: m,
    spell: first(start, m),
    aim: { kind: 'dir', dir: 'down' },
  });
  const mv = (unit: MemberId, x: number, y: number): Action => ({
    type: 'move',
    unit,
    to: { x, y },
  });
  const END: Action = { type: 'endTurn' };
  return [
    mv('draughtsman', 2, 1),
    down('draughtsman'),
    END,
    down('draughtsman'),
    END,
    down('draughtsman'),
    END,
    down('draughtsman'),
    END,
    down('draughtsman'),
    mv('draughtsman', 3, 0),
    mv('stoker', 2, 1),
    down('stoker'),
  ];
}

function solve(start: BattleState): BattleState {
  let s = start;
  for (const a of script(start)) {
    expect(isLegal(s, a)).toBeNull();
    s = applyAction(s, a).state;
  }
  for (let i = 0; i < 8 && s.phase === 'player'; i++) s = applyAction(s, { type: 'endTurn' }).state;
  return s;
}

describe('threshold screen logic', () => {
  test('a heard barred district plans its room; others give a reason', () => {
    const p = heardCanals();
    expect(planThreshold(p, 'canals').ok).toBe(true);
    expect(planThreshold(newProfile(), 'canals').ok).toBe(false);
    expect(planThreshold(p, 'seam').ok).toBe(false);
    expect(planThreshold(p, 'nowhere').ok).toBe(false);
    const open: Profile = { ...p, city: { ...p.city, open: ['seam', 'canals'] } };
    expect(planThreshold(open, 'canals').ok).toBe(false);
  });

  test('the start is the lock board with the notebook lattices, and Retry gives the same start', () => {
    const p = heardCanals();
    const a = thresholdStart(p, gate.room).state;
    const b = thresholdStart(p, gate.room).state;
    expect(a.objective).toEqual(gate.room.goal);
    expect(boardOf(a)).toBe(boardOf(b));
    expect(a.phase).toBe('player');
    expect(memberById(a, 'draughtsman').spells.length).toBeGreaterThan(0);
  });

  test('playing solution 1 wins and solves the district; an unwon state changes nothing', () => {
    const p = heardCanals();
    const start = thresholdStart(p, gate.room).state;
    expect(thresholdOutcome(p, 'canals', start)).toBe(p);
    const end = solve(start);
    expect(end.phase).toBe('won');
    const after = thresholdOutcome(p, 'canals', end);
    expect(after.city.open).toContain('canals');
    expect(after.city.solved).toContain('canals');
  });

  test('the store: retry restarts, leave writes nothing, a win opens the district at once', () => {
    const game = new GameStore(memoryBackend(), () => 0);
    game.setProfile(heardCanals());
    const before = game.profile;
    const store = new ThresholdStore(game);
    expect(store.load('canals').ok).toBe(true);
    const s1 = store.session;
    if (!s1) throw new Error('no session');
    const board = boardOf(s1.state);
    store.retry();
    expect(store.session).not.toBe(s1);
    expect(boardOf((store.session as typeof s1).state)).toBe(board);
    store.leave();
    expect(game.profile).toBe(before);
    store.load('canals');
    const session = store.session;
    if (!session) throw new Error('no session');
    expect(store.won).toBe(false);
    for (const action of script(session.state)) {
      // The state moves on at once; playback would only animate it.
      void session.dispatch(action);
      session.skip();
    }
    for (let i = 0; i < 8 && session.state.phase === 'player'; i++) {
      void session.dispatch({ type: 'endTurn' });
      session.skip();
    }
    // Written the moment the battle is won, before any button.
    expect(store.won).toBe(true);
    expect(store.solved).toBe(false);
    expect(game.profile.city.open).toContain('canals');
    expect(game.profile.city.solved).toContain('canals');
    store.finish();
    expect(store.solved).toBe(true);
    expect(store.load('canals').ok).toBe(false);
    expect(store.solved).toBe(true);
  });
});
