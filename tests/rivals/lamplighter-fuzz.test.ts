import { describe, expect, test } from 'vitest';
import { HABIT_IDS, type MemberId } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  basicDirs,
  castableSpells,
  createBattle,
  createRng,
  describeLog,
  type EnemyUnit,
  type GameEvent,
  legalAims,
  legalMoves,
  memberById,
  parseLattice,
  spellsFor,
} from '$engine';
import { CAST_EVENT_CAP } from '$engine/ctx';
import { blocksUnits, tileAt } from '$engine/queries';
import { simulate } from '$engine/rivals/plan';
import { isEffect } from '$engine/rivals/resolve';

/**
 * RV-10's bot fuzz: random legal party play against the real Lamplighter (kit, routine and wick as
 * shipped), one seeded walk per seed. Each step must replay to the same log, stay under the event
 * cap, leave its input state untouched, keep every unit alone on a standable tile, never open the
 * same jar twice, and never strike the fallback after a chain that did something. Scale with
 * `RV_FUZZ_SEEDS`: the default of 20 walks keeps `pnpm check` fast (about 15 s); the plan's 200 walks run
 * with `RV_FUZZ_SEEDS=200` (about 160 s, nightly or before a gate).
 */

const RV_FUZZ_SEEDS = Number(process.env.RV_FUZZ_SEEDS ?? 20);
const STEPS = 36;

const PAGES = [
  'Bolt> Oil Spark',
  'Bolt> Shove',
  'Touch> Hold Strike',
  'Bolt> Jar Fuse',
  'Bolt> Ink Erase',
  'Splash> Steam',
  'Touch> Spark',
  'Bolt> Strike',
  'Splash> Oil',
];

const BOARDS = [
  'L . . . .\n. . . . .\n. . D . .\n. . . S .\n. . . . .',
  'L _ . . .\n# . . . .\n. . . . D\n. . . . S',
  '. . L . .\n. # . o .\n. . . . .\nD . . . S\n. . . . .',
  'S . . . L\n. = . ~ .\n. . r . .\n. . . . .\nD . . {fog} .',
  'L . . r .\n. i . . .\n. . . * .\nD . . . .\n. . S . .',
];

const WHO: readonly MemberId[] = ['draughtsman', 'stoker'];

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

function build(seed: number) {
  const rng = createRng(seed * 7919);
  const pick = <T>(xs: readonly T[]): T => {
    const x = xs[rng.int(0, xs.length - 1)];
    if (x === undefined) throw new Error('empty walk choice');
    return x;
  };
  const kit = (who: MemberId) => ({
    spells: spellsFor(who, parseLattice(pick(PAGES)), {}),
    action: pick(['shove', 'pull', 'hop', 'swap'] as const),
    habit: pick([null, ...HABIT_IDS]),
  });
  const party = { draughtsman: kit('draughtsman'), stoker: kit('stoker') };
  const board = BOARDS[(seed - 1) % BOARDS.length] ?? '';
  return { spec: { title: `rv fuzz ${seed}`, board, seed, party }, pick, rng };
}

const rivalOf = (s: BattleState): EnemyUnit | undefined =>
  s.units.find((u): u is EnemyUnit => u.kind === 'enemy' && !!u.rival);

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

/** A jar opens once: between two openings on one tile, a jar must have been sealed there. */
function doubleOpening(events: readonly GameEvent[]): string | null {
  const open = new Set<string>();
  for (const e of events) {
    if (e.type === 'jarSealed') open.delete(`${e.at.x},${e.at.y}`);
    if (e.type === 'jarOpened') {
      const k = `${e.at.x},${e.at.y}`;
      if (open.has(k)) return `jar at ${k} opened twice`;
      open.add(k);
    }
  }
  return null;
}

/**
 * A fallback strike follows only a starved action: from the rival's last cast, failed cast or
 * failed order up to the strike, no event is a gameplay effect.
 */
function fallbackAfterPartial(events: readonly GameEvent[]): string | null {
  for (let i = 0; i < events.length; i++) {
    const f = events[i];
    if (f?.type !== 'fallbackStrike') continue;
    let start = i - 1;
    while (start >= 0) {
      const e = events[start];
      if (
        e &&
        ((e.type === 'cast' && e.caster.id === f.unit.id) ||
          ((e.type === 'castFails' || e.type === 'orderFails') && e.unit.id === f.unit.id))
      )
        break;
      start--;
    }
    if (start < 0) return 'fallback with no action before it';
    const mid = events.slice(start + 1, i);
    if (mid.some(isEffect)) return `fallback after an effective chain: ${mid.map((e) => e.type)}`;
  }
  return null;
}

