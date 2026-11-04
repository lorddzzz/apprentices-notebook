import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GoalStep, RivalDef, RivalSpellDef } from '$data/rivals';
import { RIVALS } from '$data/rivals';
import { createBattle } from '$engine/battle';
import { parseLabel } from '$engine/notation';
import { CORE_GOALS, goalOf, registerGoal } from '$engine/rivals/goals';
import { planRival } from '$engine/rivals/plan';
import type { GoalDef } from '$engine/rivals/types';
import type { BattleState, EnemyUnit } from '$engine/types';

/**
 * RV-12: the goal vocabulary and `registerGoal`. Plans are pinned on small boards with a fixture
 * kit swapped into the Lamplighter's def (the same trick the RV-4 suite uses); the real routine is
 * pinned by the RV-10 suite and `tests/scenarios/lamplighter.test.ts`.
 */

const found = RIVALS.lamplighter;
if (!found) throw new Error('no def');
const def: RivalDef = found;
const real = { spells: def.spells, routine: def.routine, trick: def.trick };
const HERD: RivalSpellDef = { id: 'herd', name: 'Herd', lattice: 'Bolt> Oil Shove', charges: 5 };
const INK: RivalSpellDef = { id: 'ink', name: 'Ink', lattice: 'Bolt> Ink', charges: 5 };

function kit(spells: RivalSpellDef[], routine: GoalStep[]) {
  Object.assign(def, { spells, routine, trick: null });
}
beforeEach(() => kit([HERD], []));
afterEach(() => {
  Object.assign(def, real);
});

const make = (board: string) => createBattle({ title: 't', board, seed: 1 }).state;
const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};
const plan = (s: BattleState, move = true) => planRival(s, rivalOf(s).id, move);

describe('the registry', () => {
  it('knows the six core goals and nothing else by default', () => {
    expect(CORE_GOALS.map((g) => g.id)).toEqual([
      'hitParty',
      'herdInto',
      'openOwnObject',
      'placeObjectNear',
      'approach',
      'holdDistance',
    ]);
    for (const g of CORE_GOALS) expect(goalOf(g.id)).toBe(g);
    expect(goalOf('canals:nothing')).toBeNull();
  });

  it('registers a district goal, refuses a repeat or a core id, and removes it again', () => {
    const goal: GoalDef = { id: 'canals:testGoal', accepts: () => true, score: () => 1 };
    const remove = registerGoal(goal);
    expect(goalOf('canals:testGoal')).toBe(goal);
    expect(() => registerGoal({ ...goal })).toThrow(/registered twice/);
    expect(() => registerGoal({ id: 'hitParty' })).toThrow(/registered twice/);
    remove();
    expect(goalOf('canals:testGoal')).toBeNull();
    remove(); // idempotent
    registerGoal(goal)(); // free to register again after removal
  });

  it('a step naming an unknown goal never matches, so the next step plays', () => {
    kit(
      [INK],
      [
        { goal: 'canals:unknown', action: { kind: 'spell', spell: 'ink' } },
        { goal: 'hitParty', action: { kind: 'spell', spell: 'ink' } },
      ],
    );
    expect(plan(make('L . . D'))?.intent).toMatchObject({
      kind: 'cast',
      spell: 'ink',
      aim: { dir: 'right' },
    });
  });
});

