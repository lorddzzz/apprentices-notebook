import { appendFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { type ApprenticeId, type DistrictId, encountersOf } from '$data';
import { FOUNDRY_TUNING } from '$data/districts/foundry';
import { type BattleState, newSave, type Profile, startTrip } from '$engine';
import { botValue } from '$engine/districts/api';
import { type BotOptions, botFight, botTrial } from '$engine/sim';
import * as flow from '../../src/app/flow';
import { board } from '../scenarios/harness';
import { baths, bridges } from './calibration/bath-bridges';
import { academy, foundry } from './calibration/foundry-cartographers';
import { type Adapter, PARTIES, profileFor } from './calibration/runner';

/**
 * CAL-B: bot policy comparison (CAL-3/CAL-4 preparation, HC-4). The same fresh fights (seed, page,
 * layout) are played under each policy; only the bot's options differ. `CAL_BOT=1` prints the
 * paired tables (`CAL_BOT_SEEDS`, default 6; `CAL_BOT_OUT=file` appends them instead of stdout);
 * the default run is a small deterministic smoke. These are policy-comparison measurements, never
 * district win rates (those wait for EN-14 and CAL-3/4).
 */

const full = process.env.CAL_BOT === '1';
const SEEDS = Number(process.env.CAL_BOT_SEEDS ?? (full ? 6 : 1));
const ROUNDS = 40;
const BUDGET = 600;

interface Policy {
  name: string;
  opts: BotOptions;
}
const POLICIES: readonly Policy[] = [
  { name: 'default', opts: {} },
  { name: 'cracks', opts: { cracks: true } },
  { name: 'district', opts: { gauge: true, cracks: true } },
];

interface Corpus {
  adapter: Adapter;
  /** Axes (span kind, bells hung) and rooms (0-based) played; every variant of each room. */
  axes: readonly string[];
  rooms: readonly number[];
}
/** The fixed corpus: first room and last room of each district, both span kinds, 0 and 4 bells. */
const CORPUS: readonly Corpus[] = [
  { adapter: bridges, axes: ['sound', 'crumbling'], rooms: [0, 4] },
  { adapter: foundry, axes: ['0', '4'], rooms: [0, 4] },
  { adapter: academy, axes: ['authored'], rooms: [0, 4] },
  { adapter: baths, axes: ['authored'], rooms: [0, 4] },
];

interface Fight {
  district: string;
  axis: string;
  room: number;
  layout: string;
  party: number;
  seed: number;
  state: BattleState;
  party_: readonly ApprenticeId[];
}

/** Every fresh fight of one corpus entry for the seeds, in a fixed order. */
function fightsOf(
  c: Corpus,
  party: number,
  seeds: number,
  loadout: (p: Profile) => Profile = (p) => p,
): Fight[] {
  const a = c.adapter;
  const who = PARTIES[party - 1];
  if (!who) throw new Error(`Unknown party ${party}`);
  const out: Fight[] = [];
  for (const axis of c.axes) {
    for (const room of c.rooms) {
      const variants = encountersOf(a.district as DistrictId)[room]?.variants ?? [];
      const pool = a.variants?.(room, axis) ?? variants.map((_, i) => i);
      for (const variant of pool) {
        for (let seed = 1; seed <= seeds; seed++) {
          const profile = loadout(a.profile?.(profileFor(who), axis) ?? profileFor(who));
          const trip0 = startTrip(profile, seed, a.district, {});
          const kit = trip0.kit ?? { state: null, choices: [], checkpoint: false, bonuses: [] };
          const trip = {
            ...trip0,
            encounter: room,
            kit: {
              ...kit,
              choices: [
                ...kit.choices.filter((x) => x.after !== room - 1),
                { after: room - 1, id: axis, pool: [variant] },
              ],
            },
          };
          const ready = a.prepare?.(profile, trip, axis, true) ?? trip;
          const state = flow.startBattle({ ...newSave(seed), profile, trip: ready }).state;
          out.push({
            district: a.name,
            axis,
            room,
            layout: `${variants[variant]?.name ?? ''}#${variant}`,
            party,
            seed,
            state,
            party_: ready.party,
          });
        }
      }
    }
  }
  return out;
}

/**
 * A legal Hold loadout (CAL-B): every member's page gains a second, separate spell (Bolt or Touch
 * into Hold) at x=4, with the ink to draw it. The starters' own pages and data are untouched; this
 * exists only in the comparison's profile, never as a free spell for the game.
 */
const HOLD_KEY = '4,0';
const HOLD_INK = 4;
function holdLoadout(p: Profile): Profile {
  const lattices = { ...p.lattices };
  for (const id of Object.keys(lattices) as ApprenticeId[]) {
    const base = lattices[id] ?? [];
    const source = id === 'runaway' ? 'touch' : 'bolt';
    lattices[id] = [
      ...base,
      { at: { x: 4, y: 0 }, rune: source, dir: 'down' },
      { at: { x: 4, y: 1 }, rune: 'hold' },
    ];
  }
  // The extra spell costs ink; banked ink is how a household gets the room (offerKinds `onBank`).
  return { ...p, lattices, ink: p.ink + HOLD_INK };
}

interface Outcome {
  holds: number;
  won: boolean;
  stalled: boolean;
  exhausted: boolean;
  rounds: number;
  actions: number;
}
function play(f: Fight, opts: BotOptions): Outcome {
  const r = botFight(f.state, ROUNDS, f.party_, { ...opts, budget: BUDGET });
  return {
    holds: r.actions.filter((a) => a.type === 'cast' && a.spell === HOLD_KEY).length,
    won: r.state.phase === 'won',
    stalled: r.state.phase === 'player' && !r.exhausted,
    exhausted: r.exhausted,
    rounds: r.state.round,
    actions: r.actions.length,
  };
}

interface Row {
  key: string;
  wins: number;
  n: number;
  stalls: number;
  exhausted: number;
  rounds: number;
  holds: number;
  stalled: string[];
}
/** One row per (district, axis, room, layout, party) for each policy, paired on the same fights. */
function compare(
  policies: readonly Policy[],
  corpus: readonly Corpus[],
  parties: readonly number[],
  seeds: number,
  loadout?: (p: Profile) => Profile,
): Map<string, Row[]> {
  const table = new Map<string, Row[]>(policies.map((p) => [p.name, []]));
  for (const c of corpus) {
    for (const party of parties) {
      const fights = fightsOf(c, party, seeds, loadout);
      for (const pol of policies) {
        const rows = table.get(pol.name) ?? [];
        for (const f of fights) {
          const key = `${f.district} ${f.axis} r${f.room + 1} ${f.layout} p${f.party}`;
          let row = rows.find((r) => r.key === key);
          if (!row) {
            row = { key, wins: 0, n: 0, stalls: 0, exhausted: 0, rounds: 0, holds: 0, stalled: [] };
            rows.push(row);
          }
          const o = play(f, pol.opts);
          row.n++;
          row.wins += Number(o.won);
          row.stalls += Number(o.stalled);
          row.exhausted += Number(o.exhausted);
          row.rounds += o.rounds;
          row.holds += o.holds;
          if (o.stalled || o.exhausted) row.stalled.push(`${f.seed}${o.exhausted ? 'x' : 's'}`);
        }
        table.set(pol.name, rows);
      }
    }
  }
  return table;
}

function markdown(table: Map<string, Row[]>): string {
  const names = [...table.keys()];
  const first = table.get(names[0] ?? '') ?? [];
  const lines = [
    `| fight | ${names.map((n) => `${n} wins | ${n} stalled seeds (s stall, x budget)`).join(' | ')} |`,
    `| --- | ${names.map(() => '--- | ---').join(' | ')} |`,
  ];
  for (const r of first) {
    const cells = names.map((n) => {
      const row = table.get(n)?.find((x) => x.key === r.key);
      return `${row?.wins}/${row?.n} | ${row?.stalled.join(' ') || '—'}`;
    });
    lines.push(`| ${r.key} | ${cells.join(' | ')} |`);
  }
  const totals = names.map((n) => {
    const rows = table.get(n) ?? [];
    const sum = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0);
    return `${sum((r) => r.wins)}/${sum((r) => r.n)} | ${sum((r) => r.stalls)} stalls, ${sum((r) => r.exhausted)} budget, ${sum((r) => r.holds)} Hold casts`;
  });
  lines.push(`| **total** | ${totals.join(' | ')} |`);
  return lines.join('\n');
}

