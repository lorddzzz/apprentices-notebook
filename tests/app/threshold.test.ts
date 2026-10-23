import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import {
  applyAction,
  boardOf,
  compiledFor,
  createBattle,
  memberById,
  newProfile,
  type Profile,
  parseBoard,
  parseLattice,
  tripParty,
} from '$engine';
import { GameStore } from '../../src/app/game.svelte';
import { memoryBackend } from '../../src/app/save';
import { planThreshold, thresholdOutcome, thresholdStart } from '../../src/app/threshold';
import { ThresholdStore } from '../../src/app/threshold.svelte';

const OIL_D = ['.     .   . . .', 'Bolt> Oil . . .', 'x     .   . . x'].join('\n');
const SHOVE_D = ['.     .   .     . .', 'Bolt> Oil Shove . .', 'x     .   .     . x'].join('\n');
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

  test('a won state solves the district; an unwon state changes nothing', () => {
    const p = heardCanals();
    const start = thresholdStart(p, gate.room).state;
    expect(thresholdOutcome(p, 'canals', start)).toBe(p);
    const after = thresholdOutcome(p, 'canals', { ...start, phase: 'won' });
    expect(after.city.open).toContain('canals');
    expect(after.city.solved).toContain('canals');
  });

  test('threshold-solvable: Bolt, Oil, Shove drops the lock-keeper rat and opens the canals', () => {
    const p = heardCanals();
    const solving: Profile = {
      ...p,
      lattices: { ...p.lattices, draughtsman: [...parseLattice(SHOVE_D).runes] },
    };
    const start = thresholdStart(solving, gate.room).state;
    const spell = memberById(start, 'draughtsman').spells[0];
    if (!spell) throw new Error('the Draughtsman has no spell');
    const r = applyAction(start, {
      type: 'cast',
      unit: 'draughtsman',
      spell: spell.key,
      aim: { kind: 'dir', dir: 'right' },
    });
    expect(r.events.map((e) => e.type)).toEqual(expect.arrayContaining(['dropped', 'died', 'won']));
    expect(r.state.phase).toBe('won');
    const opened = thresholdOutcome(solving, 'canals', r.state);
    expect(opened.city.open).toContain('canals');
    expect(opened.city.solved).toContain('canals');
  });

  test('a fire only kills the rat: the room stays shut', () => {
    const p = heardCanals(); // Bolt, Oil, Spark on the Draughtsman
    const start = thresholdStart(p, gate.room).state;
    const spell = memberById(start, 'draughtsman').spells[0];
    if (!spell) throw new Error('the Draughtsman has no spell');
    const r = applyAction(start, {
      type: 'cast',
      unit: 'draughtsman',
      spell: spell.key,
      aim: { kind: 'dir', dir: 'right' },
    });
    expect(r.events.some((e) => e.type === 'dropped')).toBe(false);
    expect(r.state.phase).toBe('player');
    expect(thresholdOutcome(p, 'canals', r.state)).toBe(p);
  });

  test('the store: retry restarts and leave writes nothing', () => {
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
    expect(store.won).toBe(false);
    expect(store.solved).toBe(false);
    expect(game.profile).toBe(before);
  });

  test('no one slotted: the room is blocked with a message', () => {
    const p = heardCanals();
    const empty: Profile = { ...p, household: { ...p.household, slots: [null, null, null] } };
    const plan = planThreshold(empty, 'canals');
    expect(plan.ok).toBe(false);
    expect(plan.ok === false && plan.why).toMatch(/slotted/);
  });

  test('threshold-start-points: one apprentice solves the lock from each of the four spots', () => {
    const solving: Profile = {
      ...heardCanals(),
      lattices: { ...heardCanals().lattices, draughtsman: [...parseLattice(SHOVE_D).runes] },
    };
    const solo: Profile = {
      ...solving,
      household: { ...solving.household, slots: ['draughtsman', null, null] },
    };
    expect(tripParty(solo)).toEqual(['draughtsman']);
    expect(parseBoard(gate.room.board).starts).toHaveLength(4);
    const spells = compiledFor(solo, 'draughtsman').spells;
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      let state = createBattle({
        title: 'lock',
        board: gate.room.board,
        seed: 1,
        objective: gate.room.goal,
        party: {
          draughtsman: {
            spells,
            charges: Object.fromEntries(spells.map((s) => [s.key, s.charges])),
          },
        },
        lineup: ['draughtsman'],
        startSeed: seed,
      }).state;
      const at = memberById(state, 'draughtsman').pos;
      seen.add(`${at.x},${at.y}`);
      if (at.x !== 2 || at.y !== 3) {
        state = applyAction(state, { type: 'move', unit: 'draughtsman', to: { x: 2, y: 3 } }).state;
      }
      const spell = memberById(state, 'draughtsman').spells[0];
      if (!spell) throw new Error('no spell');
      const r = applyAction(state, {
        type: 'cast',
        unit: 'draughtsman',
        spell: spell.key,
        aim: { kind: 'dir', dir: 'right' },
      });
      expect(r.state.phase, `from ${at.x},${at.y}`).toBe('won');
    }
    expect(seen.size).toBe(4);
  });

  test('Retry places the party on the same spots', () => {
    const solo: Profile = { ...heardCanals() };
    const a = memberById(thresholdStart(solo, gate.room).state, 'draughtsman').pos;
    const b = memberById(thresholdStart(solo, gate.room).state, 'draughtsman').pos;
    expect(a).toEqual(b);
  });
});
