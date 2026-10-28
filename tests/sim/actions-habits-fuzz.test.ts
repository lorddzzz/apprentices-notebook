import { describe, expect, test } from 'vitest';
import { type BasicActionId, HABIT_IDS, type HabitId, LINES, type MemberId } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  basicDirs,
  castableSpells,
  createBattle,
  createRng,
  type GameEvent,
  isSilent,
  legalAims,
  legalMoves,
  memberById,
  parseLattice,
  spellsFor,
  witnessedIn,
} from '$engine';
import { CAST_EVENT_CAP } from '$engine/ctx';
import { blocksUnits, tileAt } from '$engine/queries';
import { type BoardView, projectWith, viewOf } from '../../src/app/view';

/**
 * AH-8's heavier net over every basic action and every habit (the AH-7 walks in fuzz.test.ts are
 * the smoke version). A seeded walk of legal moves, basic actions and casts, on boards with plates,
 * canals, drops, jars, kettles, fog and foes, with a page matched to the kit's habit most of the
 * time. Each step must: project to the engine's state, stay under the event cap, leave its input
 * state untouched (a `BattleState.erased` record included), replay to the same log, keep every unit
 * on its own standable tile, and log only known lines and habits. Scale with `AH_FUZZ_SEEDS`.
 */

const SEEDS = Number(process.env.AH_FUZZ_SEEDS ?? 240);
const STEPS = 28;

const BASICS: readonly BasicActionId[] = ['shove', 'pull', 'hop', 'swap'];
const KIT_HABITS: readonly (HabitId | null)[] = [null, ...HABIT_IDS];
const LINE_IDS = new Set<string>(LINES.map((l) => l.id));

/** The page that lets each habit show itself; a habit without one takes a generic page. */
const HABIT_PAGE: Partial<Record<HabitId, string>> = {
  fuseOnStep: 'Touch> Fuse Oil',
  markTwice: 'Bolt> Tally Strike',
  steamproof: 'Splash> Steam',
  holdTwo: 'Bolt> Hold',
  nearUnison: 'Bolt> Unison Strike',
  longTouch: 'Touch> Strike',
  restoreErase: 'Bolt> Erase',
  twoJars: 'Bolt> Jar Fuse',
};
const PAGES = [
  'Bolt> Oil Spark',
  'Touch> Hold Strike',
  'Bolt> Ink Erase',
  'Splash> Steam',
  'Touch> Spark',
  'Bolt> Jar Fuse',
  'Bolt> Ink Strike',
  'Splash> Oil',
  'Bolt> Shove',
  'Touch> Ink Erase',
];

const BOARDS = [
  'D . r . S\n. w> r o .\n= . ~ . {pool}\nb . i . r\n. . . . .',
  'D . r~ . S\n. {wall} r . .\n{kettle} . . m .\n. ew> w> . r\n. . {fog} . d',
  'S . . D .\nr! . {stain} . r\n. # . = .\n. . ~ . m\nM . . . r',
  'D r~ {brand} . .\n. . {bank} S .\n. {kettle} . . r!\nw> w> ew> . .\n. . . {fog} .',
];

type Who = 'draughtsman' | 'stoker';
const WHO: readonly Who[] = ['draughtsman', 'stoker'];

/** What the board draws, minus engine bookkeeping (durations, lineage numbers). */
function drawn(v: BoardView) {
  return {
    units: v.units.map((u) =>
      u.alive
        ? {
            id: u.id,
            pos: u.pos,
            hp: u.hp,
            shield: u.shield,
            mark: u.mark,
            bound: u.bound,
            collar: u.collar,
            born: u.born,
            shackled: u.shackle > 0,
            held: u.held > 0,
            stunned: u.stunned,
            intent: u.intent,
          }
        : { id: u.id, alive: false },
    ),
    tiles: v.tiles.map((t) => ({
      state: t.state,
      hits: t.hits,
      jar: t.jar,
      vent: t.vent,
      gate: t.gate,
    })),
    round: v.round,
    phase: v.phase,
  };
}

function options(state: BattleState): Action[] {
  const out: Action[] = [{ type: 'endTurn' }];
  for (const id of WHO) {
    const m = memberById(state, id);
    if (m.hp <= 0) continue;
    for (const to of legalMoves(state, id)) out.push({ type: 'move', unit: id, to });
    for (const dir of m.acted ? [] : basicDirs(state, id))
      out.push({ type: m.action, unit: id, dir } as Action);
    for (const { spell, usable } of castableSpells(state, id)) {
      if (!usable) continue;
      for (const aim of legalAims(state, id, spell.key))
        out.push({ type: 'cast', unit: id, spell: spell.key, aim });
    }
  }
  return out;
}