const seen = { endTurns: 0, rivalCasts: 0, wicks: 0, fallbacks: 0, openings: 0, rivalDown: 0 };

describe(`RV-10: ${RV_FUZZ_SEEDS} seeded walks against the Lamplighter`, () => {
  for (let seed = 1; seed <= RV_FUZZ_SEEDS; seed++) {
    test(`walk ${seed}`, () => {
      const { spec, pick, rng } = build(seed);
      let state = createBattle(spec).state;
      const played: Action[] = [];
      const logs: string[] = [];
      for (let n = 0; n < STEPS && state.phase === 'player'; n++) {
        const action = rng.int(0, 4) === 0 ? ({ type: 'endTurn' } as const) : pick(options(state));
        const frozen = JSON.stringify(state);
        const rivalId = rivalOf(state)?.id;
        const result = applyAction(state, action);
        const label = `#${n} ${action.type}`;
        expect(JSON.stringify(state), `${label}: input state untouched`).toBe(frozen);
        if (action.type !== 'endTurn' && action.type !== 'move')
          expect(result.events.length, `${label}: event cap`).toBeLessThanOrEqual(
            CAST_EVENT_CAP + 3,
          );
        expect(standsLegally(result.state), `${label}: standing`).toBeNull();
        expect(doubleOpening(result.events), `${label}: double opening`).toBeNull();
        expect(fallbackAfterPartial(result.events), `${label}: fallback`).toBeNull();
        for (const e of result.events) {
          if (e.type === 'cast' && e.caster.id === rivalId) seen.rivalCasts++;
          if (e.type === 'fallbackStrike') seen.fallbacks++;
          if (e.type === 'jarOpened') seen.openings++;
          if (e.type === 'telegraph' && e.intent.kind === 'trick') seen.wicks++;
        }
        for (const [id, left] of Object.entries(rivalOf(result.state)?.rival?.charges ?? {}))
          expect(left, `${label}: ${id} charges`).toBeGreaterThanOrEqual(0);
        expect(() => structuredClone(result.state)).not.toThrow();
        // What he has just planned is never starved on the board it was planned for. Only when he
        // stands alone: a foe acting after him can change the board (a rat steps on his lantern).
        const alone = state.units.filter((u) => u.kind === 'enemy' && u.hp > 0).length === 1;
        const shown = action.type === 'endTurn' && alone ? rivalOf(result.state) : undefined;
        if (
          shown?.hp &&
          shown.intent &&
          (shown.intent.kind === 'cast' || shown.intent.kind === 'trick')
        )
          expect(
            simulate(result.state, shown.id, [], shown.intent).effect,
            `${label}: telegraphed a starved plan ${JSON.stringify(shown.intent)}\n${describeLog(result.events).join('\n')}`,
          ).toBe(true);
        played.push(action);
        logs.push(JSON.stringify(result.events));
        state = result.state;
        if (action.type === 'endTurn') seen.endTurns++;
      }
      if ((rivalOf(state)?.hp ?? 1) <= 0) seen.rivalDown++;

      // The same seed and the same actions give the same logs and the same end (determinism).
      let replay = createBattle(spec).state;
      played.forEach((a, i) => {
        const r = applyAction(replay, a);
        expect(JSON.stringify(r.events), `replay step ${i}`).toBe(logs[i]);
        replay = r.state;
      });
      expect(JSON.stringify(replay)).toBe(JSON.stringify(state));
    });
  }

  test('the walks exercised the Lamplighter: casts, wicks and openings happened', () => {
    console.info(`RV fuzz: ${RV_FUZZ_SEEDS} walks; ${JSON.stringify(seen)}`);
    expect(seen.rivalCasts).toBeGreaterThan(0);
    if (RV_FUZZ_SEEDS >= 40) {
      expect(seen.openings).toBeGreaterThan(0);
      expect(seen.wicks).toBeGreaterThan(0);
    }
  });
});
