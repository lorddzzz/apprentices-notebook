import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import { boardOf, createBattle, objectiveMet, unitAt } from '$engine';

/**
 * The canal lock (K-10, K-22, P10): the lock-keeper's rat sits on the sill with the canal at its
 * back. The solving play lives in `tests/app/threshold.test.ts` (`threshold-solvable`).
 */

const gate = DISTRICTS.canals.gate;
if (gate.kind !== 'threshold') throw new Error('the canals have a threshold');
const LOCK = gate.room;

const start = () =>
  createBattle({ title: LOCK.name, board: LOCK.board, seed: 1, objective: LOCK.goal }).state;

describe('the canal lock', () => {
  test('one rat on the sill, canal water at its back, the party on the near bank', () => {
    const s = start();
    const foes = s.units.filter((u) => u.kind === 'enemy');
    expect(foes.map((u) => u.id)).toEqual(['rat-1']);
    const rat = foes[0];
    if (!rat) throw new Error('no rat');
    expect(s.tiles[rat.pos.y * s.width + rat.pos.x + 1]?.terrain.water).not.toBeNull();
    expect(unitAt(s, { x: rat.pos.x - 1, y: rat.pos.y })).toBeNull();
    expect(s.units.filter((u) => u.kind === 'member')).toHaveLength(2);
    expect(boardOf(s)).toBe(boardOf(start()));
    expect(s.phase).toBe('player');
  });

  test('the goal is the rat dying by a drop, not by any death', () => {
    const s = start();
    const died = {
      type: 'died',
      unit: { id: 'rat-1', name: 'rat', at: { x: 3, y: 3 }, member: false },
    } as const;
    const dropped = { type: 'dropped', unit: died.unit, at: { x: 4, y: 3 }, elite: false } as const;
    expect(objectiveMet(s, [died])).toBe(false);
    expect(objectiveMet(s, [dropped])).toBe(false);
    expect(objectiveMet(s, [dropped, died])).toBe(true);
  });
});
