import { encountersOf } from '$data';
import { layRival } from '$data/districts/canals';
import { MARGINALIA } from '$data/districts/seam';
import {
  type BattleState,
  newSave,
  type Profile,
  type SaveData,
  startTrip,
  type Trip,
} from '$engine';
import { HAND_EVENT } from '$engine/districts/seam';
import { botFight, runTrip } from '$engine/sim';
import { variantFor } from '$engine/trip/place';
import * as flow from '../../../src/app/flow';
import { type Adapter, type Options, PARTIES, profileFor } from './runner';

export const seam: Adapter = { name: 'Seam', district: 'seam', axes: ['authored'] };
export const canals: Adapter = { name: 'canals', district: 'canals', axes: ['authored'] };

const SEAM_HEART = 3;
const CANAL_RIVAL = 3;

interface Sample {
  phase: BattleState['phase'];
  exhausted: boolean;
  round: number;
  entryHp: number;
  exitHp: number;
  entryCharges: number;
  exitCharges: number;
  moored: boolean | undefined;
  hands: number;
  firstSpark: number | undefined;
}

function battleTotals(state: BattleState) {
  let hp = 0;
  let charges = 0;
  for (const unit of state.units) {
    if (unit.kind !== 'member') continue;
    hp += unit.hp;
    charges += Object.values(unit.charges).reduce((sum, left) => sum + left, 0);
  }
  return { hp, charges };
}

// The bot's log starts after battle setup. A round event advances the clock for later hands.
function sample(initial: BattleState, fight: ReturnType<typeof botFight>): Sample {
  const entry = battleTotals(initial);
  const exit = battleTotals(fight.state);
  let round = initial.round;
  let hands = 0;
  let firstSpark: number | undefined;
  let moored = initial.units.some((unit) => unit.def === 'barge') ? false : undefined;
  for (const event of fight.events) {
    if (event.type === 'round') round = event.round;
    if (event.type === 'moored' && event.unit.id === 'barge-1') moored = true;
    if (event.type !== HAND_EVENT) continue;
    hands++;
    const data = event.data;
    if (data && typeof data === 'object' && 'kind' in data && data.kind === 'spark') {
      firstSpark ??= round;
    }
  }
  return {
    phase: fight.state.phase,
    exhausted: fight.exhausted,
    round: fight.state.round,
    entryHp: entry.hp,
    exitHp: exit.hp,
    entryCharges: entry.charges,
    exitCharges: exit.charges,
    moored,
    hands,
    firstSpark,
  };
}

function mean(values: readonly number[]): string {
  return values.length
    ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
    : '—';
}

function cell(room: number, variant: number, samples: readonly Sample[], seeds: number) {
  const wins = samples.filter((sample) => sample.phase === 'won');
  const stalled = samples.filter((sample) => sample.phase === 'player').length;
  const exhausted = samples.filter((sample) => sample.exhausted).length;
  const sparks = samples.flatMap((sample) => sample.firstSpark ?? []);
  const rounds = samples.map((sample) => sample.round).sort((a, b) => a - b);
  const middle = Math.floor(rounds.length / 2);
  const median = mean(rounds.slice(Math.floor((rounds.length - 1) / 2), middle + 1));
  const moored = wins.filter((sample) => sample.moored).length;
  const layout = 'ABC'[variant];
  return [
    room + 1,
    layout,
    `${samples.length}/${seeds}`,
    `${wins.length}/${samples.length}`,
    mean(samples.map((s) => (s.phase === 'won' ? 100 : 0))),
    stalled,
    exhausted,
    median,
    `${mean(samples.map((s) => s.entryHp))} → ${mean(samples.map((s) => s.exitHp))}`,
    `${mean(samples.map((s) => s.entryCharges))} → ${mean(samples.map((s) => s.exitCharges))}`,
    samples.some((sample) => sample.moored !== undefined) ? `${moored}/${wins.length}` : '—',
    mean(samples.map((s) => s.hands)),
    `${sparks.length}/${samples.length} @ ${mean(sparks)}`,
  ].join(' | ');
}

// Use the registered room setup for both variants of room 4, including trip-worn fights.
function withStandIn<T>(measure: () => T): T {
  const variants = encountersOf('canals')[CANAL_RIVAL]?.variants;
  if (!variants) throw new Error('Missing canal room 4');
  const boards = variants.map((variant) => ({ variant, layout: variant.layout }));
  try {
    for (const { variant, layout } of boards) variant.layout = layRival(layout, false);
    return measure();
  } finally {
    for (const { variant, layout } of boards) variant.layout = layout;
  }
}

export const SWEEPS = [
  'seam-16',
  'seam-72',
  'canals-live',
  'canals-stand-in',
  'canals-legacy',
] as const;
type Sweep = (typeof SWEEPS)[number];

