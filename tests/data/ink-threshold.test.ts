import { describe, expect, test } from 'vitest';
import { INK_THRESHOLD } from '$data/districts/inkQuarter/threshold';
import {
  applyAction,
  type BattleState,
  boardOf,
  compiledFor,
  createBattle,
  type GameEvent,
  memberById,
  newProfile,
  parseBoard,
  parseLattice,
} from '$engine';
import { objectiveMet } from '$engine/city';
import type { Coord } from '$engine/grid';
import { checkRoom, placeParty } from '$engine/rooms';

/**
 * IQ-11 (ink-quarter plan P11): the "return to sender" threshold. One apprentice with
 * `Bolt > Shove`; the undelivered letter is the board's only unit (an idle dummy, `dummy-1`).
 */

const SPEC = parseBoard(INK_THRESHOLD.board);

function lattice() {
  const p = newProfile();
  return { ...p, lattices: { ...p.lattices, draughtsman: [...parseLattice('Bolt> Shove').runes] } };
}

/** The battle with exactly one `P` kept (the one at `at`), the way a trip would place one apprentice. */
function startAt(at: Coord, layout = INK_THRESHOLD.board): BattleState {
  let n = 0;
  const rows = layout.split('\n').map((row) =>
    row
      .split(' ')
      .map((c) => {
        if (c !== 'P') return c;
        const here = SPEC.starts[n++];
        return here && here.x === at.x && here.y === at.y ? 'P' : '.';
      })
      .join(' '),
  );
  const spells = compiledFor(lattice(), 'draughtsman').spells;
  return createBattle({
    title: INK_THRESHOLD.name,
    board: rows.join('\n'),
    seed: 1,
    objective: INK_THRESHOLD.goal,
    party: {
      draughtsman: { spells, charges: Object.fromEntries(spells.map((s) => [s.key, s.charges])) },
    },
    lineup: ['draughtsman'],
    startSeed: 1,
  }).state;
}

const memberAt = (s: BattleState): Coord => memberById(s, 'draughtsman').pos;
const castUp = (s: BattleState) => {
  const spell = memberById(s, 'draughtsman').spells[0];
  if (!spell) throw new Error('the Draughtsman has no spell');
  return applyAction(s, {
    type: 'cast',
    unit: 'draughtsman',
    spell: spell.key,
    aim: { kind: 'dir', dir: 'up' },
  });
};
const unitOf = (e: GameEvent | undefined): string | undefined =>
  (e as { unit?: { id: string } } | undefined)?.unit?.id;
const types = (events: readonly GameEvent[]) => events.map((e) => e.type);

/** The lane tile each start point walks to: column 2, below the desk, within a move. */
const LANE: Record<string, Coord> = {
  '0,6': { x: 2, y: 5 },
  '5,6': { x: 2, y: 6 },
  '1,7': { x: 2, y: 5 },
  '4,7': { x: 2, y: 6 },
};

describe('the return-to-sender threshold (IQ-11)', () => {
  test('a 6x8 room with four start points and a lone letter, passing checkRoom', () => {
    expect(checkRoom(INK_THRESHOLD.board)).toEqual([]);
    expect([SPEC.width, SPEC.height]).toEqual([6, 8]);
    expect(SPEC.starts).toHaveLength(4);
    expect(SPEC.units.map((u) => u.def)).toEqual(['dummy']);
    expect(SPEC.tiles.filter((t) => t.piece?.id === 'inkQuarter:return')).toHaveLength(1);
  });

  test('no start point has the letter in line, so one Bolt from the start cannot reach', () => {
    const letter = SPEC.units[0];
    if (!letter) throw new Error('no letter');
    for (const p of SPEC.starts) expect(p.x === letter.at.x || p.y === letter.at.y).toBe(false);
    for (const p of SPEC.starts) {
      const s = startAt(p);
      const r = castUp(s);
      expect(r.state.phase, `${p.x},${p.y}`).not.toBe('won');
    }
  });

  test('scripted Bolt > Shove solve from every start point: walk into the lane, cast up', () => {
    for (const p of SPEC.starts) {
      const to = LANE[`${p.x},${p.y}`];
      if (!to) throw new Error(`no script for ${p.x},${p.y}`);
      const s = startAt(p);
      const moved = applyAction(s, { type: 'move', unit: 'draughtsman', to });
      expect(memberAt(moved.state)).toEqual(to);
      const r = castUp(moved.state);
      expect(types(r.events), `${p.x},${p.y}`).toEqual(
        expect.arrayContaining(['push', 'inkQuarter:sentBack', 'won']),
      );
      expect(r.state.phase).toBe('won');
      const sent = r.events.find((e) => e.type === 'inkQuarter:sentBack');
      expect(unitOf(sent)).toBe('dummy-1');
    }
  });

  test('an apprentice on the stamp does not open the door', () => {
    // A start point beside the stamp: step on it. The stamp sends her back and nothing is won.
    const layout = INK_THRESHOLD.board.replace('. . {return}', 'P . {return}');
    const only = layout.split('\n').map((row, y) => (y === 2 ? row : row.replace(/P/g, '.')));
    const spells = compiledFor(lattice(), 'draughtsman').spells;
    const state = createBattle({
      title: 't',
      board: only.join('\n'),
      seed: 1,
      objective: INK_THRESHOLD.goal,
      party: { draughtsman: { spells } },
      lineup: ['draughtsman'],
      startSeed: 1,
    }).state;
    expect(memberAt(state)).toEqual({ x: 0, y: 2 });
    const r = applyAction(state, { type: 'move', unit: 'draughtsman', to: { x: 2, y: 2 } });
    const sent = r.events.find((e) => e.type === 'inkQuarter:sentBack');
    expect(unitOf(sent)).toBe('draughtsman');
    expect(objectiveMet(r.state, r.events)).toBe(false);
    expect(r.state.phase).not.toBe('won');
  });

  test('retry gives the same spots and the same board', () => {
    const lineup = ['draughtsman'] as const;
    const a = placeParty(SPEC, lineup, 1);
    const b = placeParty(SPEC, lineup, 1);
    expect(a.units).toEqual(b.units);
    const spells = compiledFor(lattice(), 'draughtsman').spells;
    const make = () =>
      createBattle({
        title: INK_THRESHOLD.name,
        board: INK_THRESHOLD.board,
        seed: 1,
        objective: INK_THRESHOLD.goal,
        party: { draughtsman: { spells } },
        lineup,
        startSeed: 1,
      }).state;
    expect(boardOf(make())).toBe(boardOf(make()));
  });

  test('copy and art key are set', () => {
    expect(INK_THRESHOLD.goalText).toBe('Send the letter back to its desk.');
    expect(INK_THRESHOLD.solvedArt).toBe('ink-returned');
    expect(INK_THRESHOLD.goal).toEqual({ happens: 'inkQuarter:sentBack', unit: 'dummy-1' });
  });
});