const emit = (text: string) => {
  if (process.env.CAL_BOT_OUT) appendFileSync(process.env.CAL_BOT_OUT, `${text}\n`);
  else process.stdout.write(`${text}\n`);
};

/** The default run: each district's first room on its first axis, so the smoke stays quick. */
const SMOKE: readonly Corpus[] = CORPUS.map((c) => ({
  ...c,
  axes: c.axes.slice(0, 1),
  rooms: c.rooms.slice(0, 1),
}));

const HOLD_POLICIES: readonly Policy[] = [
  { name: 'no-hold', opts: { gauge: true, cracks: true } },
  { name: 'hold', opts: { gauge: true, cracks: true, hold: true } },
];

describe('CAL-B policy baseline', () => {
  test('CAL-B: default, cracks and district policies replay the same fights deterministically', () => {
    const corpus = full ? CORPUS : SMOKE;
    const run = () => markdown(compare(POLICIES, corpus, full ? [1, 2] : [2], SEEDS));
    const a = run();
    if (full) emit(`#### policy baseline, parties 1-2, seeds 1-${SEEDS}\n\n${a}\n`);
    else expect(a).toBe(run());
    expect(a).toContain('**total**');
  }, 36_000_000);
});

describe('CAL-B Hold policy', () => {
  test('CAL-B: the Hold loadout compiles a Hold spell for every member', () => {
    const [f] = fightsOf(SMOKE[0] as Corpus, 2, 1, holdLoadout);
    const members = f?.state.units.filter((u) => u.kind === 'member') ?? [];
    expect(members).toHaveLength(2);
    for (const m of members) {
      if (m.kind === 'member') expect(m.spells.map((x) => x.key)).toContain(HOLD_KEY);
    }
  });

  test('CAL-B: Hold policy is deterministic and respects the operation budget', () => {
    const fights = fightsOf(SMOKE[0] as Corpus, 2, 1, holdLoadout);
    expect(fights.length).toBeGreaterThan(0);
    for (const f of fights) {
      const opts = { gauge: true, cracks: true, hold: true } as const;
      const a = botFight(f.state, ROUNDS, f.party_, { ...opts, budget: BUDGET });
      const b = botFight(f.state, ROUNDS, f.party_, { ...opts, budget: BUDGET });
      expect(a.actions).toEqual(b.actions);
      expect(a.actions.length).toBeLessThanOrEqual(BUDGET);
      const small = botFight(f.state, ROUNDS, f.party_, { ...opts, budget: 5 });
      expect(small.actions).toHaveLength(5);
      expect(small.exhausted).toBe(true);
      expect(botTrial(f.state, 7, f.party_, opts).ops).toBeLessThanOrEqual(7);
    }
  });

  test('CAL-B: a Hold option leaves default actions unchanged', () => {
    // On starter pages there is no Hold spell, so the option changes nothing; with the loadout the
    // option off is the prior bot, action for action.
    for (const fight of fightsOf(SMOKE[0] as Corpus, 2, 1)) {
      const off = botFight(fight.state, ROUNDS, fight.party_, { budget: BUDGET });
      const on = botFight(fight.state, ROUNDS, fight.party_, { budget: BUDGET, hold: true });
      expect(on.actions).toEqual(off.actions);
    }
    for (const fight of fightsOf(SMOKE[0] as Corpus, 2, 1, holdLoadout)) {
      const prior = botFight(fight.state, ROUNDS, fight.party_, { gauge: true, budget: BUDGET });
      const off = botFight(fight.state, ROUNDS, fight.party_, {
        gauge: true,
        budget: BUDGET,
        hold: false,
      });
      expect(off.actions).toEqual(prior.actions);
    }
  });

  test('CAL-B: paired Hold results on the legal Hold loadout', () => {
    if (!full) return;
    const table = compare(HOLD_POLICIES, CORPUS, [1, 2], SEEDS, holdLoadout);
    emit(`#### Hold loadout, parties 1-2, seeds 1-${SEEDS}\n\n${markdown(table)}\n`);
  }, 36_000_000);
});

