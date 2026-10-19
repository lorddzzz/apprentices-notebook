import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import { boardOf, memberById, newProfile, type Profile, parseLattice } from '$engine';
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

  // Runes have no effects yet (E1-E3): the eel-rat cannot be shoved off the lock until they land.
  // R1's `threshold-solvable` test plays the intended lattice (Bolt, Oil, Shove) end to end.
  test.todo('playing the intended lattice wins the lock and opens the canals');

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
});
