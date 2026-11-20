import { type ApprenticeId, ENEMIES, encountersOf } from '$data';
import { FOUNDRY_TUNING } from '$data/districts/foundry';
import { REGISTRAR_TUNING } from '$data/rivals/registrar';
import {
  applyAction,
  type BattleState,
  newSave,
  type SaveData,
  startTrip,
  type Trip,
} from '$engine';
import { CAST_EVENT_CAP } from '$engine/ctx';
import { GREAT_BELL_PIECE } from '$engine/districts/foundry/types';
import { type BotOptions, botFight, runTrip } from '$engine/sim';
import { variantFor } from '$engine/trip/place';
import * as flow from '../../../src/app/flow';
import { type Adapter, PARTIES, profileFor } from './runner';

export const foundry: Adapter = {
  name: 'foundry',
  district: 'foundry',
  axes: ['0', '1', '2', '3', '4'],
  tripAxis: (axis) => (axis === '0' ? 'earned' : null),
  prepare: (_p, t, axis, fresh) => (fresh && t.kit ? withBells(t, Number(axis)) : t),
};
export const academy: Adapter = { name: 'academy', district: 'cartographers', axes: ['authored'] };

/** A legal trip peal: the first `count` rooms' great bells rung, each with its own note (room + 1). */
export function withBells(t: Trip, count: number): Trip {
  if (!t.kit) throw new Error('Missing trip kit');
  return {
    ...t,
    kit: {
      ...t.kit,
      state: { rung: Array.from({ length: count }, (_, room) => ({ room, note: room + 1 })) },
    },
  };
}

// ── Policies (CAL-B): the default bot and the district-aware bot ──────────
export const POLICIES = {
  default: {} as BotOptions,
  aware: { gauge: true, cracks: true } as BotOptions,
} as const;
export type PolicyName = keyof typeof POLICIES;
export const POLICY_NAMES = Object.keys(POLICIES) as PolicyName[];

export interface Sample {
  seed: number;
  won: boolean;
  lost: boolean;
  stalled: boolean;
  exhausted: boolean;
  rounds: number;
  hpIn: number;
  hpOut: number;
  /** Foundry heart: allied great bells actually hung on the board at the start. */
  hung: number;
  /** Members who ended at 0 HP. */
  down: number;
}

/** Member HP still in the fight: an apprentice erased from the paper (`out`) counts as 0. */
const memberHp = (s: BattleState): number =>
  s.units.reduce((n, u) => n + (u.kind === 'member' && !u.out ? Math.max(0, u.hp) : 0), 0);
const hungBells = (s: BattleState): number =>
  s.tiles.filter((t) => {
    const p = t.piece;
    return p?.id === GREAT_BELL_PIECE && (p.data as { allied?: boolean } | undefined)?.allied;
  }).length;

export interface Config {
  seeds: number;
  rounds: number;
  budget: number;
  lite: boolean;
  parties: readonly number[];
}

/** Plays one fight; replays its applied actions so each cast/basic action's event count is checked. */
export function play(
  initial: BattleState,
  party: readonly ApprenticeId[],
  policy: PolicyName,
  c: Config,
  seed: number,
): { sample: Sample; result: ReturnType<typeof botFight> } {
  const result = botFight(initial, c.rounds, party, {
    ...POLICIES[policy],
    lite: c.lite,
    budget: c.budget,
  });
  let state = initial;
  for (const action of result.actions) {
    const next = applyAction(state, action);
    if (
      action.type !== 'endTurn' &&
      action.type !== 'move' &&
      next.events.length > CAST_EVENT_CAP + 3
    ) {
      throw new Error(`Event cap overrun: ${initial.title}, ${action.type}, ${next.events.length}`);
    }
    state = next.state;
  }
  const phase = result.state.phase;
  return {
    result,
    sample: {
      seed,
      won: phase === 'won',
      lost: phase === 'lost',
      stalled: phase === 'player',
      exhausted: result.exhausted,
      rounds: result.state.round,
      hpIn: memberHp(initial),
      hpOut: memberHp(result.state),
      hung: hungBells(initial),
      down: result.state.units.filter((u) => u.kind === 'member' && (u.hp <= 0 || u.out)).length,
    },
  };
}

export function begin(district: Adapter['district'], who: readonly ApprenticeId[], seed: number) {
  const profile = profileFor(who);
  return { ...newSave(seed), profile, trip: startTrip(profile, seed, district, {}) };
}

