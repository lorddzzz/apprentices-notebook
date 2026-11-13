import { describe, expect, test } from 'vitest';
import {
  type Action,
  applyAction,
  basicDirs,
  castableSpells,
  createBattle,
  createRng,
  isSilent,
  legalAims,
  legalMoves,
  memberById,
  parseLattice,
  spellsFor,
} from '$engine';
import { CAST_EVENT_CAP } from '$engine/ctx';
import { BOIL_OVER_RULE_ID } from '$engine/districts/bathhouses/types';
import type { RuleId } from '$engine/districts/types';
import { listRules } from '$engine/rules';
import type { BattleState } from '$engine/types';
import { type BoardView, projectWith, viewOf } from '../../src/app/view';

/**
 * MIX-1 (platform-closure plan, Pack F): every pair of the district rules on one seeded board.
 * A feature is a few tiles of the board plus, for a listed rule, its state. A pair puts both on
 * the board with the two party members and plays seeded walks of legal moves, basic actions and
 * casts, ending turns so dusk rules and the enemy phase run. Each pair is checked for three things:
 * nothing throws, no action overruns the event cap, and the log projects to the state the engine
 * reached. The cartographers' guild hand joins the list when CG-2 merges.
 */

type Cell = { x: number; y: number; tok: string };
interface Feature {
  name: string;
  cells: readonly Cell[];
  /** Rules listed on the fight (the others are brought by their pieces or terrain). */
  list?: (seed: number) => { ids: RuleId[]; config: Record<string, unknown> };
}

const W = 8;
const H = 6;

const FEATURES: readonly Feature[] = [
  {
    name: 'boil-over',
    cells: [
      { x: 2, y: 0, tok: '~' },
      { x: 3, y: 0, tok: '~' },
      { x: 2, y: 1, tok: '~' },
      { x: 4, y: 0, tok: '@' },
    ],
    list: (seed) => ({
      ids: [BOIL_OVER_RULE_ID],
      config: { [BOIL_OVER_RULE_ID]: { heat: 1 + (seed % 3) } },
    }),
  },
  {
    name: 'collapse',
    cells: [
      { x: 4, y: 2, tok: '{pier}' },
      { x: 5, y: 2, tok: '{span}' },
      { x: 7, y: 2, tok: '{span}' },
    ],
  },
  {
    name: 'bells',
    cells: [
      { x: 0, y: 3, tok: '{bell:low}' },
      { x: 1, y: 3, tok: '{bell:mid}' },
      { x: 2, y: 3, tok: '{bell:low}' },
    ],
  },
  {
    name: 'writs',
    cells: [
      { x: 1, y: 4, tok: 'r' },
      { x: 3, y: 4, tok: '{return}' },
    ],
  },
  {
    name: 'current',
    cells: [
      { x: 3, y: 5, tok: 'w>o' },
      { x: 4, y: 5, tok: 'w>o' },
      { x: 5, y: 5, tok: 'w>' },
    ],
  },
  { name: 'seam hands', cells: [{ x: 7, y: 5, tok: 'G' }] },
];

const WALK_PAGES = [
  'Bolt> Oil Spark',
  'Touch> Hold Strike',
  'Bolt> Ink Erase',
  'Splash> Steam',
  'Touch> Spark',
  'Bolt> Jar Fuse',
];
const SEEDS = [1, 2, 3, 4, 5, 6];
const STEPS = 28;
const CAP = CAST_EVENT_CAP + 3;

function boardOf(a: Feature, b: Feature): string {
  const grid: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('.'));
  const put = (x: number, y: number, tok: string) => {
    const row = grid[y];
    if (row) row[x] = tok;
  };
  put(0, 5, 'D');
  put(1, 5, 'S');
  put(7, 0, 'd');
  for (const f of [a, b]) for (const c of f.cells) put(c.x, c.y, c.tok);
  return grid.map((r) => r.join(' ')).join('\n');
}

function visible(v: BoardView) {
  return {
    units: v.units.map((u) =>
      u.alive
        ? {
            id: u.id,
            pos: u.pos,
            hp: u.hp,
            alive: u.alive,
            shield: u.shield,
            mark: u.mark,
            bound: u.bound,
            collar: u.collar,
            born: u.born,
            shackle: u.shackle > 0,
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
      gate: t.gate,
      vent: t.vent,
      drop: t.drop,
      water: t.water,
      grate: t.grate,
      piece: t.piece?.id ?? null,
    })),
    round: v.round,
    phase: v.phase,
  };
}

interface Outcome {
  threw: string | null;
  overran: string | null;
  mismatch: string | null;
}

