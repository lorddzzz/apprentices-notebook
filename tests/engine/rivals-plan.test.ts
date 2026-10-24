import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RIVALS } from '$data/rivals';
import { applyAction, createBattle } from '$engine/battle';
import { cloneData } from '$engine/clone';
import type { GameEvent } from '$engine/events';
import { parseLabel } from '$engine/notation';
import { isFire, tileAt } from '$engine/queries';
import { destinations, planRival, simulate } from '$engine/rivals/plan';
import { createRng } from '$engine/rng';
import type { BattleState, EnemyUnit } from '$engine/types';

/** The rival planner (rivals plan P4, P5; RV-4), with the RV-1 fixture Lamplighter (`Bolt> Ink` ×5). */

const make = (board: string, seed = 1) => createBattle({ title: 't', board, seed }).state;
const rivalOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};
const endTurn = { type: 'endTurn' } as const;

/** A random 5×5 board: the rival, one or two apprentices, some fire, slick and plates. */
function randomBoard(seed: number): string {
  const rng = createRng(seed);
  const cells = Array.from({ length: 25 }, () => '.');
  const free = () => {
    for (;;) {
      const i = rng.int(0, 24);
      if (cells[i] === '.') return i;
    }
  };
  cells[free()] = 'L';
  cells[free()] = 'D';
  if (rng.next() < 0.5) cells[free()] = 'S';
  for (let n = rng.int(0, 4); n > 0; n--)
    cells[free()] = ['*', 'o', '#', 'i'][rng.int(0, 3)] ?? '.';
  return [0, 1, 2, 3, 4].map((y) => cells.slice(y * 5, y * 5 + 5).join(' ')).join('\n');
}

describe('RV-4 planner', () => {
  // These cases pin the planner's rules on the RV-1 fixture kit; RV-5's real kit has its own suite.
  const def = RIVALS.lamplighter;
  if (!def) throw new Error('no def');
  const real = { spells: def.spells, routine: def.routine, trick: def.trick };
  beforeAll(() => {
    Object.assign(def, {
      spells: [{ id: 'lantern', name: 'Lantern', lattice: 'Bolt> Ink', charges: 5 }],
      routine: [],
      trick: null,
    });
  });
  afterAll(() => {
    Object.assign(def, real);
  });

  it('same state gives the same plan; the state and its rng are untouched (property)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = make(randomBoard(seed), seed);
      const before = JSON.stringify(s);
      const id = rivalOf(s).id;
      for (const move of [false, true]) {
        const a = planRival(s, id, move);
        expect(planRival(cloneData(s), id, move)).toEqual(a);
        expect(planRival(JSON.parse(before) as BattleState, id, move)).toEqual(a);
      }
      expect(JSON.stringify(s)).toBe(before);
    }
  });

  it('never telegraphs a starved cast', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = make(randomBoard(seed), seed);
      const plan = planRival(s, rivalOf(s).id, true);
      if (plan?.intent?.kind !== 'cast') continue;
      expect(simulate(s, rivalOf(s).id, plan.path, plan.intent).effect).toBe(true);
    }
  });

  it('plans in round 1 without moving, and shows a cast that hits', () => {
    const s = make('. . . .\nL . . D');
    expect(rivalOf(s).pos).toEqual(parseLabel('A2'));
    expect(rivalOf(s).intent).toMatchObject({
      kind: 'cast',
      spell: 'lantern',
      aim: { dir: 'right' },
    });
  });

  it('breaks aim ties in DIRS order', () => {
    // Apprentices left and right: up, right, down, left → right.
    const s = make('D . L . S');
    expect(rivalOf(s).intent).toMatchObject({ kind: 'cast', aim: { kind: 'dir', dir: 'right' } });
  });

  it('fixes the fallback tile at planning: the adjacent apprentice, or none', () => {
    expect(rivalOf(make('L D .')).intent).toMatchObject({ fallback: parseLabel('B1') });
    expect(rivalOf(make('L . D')).intent).toMatchObject({ fallback: null });
  });

  it('with no effective cast, approaches and shows nothing', () => {
    // A plate blocks the line: no cast can reach, so he walks closer and idles.
    const s = make('L # . D\n. # . .\n. . . .');
    expect(rivalOf(s).intent).toBeNull();
    const r = applyAction(s, endTurn);
    const moved = r.events.find(
      (e): e is Extract<GameEvent, { type: 'moved' }> =>
        e.type === 'moved' && e.unit.id === rivalOf(s).id,
    );
    expect(moved?.to).toEqual(parseLabel('A2'));
    expect(rivalOf(r.state).intent).toBeNull();
  });

  it('walks then re-plans: the telegraph comes from the tile he reached', () => {
    // From A1 nothing lines up with D at B3; a step to B1 does (Bolt down).
    const s = make('L . .\n# . .\n. D .');
    const r = applyAction(s, endTurn);
    expect(rivalOf(r.state).pos).toEqual(parseLabel('B1'));
    expect(rivalOf(r.state).intent).toMatchObject({
      kind: 'cast',
      aim: { kind: 'dir', dir: 'down' },
    });
  });

  it('never walks through fire, a step-jar or a drop', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = make(randomBoard(seed), seed);
      for (const d of destinations(s, rivalOf(s), 3))
        for (const c of d.path) {
          const t = tileAt(s, c);
          expect(isFire(t) || t.terrain.drop || t.jar?.event === 'step').toBe(false);
        }
    }
  });

  it('plays a full unpinned fight deterministically, never showing an empty cast', () => {
    const fight = () => {
      let s = make('. . . . .\nL . . . D\n. . . . .\n. . S . .', 7);
      const log: GameEvent[] = [];
      for (let i = 0; i < 12 && s.phase === 'player'; i++) {
        const r = applyAction(s, endTurn);
        log.push(...r.events);
        s = r.state;
      }
      return { s, log };
    };
    const a = fight();
    expect(fight().log).toEqual(a.log);
    // Ink marks, then deep-marks each apprentice; a third Ink would change nothing, so once both
    // are deep-marked he only walks up and waits (charges left: no dry strike, no fallback).
    const casts = a.log.filter((e) => e.type === 'telegraph' && e.intent.kind === 'cast');
    expect(casts).toHaveLength(3); // plus round 1's, shown by createBattle
    expect(rivalOf(a.s).rival?.charges.lantern).toBe(1);
    expect(a.log.some((e) => e.type === 'fallbackStrike' || e.type === 'attack')).toBe(false);
  });

  it('once dry, walks up and shows the plain strike', () => {
    const s = make('L . . D');
    const r = rivalOf(s).rival;
    if (!r) throw new Error('no rival');
    r.charges.lantern = 0;
    const one = applyAction(s, endTurn);
    expect(rivalOf(one.state).pos).toEqual(parseLabel('B1'));
    expect(rivalOf(one.state).intent).toBeNull();
    const two = applyAction(one.state, endTurn);
    expect(rivalOf(two.state).pos).toEqual(parseLabel('C1'));
    expect(rivalOf(two.state).intent).toMatchObject({ kind: 'rivalStrike', dir: 'right' });
    expect(applyAction(two.state, endTurn).events.some((e) => e.type === 'attack')).toBe(true);
  });
});
