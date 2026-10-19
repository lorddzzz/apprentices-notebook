import { describe, expect, test, vi } from 'vitest';
import { ENCOUNTERS, SCENARIOS } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  createBattle,
  type GameEvent,
  isSilent,
  scenarioSpec,
} from '$engine';
import * as ctxModule from '$engine/ctx';
import { fallbackLattices } from '../../src/app/lab';
import { buildSteps } from '../../src/app/playback';
import { type BoardView, projectWith, viewOf, withoutIntents } from '../../src/app/view';

/**
 * The drift guard: playback projects events onto a view; at the end it must agree with the
 * engine's own state on everything the board draws. Silent counters (a layer's rounds left, how
 * long a shackle or hold still has) are checked as "is it there", not "how long".
 */
function drawn(v: BoardView) {
  const lineage = new Map<number, number>();
  const classOf = (n: number | null): number | null => {
    if (n === null) return null;
    if (!lineage.has(n)) lineage.set(n, lineage.size);
    return lineage.get(n) ?? null;
  };
  return {
    units: v.units.map((u) =>
      u.alive
        ? {
            id: u.id,
            pos: u.pos,
            hp: u.hp,
            alive: u.alive,
            mark: u.mark,
            bound: u.bound,
            lineage: classOf(u.lineage),
            shield: u.shield,
            collar: u.collar,
            born: u.born,
            shackled: u.shackle > 0,
            held: u.held > 0,
            stunned: u.stunned,
            intent: u.intent,
          }
        : { id: u.id, hp: u.hp, alive: u.alive },
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

function projected(start: BoardView, events: readonly GameEvent[], end: BattleState) {
  const want = viewOf(end);
  const last = buildSteps(start, events, 1, [], want).at(-1)?.view ?? start;
  return { got: drawn(last), want: drawn(want) };
}

/** The same without the playback's effects and lines: all the guard needs, for the many runs below. */
function projectedFast(start: BoardView, events: readonly GameEvent[], end: BattleState) {
  const want = viewOf(end);
  const last = events.reduce((v, e) => (isSilent(e) ? v : projectWith(v, e, want)), start);
  return { got: drawn(last), want: drawn(want) };
}

function expectProjects(start: BoardView, events: readonly GameEvent[], end: BattleState): void {
  const { got, want } = projected(start, events, end);
  expect(got).toEqual(want);
}

function playThrough(
  created: { state: BattleState; events: GameEvent[] },
  actions: readonly Action[],
) {
  expectProjects(withoutIntents(viewOf(created.state)), created.events, created.state);
  let s = created.state;
  for (const a of actions) {
    const r = applyAction(s, a);
    expectProjects(viewOf(s), r.events, r.state);
    s = r.state;
  }
}

const endTurn: Action = { type: 'endTurn' };
const castRight = (unit: 'draughtsman' | 'stoker'): Action => ({
  type: 'cast',
  unit,
  spell: '',
  aim: { kind: 'dir', dir: 'right' },
});

describe('projection matches engine state', () => {
  for (const def of SCENARIOS) {
    test(`scenario ${def.id}`, () => {
      const created = createBattle(scenarioSpec(def, { lab: true, lattices: fallbackLattices() }));
      playThrough(created, [...def.demo, endTurn, endTurn, endTurn]);
    });
  }

  for (const enc of ENCOUNTERS) {
    test(`encounter ${enc.id}, idle party for 4 rounds`, () => {
      const created = createBattle({ title: enc.title, board: enc.layout, seed: 7 });
      let s = created.state;
      const actions: Action[] = [];
      for (let i = 0; i < 4 && s.phase === 'player'; i++) {
        actions.push(endTurn);
        s = applyAction(s, endTurn).state;
      }
      playThrough(created, actions);
    });
  }

  test('casts of each source rune: the projection follows the log', () => {
    const lab = { lab: true } as const;
    const cases: Array<[string, Record<string, string>, Action]> = [
      ['D . r r\n. . r .', { draughtsman: 'Bolt> Ink' }, castRight('draughtsman')],
      ['D . r', { draughtsman: 'Bolt> Strike' }, castRight('draughtsman')],
      ['S . . o o r', { stoker: 'Bolt> Spark' }, castRight('stoker')],
      [
        '. r~ r~\n. . .\nS . .',
        { stoker: 'Splash> Oil' },
        { type: 'cast', unit: 'stoker', spell: 'A1', aim: { kind: 'tile', at: { x: 1, y: 0 } } },
      ],
      [
        'S r .',
        { stoker: 'Touch> Strike' },
        { type: 'cast', unit: 'stoker', spell: 'A1', aim: { kind: 'tile', at: { x: 1, y: 0 } } },
      ],
    ];
    for (const [board, lattices, action] of cases) {
      const created = createBattle(
        scenarioSpec({ board, lattices } as Parameters<typeof scenarioSpec>[0], lab),
      );
      const key = created.state.units.find((u) => u.kind === 'member')?.spells[0]?.key;
      playThrough(created, [action.type === 'cast' && key ? { ...action, spell: key } : action]);
    }
  });
});

// ── Every engine run the scenario and engine suites make ──────────────────────────────────────
//
// Like the lines integrity test (tests/data/lines.test.ts), this file re-registers those suites
// after a spy on `runDraft`, which every engine action goes through. Each run is then replayed:
// the view projected from the log must equal the view of the state the engine ended on. push.test
// and actions.test mock '$engine/hooks' for their whole module graph, so they stay out; the
// curated cases above and below cover pushes and the actions.

interface Run {
  test: string;
  prev: BattleState;
  next: BattleState;
  events: GameEvent[];
}
const runs: Run[] = [];
const realRunDraft = ctxModule.runDraft;
vi.spyOn(ctxModule, 'runDraft').mockImplementation((...args) => {
  const r = realRunDraft(...args);
  runs.push({
    test: expect.getState().currentTestName ?? '?',
    prev: args[0],
    next: r.state,
    events: r.events,
  });
  return r;
});
import.meta.glob(
  [
    '../scenarios/*.test.ts',
    '../engine/*.test.ts',
    '!../scenarios/push.test.ts',
    '!../scenarios/actions.test.ts',
    '!../engine/events.test.ts', // fabricates events on a board that does not change
  ],
  { eager: true },
);

const EVENT_TYPES: GameEvent['type'][] = [
  'battleStart',
  'round',
  'phase',
  'won',
  'lost',
  'moved',
  'moveUndone',
  'shove',
  'cast',
  'lands',
  'stopped',
  'damage',
  'shieldAbsorbs',
  'shieldGained',
  'died',
  'telegraph',
  'idle',
  'attack',
  'miss',
  'drift',
  'gateBurns',
  'vent',
  'snuff',
  'foeBursts',
  'summon',
  'flare',
  'trace',
  'aimed',
  'landed',
  'mixed',
  'washed',
  'burst',
  'stateFades',
  'spreadState',
  'push',
  'crush',
  'dropped',
  'stunned',
  'held',
  'swapped',
  'drawn',
  'erased',
  'marked',
  'collared',
  'markSpread',
  'markSpent',
  'markLifted',
  'released',
  'conducted',
  'jarSealed',
  'jarOpened',
  'jarCrumbles',
  'scheduled',
  'repeated',
  'triggered',
  'fizzles',
  'named',
];

// Tests that move a unit by hand inside a draft (no event says so), so no log could project it.
const SETS_UP_BY_HAND = [
  'spreading (P29) > entering a cloud spreads the mark',
  // holds a rat for 9 rounds by hand; the view only knows Hold's usual length
  'Draughtsman: he keeps two jars > two jars cast in turn, then a third crumbles the oldest',
];

describe('projection drift guard over the engine suites', () => {
  test('every run the suites made projects to the engine state', () => {
    expect(runs.length).toBeGreaterThan(200);
    const drifted: string[] = [];
    runs.forEach((run, i) => {
      if (run.events.length === 0 || SETS_UP_BY_HAND.includes(run.test)) return;
      const { got, want } = projectedFast(viewOf(run.prev), run.events, run.next);
      try {
        expect(got).toEqual(want);
      } catch {
        const types = [...new Set(run.events.map((e) => e.type))].join(',');
        drifted.push(`run ${i} [${run.test}] (${types}): ${firstDifference(got, want)}`);
      }
    });
    expect(drifted).toEqual([]);
  }, 60_000);
});

// Which events the guard saw: a new event type nobody replays would be a hole.
describe('the guard sees the whole union', () => {
  test('every event type has been replayed', () => {
    const seen = new Set(runs.flatMap((r) => r.events.map((e) => e.type)));
    // Conduct (E7) is the only emitter of 'conducted'; delete this when its scenarios land.
    const notYet: GameEvent['type'][] = ['conducted'];
    const missing = EVENT_TYPES.filter((t) => !seen.has(t) && !notYet.includes(t));
    expect(missing).toEqual([]);
  });
});

function firstDifference(got: unknown, want: unknown, path = ''): string {
  if (typeof got !== 'object' || typeof want !== 'object' || got === null || want === null) {
    return Object.is(got, want) ? '' : `${path}: ${JSON.stringify(got)} vs ${JSON.stringify(want)}`;
  }
  for (const key of new Set([...Object.keys(got), ...Object.keys(want)])) {
    const d = firstDifference(
      (got as Record<string, unknown>)[key],
      (want as Record<string, unknown>)[key],
      `${path}/${key}`,
    );
    if (d) return d;
  }
  return '';
}
