import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import { boardOf, createBattle, objectiveMet } from '$engine';

/**
 * The canal lock (K-10, K-11, K-22). P10 re-authors it for the new runes ("the lock-keeper's
 * eel-rat", R1, with its own solvable test); until then only its board is pinned here.
 */

const gate = DISTRICTS.canals.gate;
if (gate.kind !== 'threshold') throw new Error('the canals have a threshold');
const LOCK = gate.room;

describe('the canal lock', () => {
  test('no enemies, a gate, a grate above it, and the party on the quay', () => {
    const s = createBattle({
      title: LOCK.name,
      board: LOCK.board,
      seed: 1,
      objective: LOCK.goal,
    }).state;
    expect(s.units.every((u) => u.kind === 'member')).toBe(true);
    expect(s.tiles.filter((t) => t.terrain.gate)).toHaveLength(1);
    expect(s.tiles.filter((t) => t.terrain.grate)).toHaveLength(1);
    expect(boardOf(s)).toBe(
      boardOf(createBattle({ title: 't', board: LOCK.board, seed: 1 }).state),
    );
    expect(s.phase).toBe('player'); // an empty board is not a win in a threshold room
    expect(objectiveMet(s, [{ type: 'gateBurns', at: { x: 2, y: 7 } }])).toBe(true);
  });
});