function rowsFor(sweep: Sweep, config: Options): string {
  const seam = sweep.startsWith('seam-');
  const district = seam ? 'seam' : 'canals';
  const encounters = encountersOf(district);
  const legacy = sweep === 'canals-legacy';
  const freshRooms = seam
    ? [SEAM_HEART]
    : sweep === 'canals-live'
      ? [1, CANAL_RIVAL]
      : [CANAL_RIVAL];
  const lines = [
    `### ${sweep}`,
    '',
    `Seeds 1–${config.seeds}, ${config.rounds} rounds, ${legacy ? 'CN-13 default policy, no action budget' : `gauge+cracks, ${config.budget} action budget`}. First loot, onward, unchanged doorway.`,
    '',
    '| party | state | depth | layout | reached/attempted | wins/reached | win % | stalls | budget stops | median round | mean HP in → out | mean charges in → out | crate moored/wins | mean hands | Spark fights/reached @ mean first round |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const ends: string[] = [];
  for (const size of config.parties ?? (legacy ? [2] : [1, 2, 3])) {
    const party = PARTIES[size - 1];
    if (!party) throw new Error(`Unknown party size ${size}`);
    const base = profileFor(party);
    const profile: Profile = legacy
      ? {
          ...base,
          city: { ...base.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] },
        }
      : base;
    const start = (seed: number) => ({
      ...newSave(seed),
      profile,
      trip: startTrip(profile, seed, district),
    });
    const play = (save: SaveData, trip: Trip) => {
      const initial = flow.startBattle(save).state;
      if (district === 'seam' && trip.encounter === SEAM_HEART) {
        const hp = sweep === 'seam-72' ? 72 : 16;
        if (!initial.units.some((unit) => unit.def === 'marginalia' && unit.hp === hp))
          throw new Error(`Expected Marginalia at ${hp} HP`);
      }
      if (trip.encounter === CANAL_RIVAL && district === 'canals') {
        const hasRival = initial.units.some((unit) => unit.def === 'lamplighter');
        if (hasRival === (sweep === 'canals-stand-in'))
          throw new Error(`Unexpected canal room 4 rival for ${sweep}`);
      }
      const result = botFight(
        initial,
        config.rounds,
        party,
        legacy ? {} : { gauge: true, cracks: true, budget: config.budget },
      );
      return { result, sample: sample(initial, result) };
    };

    if (!legacy) {
      for (const room of freshRooms) {
        encounters[room]?.variants.forEach((_, variant) => {
          const samples: Sample[] = [];
          for (let seed = 1; seed <= config.seeds; seed++) {
            const save = start(seed);
            const kit = save.trip.kit ?? {
              state: null,
              choices: [],
              checkpoint: false,
              bonuses: [],
            };
            const trip = {
              ...save.trip,
              encounter: room,
              kit: { ...kit, choices: [{ after: room - 1, id: 'authored', pool: [variant] }] },
            };
            samples.push(play({ ...save, trip }, trip).sample);
          }
          lines.push(`| ${size} | fresh | ${cell(room, variant, samples, config.seeds)} |`);
        });
      }
    }

    const worn = encounters.map((room) => room.variants.map((): Sample[] => []));
    const outcomes: Record<string, number> = {};
    for (let seed = 1; seed <= config.seeds; seed++) {
      const { end } = runTrip(start(seed), flow, {
        pick: () => 0,
        fight: (save, trip) => {
          const variant = variantFor(trip, trip.encounter);
          const samples = worn[trip.encounter]?.[variant];
          if (!samples) throw new Error('Unexpected trip encounter');
          const played = play(save, trip);
          samples.push(played.sample);
          return played.result;
        },
      });
      outcomes[end] = (outcomes[end] ?? 0) + 1;
    }
    worn.forEach((variants, room) => {
      variants.forEach((samples, variant) => {
        lines.push(`| ${size} | trip-worn | ${cell(room, variant, samples, config.seeds)} |`);
      });
    });
    ends.push(`Party ${size} trip ends ${JSON.stringify(outcomes)} / ${config.seeds}.`);
  }
  return [...lines, '', ...ends].join('\n');
}

export function measure(sweep: Sweep, config: Options): string {
  if (sweep === 'canals-stand-in') return withStandIn(() => rowsFor(sweep, config));
  if (sweep !== 'seam-16' && sweep !== 'seam-72') return rowsFor(sweep, config);
  const hp = MARGINALIA.hp;
  try {
    MARGINALIA.hp = sweep === 'seam-72' ? 72 : 16;
    return rowsFor(sweep, config);
  } finally {
    MARGINALIA.hp = hp;
  }
}
