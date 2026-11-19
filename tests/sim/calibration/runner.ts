import { type ApprenticeId, type DistrictId, encountersOf, RUNE_IDS } from '$data';
import {
  applyAction,
  type BattleState,
  joinHousehold,
  newProfile,
  newSave,
  type Profile,
  type SaveData,
  type SlotIndex,
  setSlot,
  startTrip,
  type Trip,
} from '$engine';
import { CAST_EVENT_CAP } from '$engine/ctx';
import { chooseAt } from '$engine/districts/api';
import { botFight, runTrip } from '$engine/sim';
import { variantFor } from '$engine/trip/place';
import * as flow from '../../../src/app/flow';

export interface Adapter {
  name: string;
  district: DistrictId;
  axes: readonly string[];
  profile?(p: Profile, axis: string): Profile;
  prepare?(p: Profile, t: Trip, axis: string, fresh: boolean): Trip;
  depth?(axis: string): number;
  variants?(room: number, axis: string): readonly number[];
  tripAxis?(axis: string): string | null;
}
export interface Options {
  full: boolean;
  seeds: number;
  rounds: number;
  budget: number;
  parties?: readonly number[];
  rooms?: readonly number[];
}
export const PARTIES: readonly (readonly ApprenticeId[])[] = [
  ['draughtsman'],
  ['draughtsman', 'stoker'],
  ['draughtsman', 'stoker', 'runaway'],
];
export function profileFor(who: readonly ApprenticeId[]): Profile {
  const base = newProfile();
  let p: Profile = {
    ...base,
    known: [...RUNE_IDS],
    city: {
      ...base.city,
      heard: ['seam', 'canals', 'inkQuarter', 'bathhouses', 'bridges', 'foundry', 'cartographers'],
      open: ['seam', 'canals', 'inkQuarter', 'bathhouses', 'bridges', 'foundry', 'cartographers'],
    },
  };
  for (const id of who) p = joinHousehold(p, id);
  for (const slot of [0, 1, 2] as SlotIndex[]) p = setSlot(p, slot, null);
  who.forEach((id, i) => {
    p = setSlot(p, i as SlotIndex, id);
  });
  return p;
}
export function countEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error(`${name} must be a positive integer`);
  return n;
}
export function options(full: boolean, seedVar = 'CAL_SEEDS'): Options {
  return {
    full,
    seeds: countEnv(seedVar, full ? 50 : 1),
    rounds: countEnv('CAL_ROUNDS', full ? 40 : 4),
    budget: countEnv('CAL_BUDGET', full ? 600 : 32),
  };
}
interface Cell {
  reached: number;
  wins: number;
  stalls: number;
  exhausted: number;
  rounds: number;
  hp: number;
  charges: number;
  bells: number;
}
const empty = (): Cell => ({
  reached: 0,
  wins: 0,
  stalls: 0,
  exhausted: 0,
  rounds: 0,
  hp: 0,
  charges: 0,
  bells: 0,
});