describe('registered goals drive the routine', () => {
  it('an action goal chooses by its own score: the aim with the highest score wins', () => {
    // Apprentices left and right of the rival; the goal prefers whichever aim points left.
    kit([INK], [{ goal: 'canals:preferLeft', action: { kind: 'spell', spell: 'ink' } }]);
    const remove = registerGoal({
      id: 'canals:preferLeft',
      accepts: () => true,
      score: (_o, _i, c) =>
        c.intent.kind === 'cast' && c.intent.aim.kind === 'dir' && c.intent.aim.dir === 'left'
          ? 1
          : 0,
    });
    try {
      expect(plan(make('D . L . S'), false)?.intent).toMatchObject({ aim: { dir: 'left' } });
    } finally {
      remove();
    }
  });

  it('a goal that accepts nothing yields no telegraph', () => {
    kit([INK], [{ goal: 'canals:never', action: { kind: 'spell', spell: 'ink' } }]);
    const remove = registerGoal({ id: 'canals:never', accepts: () => false, score: () => 0 });
    try {
      expect(plan(make('L . D'))).toEqual({ path: [], intent: null });
    } finally {
      remove();
    }
  });

  it('a move goal scores destinations: higher wins, null does not qualify', () => {
    // He stands on A1 with the apprentice on E1: the goal wants the tile farthest to the right.
    kit([INK], [{ goal: 'canals:eastward', action: { kind: 'move' } }]);
    const remove = registerGoal({
      id: 'canals:eastward',
      moveScore: (_i, d) => (d.at.x > 0 ? d.at.x : null),
    });
    try {
      expect(plan(make('L . . . D'))).toEqual({ path: [parseLabel('B1')], intent: null });
      // Round 1 (`move` false) never walks.
      expect(plan(make('L . . . D'), false)).toEqual({ path: [], intent: null });
    } finally {
      remove();
    }
  });

  it('goal params reach the goal', () => {
    kit([INK], [{ goal: 'canals:param', action: { kind: 'move' }, params: { to: 1 } }]);
    const seen: unknown[] = [];
    const remove = registerGoal({
      id: 'canals:param',
      moveScore: (i) => {
        seen.push(i.params.to);
        return null;
      },
    });
    try {
      plan(make('L . D'));
      expect(seen.length).toBeGreaterThan(0);
      expect(new Set(seen)).toEqual(new Set([1]));
    } finally {
      remove();
    }
  });
});

describe('the core vocabulary', () => {
  it('hitParty lands an effect on an apprentice', () => {
    kit([INK], [{ goal: 'hitParty', action: { kind: 'spell', spell: 'ink' } }]);
    expect(plan(make('L . . D'), false)?.intent).toMatchObject({ kind: 'cast', spell: 'ink' });
  });

  it('herdInto `tiles` accepts only a push onto a named tile', () => {
    // Shoving D along the row from A1 sends them from B1 to C1.
    const step = (tiles: { x: number; y: number }[]): GoalStep => ({
      goal: 'herdInto',
      action: { kind: 'spell', spell: 'herd' },
      params: { tiles },
    });
    kit([HERD], [step([{ x: 2, y: 0 }])]);
    expect(plan(make('L D . .\n. . . .'), false)?.intent).toMatchObject({
      kind: 'cast',
      spell: 'herd',
      aim: { dir: 'right' },
    });
    kit([HERD], [step([{ x: 0, y: 1 }])]);
    expect(plan(make('L D . .\n. . . .'), false)?.intent).toBeNull();
  });

  it('herdInto as a move stands where the push closes on a target', () => {
    kit(
      [HERD],
      [{ goal: 'herdInto', action: { kind: 'move' }, params: { tiles: [{ x: 0, y: 0 }] } }],
    );
    // D on B1, the target on A1: from D1 his Bolt flies left, hits D and pushes them to A1.
    expect(plan(make('. D . .\n. . . L'))?.path).toEqual([parseLabel('D1')]);
    // A target the push cannot approach never qualifies, so he stays.
    kit(
      [HERD],
      [{ goal: 'herdInto', action: { kind: 'move' }, params: { tiles: [{ x: 3, y: 1 }] } }],
    );
    expect(plan(make('. D . .\n. . . L'))?.path).toEqual([]);
  });

  it('approach closes the distance; holdDistance settles at its range', () => {
    kit([INK], [{ goal: 'approach', action: { kind: 'move' } }]);
    expect(plan(make('L . . . D'))?.path).toEqual([parseLabel('B1')]);
    kit([INK], [{ goal: 'holdDistance', action: { kind: 'move' }, params: { range: 1 } }]);
    expect(plan(make('L . . . D'))?.path).toEqual([parseLabel('B1')]);
    // Already at range 4: stays put, which is no walk and so no plan.
    kit([INK], [{ goal: 'holdDistance', action: { kind: 'move' }, params: { range: 4 } }]);
    expect(plan(make('L . . . D'))?.path).toEqual([]);
  });
});