/** Every living unit stands alone on a tile that does not block units. */
function standsLegally(state: BattleState): string | null {
  const seen = new Set<string>();
  for (const u of state.units) {
    if (u.hp <= 0) continue;
    const k = `${u.pos.x},${u.pos.y}`;
    if (seen.has(k)) return `two units on ${k}`;
    seen.add(k);
    if (blocksUnits(tileAt(state, u.pos))) return `${u.id} stands on a blocking tile ${k}`;
  }
  return null;
}

function build(seed: number) {
  const rng = createRng(seed * 104729);
  const pick = <T>(xs: readonly T[]): T => {
    const x = xs[rng.int(0, xs.length - 1)];
    if (x === undefined) throw new Error('empty walk choice');
    return x;
  };
  const kit = (who: Who, habit: HabitId | null, action: BasicActionId) => {
    const matched = habit ? HABIT_PAGE[habit] : undefined;
    const page = matched && rng.int(0, 3) > 0 ? matched : pick(PAGES);
    return { spells: spellsFor(who, parseLattice(page), {}), action, habit };
  };
  // Every action and every habit lands on the first member over the first seeds, in turn.
  const action = BASICS[(seed - 1) % BASICS.length] ?? 'shove';
  const habit = KIT_HABITS[Math.floor((seed - 1) / BASICS.length) % KIT_HABITS.length] ?? null;
  const board = BOARDS[(seed - 1) % BOARDS.length] ?? '';
  const party: Partial<Record<MemberId, ReturnType<typeof kit>>> = {
    draughtsman: kit('draughtsman', habit, action),
    stoker: kit('stoker', pick(KIT_HABITS), pick(BASICS)),
  };
  return { spec: { title: `ah fuzz ${seed}`, board, seed, party }, pick, rng };
}

describe('AH-8: seeded walks with every action and habit', () => {
  const sawAction = new Set<string>();
  const sawHabit = new Set<string>();

  for (let seed = 1; seed <= SEEDS; seed++) {
    test(`walk ${seed}`, () => {
      const { spec, pick, rng } = build(seed);
      let state = createBattle(spec).state;
      const played: Action[] = [];
      const logs: string[] = [];
      for (let n = 0; n < STEPS && state.phase === 'player'; n++) {
        const action = rng.int(0, 5) === 0 ? ({ type: 'endTurn' } as const) : pick(options(state));
        const frozen = JSON.stringify(state);
        const before = viewOf(state);
        const result = applyAction(state, action);
        const label = `#${n} ${action.type}`;

        expect(JSON.stringify(state), `${label}: input state untouched`).toBe(frozen);
        if (action.type !== 'endTurn' && action.type !== 'move')
          expect(result.events.length, `${label}: event cap`).toBeLessThanOrEqual(
            CAST_EVENT_CAP + 3,
          );
        const projected = result.events.reduce(
          (v, e) => (isSilent(e) ? v : projectWith(v, e)),
          before,
        );
        expect(drawn(projected), `${label}: projection`).toEqual(drawn(viewOf(result.state)));
        expect(standsLegally(result.state), `${label}: standing`).toBeNull();
        for (const id of witnessedIn(result.events)) expect(LINE_IDS.has(id), id).toBe(true);
        for (const e of result.events as GameEvent[]) {
          if ('habit' in e && e.habit) {
            expect(HABIT_IDS, `${label}: ${e.type} habit`).toContain(e.habit);
            sawHabit.add(e.habit);
          }
        }
        // The record of the last Erase is battle state: it must clone.
        expect(() => structuredClone(result.state.erased ?? null)).not.toThrow();

        sawAction.add(action.type);
        played.push(action);
        logs.push(JSON.stringify(result.events));
        state = result.state;
      }

      // Replaying the same actions from a fresh battle gives the same logs and the same end.
      let replay = createBattle(spec).state;
      played.forEach((a, i) => {
        const r = applyAction(replay, a);
        expect(JSON.stringify(r.events), `replay step ${i}`).toBe(logs[i]);
        replay = r.state;
      });
      expect(JSON.stringify(replay)).toBe(JSON.stringify(state));
    });
  }

  test('the walks played every basic action and tagged events with all seven new habits', () => {
    for (const a of BASICS) expect(sawAction.has(a), a).toBe(true);
    console.info(`AH fuzz: ${SEEDS} walks; habits tagged: ${[...sawHabit].sort().join(', ')}`);
    if (SEEDS >= 240) {
      // The seven new habits (twoJars and forkAhead are older and tag nothing).
      for (const h of HABIT_IDS.filter((x) => x !== 'twoJars' && x !== 'forkAhead'))
        expect(sawHabit.has(h), h).toBe(true);
    }
  });
});