describe('CAL-B foundry pulse weights', () => {
  test('CAL-B: the pulse weights live in FOUNDRY_TUNING with the BF-20 values', () => {
    expect(FOUNDRY_TUNING.botPulse).toEqual({
      foe: 6,
      foeNearlyDown: 10,
      nearlyDownHp: 1,
      member: 15,
    });
  });

  test('CAL-B: the pulse term reads those weights (foe 6, nearly down +10, member -15)', () => {
    const w = FOUNDRY_TUNING.botPulse;
    // A foe beside a bell that rings, against the same foe off it, healthy and then at 1 HP.
    const at = (ascii: string, hp: number): BattleState => {
      const s = board(ascii);
      return { ...s, units: s.units.map((u) => (u.kind === 'enemy' ? { ...u, hp } : u)) };
    };
    const beside = 'D . . . .\n. . . . .\nr {bell:low} . . .';
    const away = 'D . . . .\n. . . . .\nr . . {bell:low} .';
    expect(botValue(at(beside, 3)) - botValue(at(away, 3))).toBe(w.foe);
    expect(botValue(at(beside, 1)) - botValue(at(away, 1))).toBe(w.foe + w.foeNearlyDown);
    const memberBeside = botValue(board('D {bell:low} . . .\n. . . . .\nr . . . .'));
    const memberAway = botValue(board('. . D . {bell:low}\n. . . . .\nr . . . .'));
    expect(memberBeside - memberAway).toBe(-w.member);
  });
});
