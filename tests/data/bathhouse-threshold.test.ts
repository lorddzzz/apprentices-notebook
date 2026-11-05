import { describe, expect, test } from 'vitest';
import {
  BATH_THRESHOLD,
  DOME_HEAT,
  DOME_LINE_QUARTERS,
  DOME_ROUNDS,
} from '$data/districts/bathhouses';
import { BOIL_CAPACITY_PIPS } from '$data/districts/bathhouses/types';
import {
  applyAction,
  type BattleState,
  boardOf,
  compiledFor,
  createBattle,
  memberById,
  newProfile,
  parseBoard,
  parseLattice,
} from '$engine';
import { objectiveMet } from '$engine/city';
import { boilOverState } from '$engine/districts/bathhouses/boilOver';
import type { Coord } from '$engine/grid';
import { checkRoom, placeParty } from '$engine/rooms';
import { listRules } from '$engine/rules';

/**
 * BH-9 (bathhouses-plan): the "fill the dome" threshold. One apprentice with `Bolt> Steam`; the
 * gauge rule is listed at heat 1 the way the app will list the threshold's `rules`. The marked
 * line is 5 pips (20 quarters), below the 12-pip capacity.
 */

const SPEC = parseBoard(BATH_THRESHOLD.board);
const RULE = 'bathhouses:boilOver';

function lattice() {
  const p = newProfile();
  return {
    ...p,
    lattices: { ...p.lattices, draughtsman: [...parseLattice('Bolt> Steam').runes] },
  };
}

/** The battle with exactly one `P` kept (the one at `at`), the gauge listed at the dome's heat. */
function startAt(at: Coord): BattleState {
  let n = 0;
  const rows = BATH_THRESHOLD.board.split('\n').map((row) =>
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
  const s = structuredClone(
    createBattle({
      title: BATH_THRESHOLD.name,
      board: rows.join('\n'),
      seed: 1,
      objective: BATH_THRESHOLD.goal,
      party: {
        draughtsman: { spells, charges: Object.fromEntries(spells.map((x) => [x.key, x.charges])) },
      },
      lineup: ['draughtsman'],
      startSeed: 1,
    }).state,
  );
  s.rules = listRules(s, [RULE], { [RULE]: { heat: DOME_HEAT } });
  return s;
}

const pressure = (s: BattleState): number => boilOverState(s)?.pressure ?? -1;

/** Casts `Bolt> Steam` straight up, or does nothing, then ends the turn; once per round. */
function playRounds(s: BattleState, rounds: number, casting: boolean) {
  let cur = s;
  const after: number[] = [];
  let won = false;
  for (let i = 0; i < rounds && !won; i++) {
    if (casting) {
      const spell = memberById(cur, 'draughtsman').spells[0];
      if (!spell) throw new Error('no spell');
      cur = applyAction(cur, {
        type: 'cast',
        unit: 'draughtsman',
        spell: spell.key,
        aim: { kind: 'dir', dir: 'up' },
      }).state;
    }
    const r = applyAction(cur, { type: 'endTurn' });
    cur = r.state;
    after.push(pressure(cur));
    won = cur.phase === 'won' || objectiveMet(cur, r.events);
  }
  return { state: cur, after, won };
}

describe('the dome threshold (BH-9)', () => {
  test('a 6x8 hall with four start points and one vent, passing checkRoom, with no foes', () => {
    expect(checkRoom(BATH_THRESHOLD.board)).toEqual([]);
    expect([SPEC.width, SPEC.height]).toEqual([6, 8]);
    expect(SPEC.starts).toHaveLength(4);
    expect(SPEC.units).toEqual([]);
    expect(SPEC.tiles.filter((t) => t.terrain.vent)).toHaveLength(1);
  });

  test('the line is marked below capacity and the goal reads the gauge to it', () => {
    expect(DOME_LINE_QUARTERS).toBeLessThan(BOIL_CAPACITY_PIPS * 4);
    expect(BATH_THRESHOLD.goal).toEqual({
      rule: RULE,
      key: 'pressure',
      atLeast: DOME_LINE_QUARTERS,
    });
    expect(BATH_THRESHOLD.rules).toEqual([RULE]);
    expect(BATH_THRESHOLD.goalText).toBe('Fill the dome with steam to the line.');
    expect(BATH_THRESHOLD.solvedArt).toBe('bath-dome');
  });

  test('scripted Bolt> Steam solve from every start point, inside the allowed rounds', () => {
    for (const p of SPEC.starts) {
      const run = playRounds(startAt(p), DOME_ROUNDS, true);
      expect(run.won, `${p.x},${p.y}: ${run.after.join(',')}`).toBe(true);
      expect(run.state.phase).toBe('won');
      expect(run.after.at(-1)).toBeGreaterThanOrEqual(DOME_LINE_QUARTERS);
    }
  });

  test('the vent alone does not reach the line inside the allowed rounds', () => {
    for (const p of SPEC.starts) {
      const run = playRounds(startAt(p), DOME_ROUNDS, false);
      expect(run.won, `${p.x},${p.y}: ${run.after.join(',')}`).toBe(false);
      expect(run.after.at(-1)).toBeLessThan(DOME_LINE_QUARTERS);
    }
  });

  test('one round of steam is not enough: the line takes the whole allowance', () => {
    for (const p of SPEC.starts) {
      const run = playRounds(startAt(p), DOME_ROUNDS - 1, true);
      expect(run.won, `${p.x},${p.y}`).toBe(false);
    }
  });

  test('retry gives the same spots and the same board', () => {
    const lineup = ['draughtsman'] as const;
    const a = placeParty(SPEC, lineup, 1);
    const b = placeParty(SPEC, lineup, 1);
    expect(a.units).toEqual(b.units);
    const spells = compiledFor(lattice(), 'draughtsman').spells;
    const make = () =>
      createBattle({
        title: BATH_THRESHOLD.name,
        board: BATH_THRESHOLD.board,
        seed: 1,
        objective: BATH_THRESHOLD.goal,
        party: { draughtsman: { spells } },
        lineup,
        startSeed: 1,
      }).state;
    expect(boardOf(make())).toBe(boardOf(make()));
    expect(memberById(make(), 'draughtsman').pos).toEqual(memberById(make(), 'draughtsman').pos);
  });
});