/** Replay applied actions to check each cast/basic action, never the whole fight's accumulated log. */
function fight(initial: BattleState, t: Trip, o: Options) {
  const result = botFight(initial, o.rounds, t.party, {
    gauge: true,
    cracks: true,
    lite: !o.full,
    budget: o.budget,
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
  return result;
}
function begin(a: Adapter, axis: string, who: readonly ApprenticeId[], seed: number): SaveData {
  const profile = a.profile?.(profileFor(who), axis) ?? profileFor(who);
  return {
    ...newSave(seed),
    profile,
    trip: startTrip(profile, seed, a.district, a.district === 'inkedPage' ? { page: 0 } : {}),
  };
}
function prepare(a: Adapter, save: SaveData, axis: string, fresh: boolean): SaveData {
  if (!save.trip) throw new Error('Missing calibration trip');
  return { ...save, trip: a.prepare?.(save.profile, save.trip, axis, fresh) ?? save.trip };
}
function record(c: Cell, t: Trip, result: ReturnType<typeof fight>) {
  c.reached++;
  c.wins += Number(result.state.phase === 'won');
  c.stalls += Number(result.state.phase === 'player');
  c.exhausted += Number(result.exhausted);
  c.rounds += result.state.round;
  c.hp += Object.values(t.hp).reduce((n, hp) => n + (hp ?? 0), 0);
  c.charges += Object.values(t.charges).reduce(
    (n, charges) => n + Object.values(charges ?? {}).reduce((s, v) => s + v, 0),
    0,
  );
  const state = t.kit?.state;
  if (
    state &&
    typeof state === 'object' &&
    !Array.isArray(state) &&
    'rung' in state &&
    Array.isArray(state.rung)
  )
    c.bells += state.rung.length;
}
const mean = (n: number, d: number) => (d ? (n / d).toFixed(1) : '—');

/** One row per fresh layout, then real trip reach by depth (unreached depths stay visible). */
export function table(a: Adapter, o: Options): string {
  const lines = [
    `### ${a.name}`,
    '',
    `Seeds 1–${o.seeds}; rounds ${o.rounds}; applied-action budget ${o.budget}; starter lattices; greedy gauge+cracks; lite=${!o.full}; first loot, onward, doorway unchanged; trip guard 60.`,
    '',
    '| party | axis | state | depth | layout | wins/reached | win % | reached/attempted | stalls | budget stops | mean rounds | entry HP | entry charges | entry bells |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const notes: string[] = [];
  const row = (
    party: number,
    axis: string,
    mode: string,
    depth: number,
    layout: string,
    c: Cell,
  ) => {
    lines.push(
      `| ${party} | ${axis} | ${mode} | ${depth + 1} | ${layout.replaceAll('|', '/')} | ${c.wins}/${c.reached} | ${mean(100 * c.wins, c.reached)} | ${c.reached}/${o.seeds} | ${c.stalls} | ${c.exhausted} | ${mean(c.rounds, c.reached)} | ${mean(c.hp, c.reached)} | ${mean(c.charges, c.reached)} | ${mean(c.bells, c.reached)} |`,
    );
  };
  for (const party of o.parties ?? (o.full ? [1, 2, 3] : [2])) {
    const who = PARTIES[party - 1];
    if (!who) throw new Error(`Unknown party ${party}`);
    for (const axis of o.full ? a.axes : a.axes.slice(0, 1)) {
      const depth = a.depth?.(axis) ?? encountersOf(a.district).length;
      for (let room = 0; room < (o.full ? depth : 1); room++) {
        if (o.rooms && !o.rooms.includes(room)) continue;
        const variants =
          a.district === 'inkedPage'
            ? [{ name: 'generated seed layout' }]
            : (encountersOf(a.district)[room]?.variants ?? []);
        const pool = a.variants?.(room, axis) ?? variants.map((_, i) => i);
        for (const variant of o.full ? pool : pool.slice(0, 1)) {
          const c = empty();
          for (let seed = 1; seed <= o.seeds; seed++) {
            let save = begin(a, axis, who, seed);
            if (!save.trip) throw new Error('Missing trip');
            const t = { ...save.trip, encounter: room };
            if (a.district !== 'inkedPage') {
              const kit = t.kit ?? { state: null, choices: [], checkpoint: false, bonuses: [] };
              t.kit = {
                ...kit,
                choices: [
                  ...kit.choices.filter((x) => x.after !== room - 1),
                  { after: room - 1, id: axis, pool: [variant] },
                ],
              };
            }
            save = prepare(a, { ...save, trip: t }, axis, true);
            if (!save.trip) throw new Error('Missing prepared trip');
            record(c, save.trip, fight(flow.startBattle(save).state, save.trip, o));
          }
          row(party, axis, 'fresh', room, variants[variant]?.name ?? String(variant), c);
        }
      }
      const tripAxis = a.tripAxis ? a.tripAxis(axis) : axis;
      if (tripAxis === null) continue;
      const worn = Array.from({ length: depth }, (_, room) => {
        const count =
          a.district === 'inkedPage' ? 1 : (encountersOf(a.district)[room]?.variants.length ?? 0);
        return Array.from({ length: count }, empty);
      });
      const ends: Record<string, number> = {};
      for (let seed = 1; seed <= o.seeds; seed++) {
        let active: SaveData | undefined;
        const result = runTrip(
          begin(a, axis, who, seed),
          {
            ...flow,
            endBattle: (save, state, events) => flow.endBattle(active ?? save, state, events),
            pushOnward: (save) =>
              a.district === 'bridges' && save.trip
                ? { ...save, trip: chooseAt(save.trip, axis) }
                : flow.pushOnward(save),
          },
          {
            pick: () => 0,
            fight: (save) => {
              const ready = prepare(a, save, axis, false);
              active = ready;
              if (!ready.trip) throw new Error('Missing worn trip');
              const result = fight(flow.startBattle(ready).state, ready.trip, o);
              const variant =
                a.district === 'inkedPage' ? 0 : variantFor(ready.trip, ready.trip.encounter);
              const c = worn[ready.trip.encounter]?.[variant];
              if (!c) throw new Error('Unexpected trip depth');
              record(c, ready.trip, result);
              return result;
            },
          },
        );
        ends[result.end] = (ends[result.end] ?? 0) + 1;
      }
      worn.forEach((cells, room) => {
        cells.forEach((c, variant) => {
          const layout =
            a.district === 'inkedPage'
              ? 'generated seed layout'
              : (encountersOf(a.district)[room]?.variants[variant]?.name ?? String(variant));
          row(party, tripAxis, 'trip-worn', room, `${layout}${c.reached ? '' : ' UNREACHED'}`, c);
        });
      });
      notes.push(`Party ${party}, ${tripAxis}: trip ends ${JSON.stringify(ends)} / ${o.seeds}.`);
    }
  }
  return [...lines, '', ...notes].join('\n');
}