/** A fresh save standing at `room` on layout `variant` (the CAL-0 construction). */
export function atRoom(
  district: Adapter['district'],
  who: readonly ApprenticeId[],
  seed: number,
  room: number,
  variant: number,
  edit?: (t: Trip) => Trip,
): SaveData {
  const save = begin(district, who, seed);
  if (!save.trip) throw new Error('Missing trip');
  const kit = save.trip.kit ?? { state: null, choices: [], checkpoint: false, bonuses: [] };
  let trip: Trip = {
    ...save.trip,
    encounter: room,
    kit: {
      ...kit,
      choices: [
        ...kit.choices.filter((x) => x.after !== room - 1),
        { after: room - 1, id: 'authored', pool: [variant] },
      ],
    },
  };
  if (edit) trip = edit(trip);
  return { ...save, trip };
}

export function party(size: number): readonly ApprenticeId[] {
  const who = PARTIES[size - 1];
  if (!who) throw new Error(`Unknown party ${size}`);
  return who;
}

// ── Statistics ──────────────────────────────────────────
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}` : '—');
const mean = (xs: readonly number[]) =>
  xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '—';
const median = (xs: readonly number[]) => {
  if (!xs.length) return '—';
  const s = [...xs].sort((a, b) => a - b);
  return String(s[Math.floor(s.length / 2)]);
};
export const stats = (xs: readonly Sample[]) => {
  const wins = xs.filter((x) => x.won);
  return {
    n: xs.length,
    wins: wins.length,
    pct: pct(wins.length, xs.length),
    losses: xs.filter((x) => x.lost).length,
    stalls: xs.filter((x) => x.stalled).length,
    stops: xs.filter((x) => x.exhausted).length,
    rounds: mean(xs.map((x) => x.rounds)),
    winRounds: median(wins.map((x) => x.rounds)),
    hpLeft: pct(
      xs.reduce((n, x) => n + x.hpOut, 0),
      xs.reduce((n, x) => n + x.hpIn, 0),
    ),
    winHpLeft: pct(
      wins.reduce((n, x) => n + x.hpOut, 0),
      wins.reduce((n, x) => n + x.hpIn, 0),
    ),
    down: mean(xs.map((x) => x.down)),
  };
};
export const STAT_HEADER =
  'wins/n | win % | lost | stalled | budget stops | mean rounds | median win round | HP left % (all) | HP left % (wins) | mean members down';
export const statCells = (xs: readonly Sample[]) => {
  const s = stats(xs);
  return `${s.wins}/${s.n} | ${s.pct} | ${s.losses} | ${s.stalls} | ${s.stops} | ${s.rounds} | ${s.winRounds} | ${s.hpLeft} | ${s.winHpLeft} | ${s.down}`;
};

/** Paired outcome of the same seeds under two conditions: [both won, only a, only b, neither]. */
export function paired(a: readonly Sample[], b: readonly Sample[]) {
  const bySeed = new Map(b.map((x) => [x.seed, x]));
  const out = { both: 0, onlyA: 0, onlyB: 0, neither: 0, n: 0 };
  for (const x of a) {
    const y = bySeed.get(x.seed);
    if (!y) continue;
    out.n++;
    if (x.won && y.won) out.both++;
    else if (x.won) out.onlyA++;
    else if (y.won) out.onlyB++;
    else out.neither++;
  }
  return out;
}

export const layoutName = (district: Adapter['district'], room: number, variant: number) =>
  encountersOf(district)[room]?.variants[variant]?.name ?? String(variant);
export const layoutCount = (district: Adapter['district'], room: number) =>
  encountersOf(district)[room]?.variants.length ?? 0;

/** Real worn trips: every room's fight is recorded by depth and layout; returns trip ends. */
export function wornTrips(
  district: Adapter['district'],
  size: number,
  policy: PolicyName,
  c: Config,
  onFight?: (t: Trip, sample: Sample, state: BattleState) => void,
) {
  const depth = encountersOf(district).length;
  const worn = Array.from({ length: depth }, (_, room) =>
    Array.from({ length: layoutCount(district, room) }, (): Sample[] => []),
  );
  const ends: Record<string, number> = {};
  for (let seed = 1; seed <= c.seeds; seed++) {
    const { end } = runTrip(
      begin(district, party(size), seed),
      { ...flow },
      {
        pick: () => 0,
        fight: (save, trip) => {
          const initial = flow.startBattle(save).state;
          const { sample, result } = play(initial, party(size), policy, c, seed);
          const cell = worn[trip.encounter]?.[variantFor(trip, trip.encounter)];
          if (!cell) throw new Error('Unexpected trip depth');
          cell.push(sample);
          onFight?.(trip, sample, initial);
          return result;
        },
      },
    );
    ends[end] = (ends[end] ?? 0) + 1;
  }
  return { worn, ends };
}

// ── Candidates (CAL-4 task 2): proposals tried at run time, never applied ──────────
type Writable<T> = { -readonly [K in keyof T]: T[K] extends number ? number : T[K] };
export interface Candidate {
  /** The source fields it stands for, as proposed rows name them. */
  fields: string;
  /** Applies the numbers in memory; returns the restore. */
  apply(): () => void;
}
const tryHp = (id: 'carillonneur' | 'registrar', hp: number) => {
  const shell: Writable<(typeof ENEMIES)[typeof id]> = ENEMIES[id];
  const was = shell.hp;
  shell.hp = hp;
  return () => {
    shell.hp = was;
  };
};
const compose =
  (...restores: (() => void)[]) =>
  () => {
    for (const restore of restores.reverse()) restore();
  };
/**
 * The shell's hp is what a fight spawns (the rival def's own copy is not read at spawn), so the
 * candidate changes the shell and, for the registrar, the circle counts the trick reads each round.
 */
export const CANDIDATES: Readonly<Record<string, Candidate>> = {
  F1: {
    fields: 'FOUNDRY_TUNING.carillonneur.hp 14 -> 24 (and rivals/carillonneur.ts hp)',
    apply: () => tryHp('carillonneur', 24),
  },
  F2: {
    fields: 'FOUNDRY_TUNING.carillonneur.hp 14 -> 36 (and rivals/carillonneur.ts hp)',
    apply: () => tryHp('carillonneur', 36),
  },
  F3: {
    fields:
      'FOUNDRY_TUNING.carillonneur.hp 14 -> 36 and alliedPulseDamage 2 -> 3 (hung bells hit harder)',
    apply: () => {
      const t: Writable<typeof FOUNDRY_TUNING> = FOUNDRY_TUNING;
      const was = t.alliedPulseDamage;
      t.alliedPulseDamage = 3;
      return compose(tryHp('carillonneur', 36), () => {
        t.alliedPulseDamage = was;
      });
    },
  },
  F4: {
    fields: 'FOUNDRY_TUNING.carillonneur.hp 14 -> 60 (and rivals/carillonneur.ts hp)',
    apply: () => tryHp('carillonneur', 60),
  },
  F5: {
    fields: 'FOUNDRY_TUNING.carillonneur.hp 14 -> 90 (and rivals/carillonneur.ts hp)',
    apply: () => tryHp('carillonneur', 90),
  },
  /** A policy probe, not a game number: CAL-B asked for the pulse term's member weight at 0 on the yoke. */
  P0: {
    fields: 'FOUNDRY_TUNING.botPulse.member 15 -> 0 (bot policy weight only)',
    apply: () => {
      const w: Writable<typeof FOUNDRY_TUNING.botPulse> = FOUNDRY_TUNING.botPulse;
      const was = w.member;
      w.member = 0;
      return () => {
        w.member = was;
      };
    },
  },
  A1: {
    fields: 'REGISTRAR_TUNING.hp 10 -> 20 (and rivals/registrar.ts hp)',
    apply: () => tryHp('registrar', 20),
  },
  A2: {
    fields: 'REGISTRAR_TUNING.hp 10 -> 30 (and rivals/registrar.ts hp)',
    apply: () => tryHp('registrar', 30),
  },
  A4: {
    fields: 'REGISTRAR_TUNING.hp 10 -> 40 (and rivals/registrar.ts hp)',
    apply: () => tryHp('registrar', 40),
  },
  A5: {
    fields: 'REGISTRAR_TUNING.hp 10 -> 50 (and rivals/registrar.ts hp)',
    apply: () => tryHp('registrar', 50),
  },
  A3: {
    fields: 'REGISTRAR_TUNING.hp 10 -> 20, circles 1 -> 2, circlesBelowHalf 2 -> 3',
    apply: () => {
      const t: Writable<typeof REGISTRAR_TUNING> = REGISTRAR_TUNING;
      const was = { c: t.circles, b: t.circlesBelowHalf };
      t.circles = 2;
      t.circlesBelowHalf = 3;
      return compose(tryHp('registrar', 20), () => {
        t.circles = was.c;
        t.circlesBelowHalf = was.b;
      });
    },
  },
};

/** CAL4_CAND names one candidate; no value is the committed numbers. */
export function candidateFromEnv(): { name: string; restore: () => void } {
  const name = process.env.CAL4_CAND ?? 'committed';
  if (name === 'committed') return { name, restore: () => {} };
  const c = CANDIDATES[name];
  if (!c) throw new Error(`Unknown CAL4_CAND ${name}`);
  return { name, restore: c.apply() };
}