function play(a: Feature, b: Feature, seed: number): Outcome {
  const out: Outcome = { threw: null, overran: null, mismatch: null };
  const rng = createRng(seed * 7919 + a.name.length * 31 + b.name.length);
  const pick = <T>(xs: readonly T[]): T => {
    const x = xs[rng.int(0, xs.length - 1)];
    if (x === undefined) throw new Error('empty choice');
    return x;
  };
  let state: BattleState;
  try {
    const spellsOf = (who: 'draughtsman' | 'stoker') =>
      spellsFor(who, parseLattice(pick(WALK_PAGES)), {});
    state = createBattle({
      title: `pair ${a.name} x ${b.name} ${seed}`,
      board: boardOf(a, b),
      seed,
      party: {
        draughtsman: { spells: spellsOf('draughtsman'), action: 'shove' },
        stoker: { spells: spellsOf('stoker'), action: pick(['shove', 'pull', 'hop', 'swap']) },
      },
    }).state;
    const ids: RuleId[] = [];
    const config: Record<string, unknown> = {};
    for (const f of [a, b]) {
      const l = f.list?.(seed);
      if (l) {
        ids.push(...l.ids);
        Object.assign(config, l.config);
      }
    }
    if (ids.length) state.rules = listRules(state, ids, config as never);
  } catch (e) {
    out.threw = `setup seed ${seed}: ${String(e)}`;
    return out;
  }
  for (let n = 0; n < STEPS && state.phase === 'player'; n++) {
    let label = 'choose';
    try {
      const options: Action[] = [{ type: 'endTurn' }];
      for (const id of ['draughtsman', 'stoker'] as const) {
        const m = memberById(state, id);
        if (m.hp <= 0 || m.out) continue;
        for (const to of legalMoves(state, id)) options.push({ type: 'move', unit: id, to });
        for (const dir of m.acted ? [] : basicDirs(state, id)) {
          options.push({ type: m.action, unit: id, dir } as Action);
        }
        for (const { spell, usable } of castableSpells(state, id)) {
          if (!usable) continue;
          for (const aim of legalAims(state, id, spell.key)) {
            options.push({ type: 'cast', unit: id, spell: spell.key, aim });
          }
        }
      }
      const action = rng.int(0, 5) === 0 ? { type: 'endTurn' as const } : pick(options);
      label = `seed ${seed} step ${n} ${action.type}`;
      const before = viewOf(state);
      const result = applyAction(state, action);
      if (result.events.length > CAP && !out.overran)
        out.overran = `${label}: ${result.events.length} events`;
      const projected = result.events.reduce(
        (v, e) => (isSilent(e) ? v : projectWith(v, e)),
        before,
      );
      if (!out.mismatch) {
        const got = visible(projected);
        const want = visible(viewOf(result.state));
        if (JSON.stringify(got) !== JSON.stringify(want)) {
          const diff = (Object.keys(want) as (keyof typeof want)[]).find(
            (k) => JSON.stringify(got[k]) !== JSON.stringify(want[k]),
          );
          let extra = '';
          if (diff === 'units') {
            const gu = got.units;
            const wu = want.units;
            const i = wu.findIndex((u, k) => JSON.stringify(u) !== JSON.stringify(gu[k]));
            const g = gu[i] as Record<string, unknown>;
            const w = wu[i] as Record<string, unknown>;
            const keys = Object.keys(w).filter(
              (k) => JSON.stringify(g[k]) !== JSON.stringify(w[k]),
            );
            extra = ` (${String(w.id)}: ${keys.map((k) => `${k} projected ${JSON.stringify(g[k])} engine ${JSON.stringify(w[k])}`).join('; ')})`;
          }
          out.mismatch = `${label}: ${String(diff)} differs${extra}`;
        }
      }
      state = result.state;
    } catch (e) {
      out.threw = `${label}: ${String(e)}`;
      return out;
    }
  }
  return out;
}

const cache = new Map<string, Outcome>();
function pairOutcome(a: Feature, b: Feature): Outcome {
  const k = `${a.name}|${b.name}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const merged: Outcome = { threw: null, overran: null, mismatch: null };
  for (const seed of SEEDS) {
    const o = play(a, b, seed);
    merged.threw ??= o.threw;
    merged.overran ??= o.overran;
    merged.mismatch ??= o.mismatch;
  }
  cache.set(k, merged);
  return merged;
}

/** Pairs known to fail today (MIX-F1 emptied it: the Seam hands project their intent and born flag). */
const KNOWN_FAILS: Readonly<Record<string, readonly ('throws' | 'cap' | 'projection')[]>> = {};
const expectedFail = (a: Feature, b: Feature, what: 'throws' | 'cap' | 'projection') =>
  KNOWN_FAILS[`${a.name} x ${b.name}`]?.includes(what) ?? false;

describe('MIX-1: district rule pairs on one board', () => {
  for (let i = 0; i < FEATURES.length; i++) {
    for (let j = i + 1; j < FEATURES.length; j++) {
      const a = FEATURES[i] as Feature;
      const b = FEATURES[j] as Feature;
      const name = `${a.name} x ${b.name}`;
      const t = (what: 'throws' | 'cap' | 'projection') =>
        expectedFail(a, b, what) ? test.fails : test;
      t('throws')(
        `MIX-1: ${name} never throws`,
        () => {
          expect(pairOutcome(a, b).threw).toBeNull();
        },
        60_000,
      );
      t('cap')(
        `MIX-1: ${name} never overruns the event cap`,
        () => {
          expect(pairOutcome(a, b).overran).toBeNull();
        },
        60_000,
      );
      t('projection')(
        `MIX-1: ${name} projection equals final state`,
        () => {
          expect(pairOutcome(a, b).mismatch).toBeNull();
        },
        60_000,
      );
    }
  }
});
