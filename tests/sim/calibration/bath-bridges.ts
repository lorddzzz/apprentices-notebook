import { encountersOf } from '$data';
import { PLUNGE_KIND } from '$data/districts/bathhouses';
import type { HeatLevel } from '$data/districts/bathhouses/types';
import { spanVariantPool } from '$data/districts/bridges';
import { SPAN_KINDS } from '$data/districts/bridges/types';
import { type BattleState, newSave, type SaveData, startTrip } from '$engine';
import { chooseAt } from '$engine/districts/api';
import { boilOverState } from '$engine/districts/bathhouses/boilOver';
import type { BoilOverEvent } from '$engine/districts/bathhouses/types';
import { botFight, runTrip } from '$engine/sim';
import { variantFor } from '$engine/trip/place';
import * as flow from '../../../src/app/flow';
import { type Adapter, PARTIES, profileFor } from './runner';

export const baths: Adapter = { name: 'baths', district: 'bathhouses', axes: ['authored'] };
export const bridges: Adapter = {
  name: 'bridges',
  district: 'bridges',
  axes: ['sound', 'crumbling'],
  variants: (room, axis) =>
    room === 0
      ? axis === 'sound'
        ? (encountersOf('bridges')[0]?.variants.map((_, index) => index) ?? [])
        : []
      : spanVariantPool(room, axis === 'sound' ? 'sound' : 'crumbling'),
};

type District = 'bathhouses' | 'bridges' | 'canals';
type Policy = 'aware' | 'blind';
type Mode = 'fresh' | 'fresh cooled' | 'trip-worn' | 'trip-worn cooled';

export interface Sample {
  outcome: 'win' | 'loss' | 'stall' | 'budget';
  heat: HeatLevel | undefined;
  boils: number;
  memberHits: number;
  firstBoil: number | undefined;
  botFirstBoil: number | null;
  falls: number;
  entryHp: number;
  entryCharges: number;
  rounds: number;
  hpLeft: number;
  bossHp: number | undefined;
}

interface Row {
  party: number;
  policy: Policy;
  axis: string;
  mode: Mode;
  depth: number;
  variant: number;
  layout: string;
  samples: Sample[];
}

interface Config {
  seeds: number;
  firstSeed?: number;
  parties?: readonly number[];
  policies?: readonly Policy[];
  freshOnly?: boolean;
  /** Keep only these 1-based depths (tuning runs). */
  depths?: readonly number[];
  traceFight?: (line: string) => void;
}

const POLICIES: readonly Policy[] = ['aware', 'blind'];
const ROUNDS = 40;
const BUDGET = 600;

function measure(state: BattleState, result: ReturnType<typeof botFight>): Sample {
  let round = state.round;
  let firstBoil: number | undefined;
  let boils = 0;
  let memberHits = 0;
  let falls = 0;
  const members = state.units.filter((u) => u.kind === 'member');
  for (const event of result.events) {
    if (event.type === 'round') round = event.round;
    if (event.type === 'bathhouses:boilOver') {
      firstBoil ??= round;
      boils++;
      const { units } = (event as BoilOverEvent).data;
      memberHits += units.filter((id) => members.some((m) => m.id === id)).length;
    }
    if (event.type === 'outOfRoom' && event.cause === 'fell' && event.unit.member) falls++;
  }
  const outcome =
    result.state.phase === 'won'
      ? 'win'
      : result.state.phase === 'lost'
        ? 'loss'
        : result.exhausted
          ? 'budget'
          : 'stall';
  return {
    outcome,
    heat: boilOverState(state)?.heat,
    boils,
    memberHits,
    firstBoil,
    botFirstBoil: result.firstBoil,
    falls,
    entryHp: members.reduce((hp, u) => hp + u.hp, 0),
    entryCharges: members.flatMap((u) => Object.values(u.charges)).reduce((sum, n) => sum + n, 0),
    rounds: result.state.round,
    hpLeft: result.state.units
      .filter((u) => u.kind === 'member' && !u.out)
      .reduce((hp, u) => hp + u.hp, 0),
    bossHp: state.units.find((u) => u.def === 'bathSteward' || u.def === 'chiefWarden')?.hp,
  };
}

function sweep(district: District, config: Config): Row[] {
  const rows: Row[] = [];
  const rooms = encountersOf(district);
  const policies = config.policies ?? POLICIES;
  const axes = district === 'bridges' ? SPAN_KINDS : ['authored'];
  const firstSeed = config.firstSeed ?? 1;
  const nextSeed = firstSeed + config.seeds;
  for (const party of config.parties ?? [1, 2, 3]) {
    const who = PARTIES[party - 1];
    if (!who) throw new Error(`Unknown party size ${party}`);
    const profile = profileFor(who);
    const start = (seed: number) => ({
      ...newSave(seed),
      profile,
      trip: startTrip(profile, seed, district),
    });
    for (const policy of policies) {
      const aware = policy === 'aware';
      const play = (save: SaveData, row: Row, seed: number) => {
        const state = flow.startBattle(save).state;
        if (district === 'bathhouses' && !boilOverState(state)) {
          throw new Error(`Missing authored gauge: ${state.title}`);
        }
        const trace = config.traceFight;
        const label = `${row.mode} ${row.axis} depth ${row.depth} layout ${row.variant + 1} seed ${seed}`;
        trace?.(`start ${label}`);
        const started = performance.now();
        const result = botFight(state, ROUNDS, who, {
          gauge: aware,
          cracks: aware,
          hold: false,
          budget: BUDGET,
        });
        const elapsed = performance.now() - started;
        const sample = measure(state, result);
        row.samples.push(sample);
        trace?.(
          `end ${label}: ${elapsed.toFixed(0)} ms, ${sample.outcome}, round ${sample.rounds}, ${result.actions.length} actions`,
        );
        if (trace && elapsed > 300_000) {
          throw new Error(
            `Fight exceeded five minutes: ${label}, round ${sample.rounds}, ${result.actions.length} actions, units ${JSON.stringify(result.state.units)}`,
          );
        }
        return result;
      };
      for (const axis of axes) {
        // Every bridge trip opens before its first span choice. Reuse that same fresh draw.
        const freshOpening = axis === axes[0];
        const makeRows = (mode: Mode) =>
          rooms.flatMap((room, depth) => {
            if (mode === 'fresh cooled' && (depth < 1 || depth > 3)) return [];
            if (config.depths && !config.depths.includes(depth + 1)) return [];
            const pool =
              district === 'bridges' && depth > 0
                ? spanVariantPool(depth, axis === 'sound' ? 'sound' : 'crumbling')
                : room.variants.map((_, index) => index);
            return pool.map(
              (variant): Row => ({
                party,
                policy,
                axis: district === 'bridges' && depth === 0 && mode === 'fresh' ? 'opening' : axis,
                mode,
                depth: depth + 1,
                variant,
                layout: room.variants[variant]?.name || room.title,
                samples: [],
              }),
            );
          });
        const canCool = district === 'bathhouses';
        const fresh = [...makeRows('fresh'), ...(canCool ? makeRows('fresh cooled') : [])].filter(
          (row) => row.axis !== 'opening' || freshOpening,
        );
        for (const row of fresh) {
          for (let seed = firstSeed; seed < nextSeed; seed++) {
            const save = start(seed);
            const { trip } = save;
            const depth = row.depth - 1;
            const kit = trip.kit ?? { state: null, choices: [], checkpoint: false, bonuses: [] };
            save.trip = {
              ...trip,
              encounter: depth,
              kit: {
                ...kit,
                state: row.mode === 'fresh cooled' ? { pendingCool: 1 } : kit.state,
                choices: [{ after: depth - 1, id: axis, pool: [row.variant] }],
              },
            };
            play(save, row, seed);
          }
        }
        rows.push(...fresh);
        if (config.freshOnly) continue;
        for (const mode of canCool
          ? (['trip-worn', 'trip-worn cooled'] as const)
          : (['trip-worn'] as const)) {
          const worn = makeRows(mode);
          for (let seed = firstSeed; seed < nextSeed; seed++) {
            runTrip(
              start(seed),
              {
                ...flow,
                pushOnward: (save) =>
                  district === 'bridges' && save.trip
                    ? { ...save, trip: chooseAt(save.trip, axis) }
                    : flow.pushOnward(save),
              },
              {
                pick: (trip) =>
                  mode === 'trip-worn cooled'
                    ? Math.max(
                        0,
                        trip.offers.findIndex((offer) => offer.kind === PLUNGE_KIND),
                      )
                    : 0,
                fight: (save, trip) => {
                  const depth = trip.encounter;
                  const variant = variantFor(trip, depth);
                  const row = worn.find((r) => r.depth === depth + 1 && r.variant === variant);
                  if (!row) throw new Error(`Unexpected trip layout ${depth + 1}#${variant + 1}`);
                  return play(save, row, seed);
                },
              },
            );
          }
          rows.push(...worn);
        }
      }
    }
  }
  return rows;
}

/** One authored fresh fight (1-based depth, 0-based layout) for the aware party of `party`, as the sweeps play it. */
export function freshBathFight(
  party: number,
  depth: number,
  variant: number,
  seed: number,
): Sample {
  const who = PARTIES[party - 1];
  if (!who) throw new Error(`Unknown party size ${party}`);
  const profile = profileFor(who);
  const save = { ...newSave(seed), profile, trip: startTrip(profile, seed, 'bathhouses') };
  const { trip } = save;
  const kit = trip.kit ?? { state: null, choices: [], checkpoint: false, bonuses: [] };
  save.trip = {
    ...trip,
    encounter: depth - 1,
    kit: { ...kit, choices: [{ after: depth - 2, id: 'authored', pool: [variant] }] },
  };
  const state = flow.startBattle(save).state;
  return measure(
    state,
    botFight(state, ROUNDS, who, { gauge: true, cracks: true, hold: false, budget: BUDGET }),
  );
}

const markdown = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const mean = (values: number[]) =>
  values.length ? (values.reduce((sum, n) => sum + n, 0) / values.length).toFixed(2) : '—';
const median = (values: number[]) => {
  if (values.length === 0) return '—';
  values.sort((a, b) => a - b);
  return mean(values.slice(Math.floor((values.length - 1) / 2), Math.floor(values.length / 2) + 1));
};
const earliest = (values: number[]) => (values.length ? Math.min(...values) : '—');
const column = (samples: Sample[], read: (s: Sample) => number | undefined | null) =>
  samples.flatMap((s) => read(s) ?? []);
const count = (samples: Sample[], outcome: Sample['outcome']) =>
  samples.filter((sample) => sample.outcome === outcome).length;
const percent = (samples: Sample[]) => (100 * count(samples, 'win')) / samples.length;
const rate = (samples: Sample[]) => `${count(samples, 'win')}/${samples.length}`;
const ids = ({ party, policy, mode, depth }: Row) => [party, policy, mode, depth];
const label = (row: Row) => `${row.layout.replaceAll('|', '/')} #${row.variant + 1}`;

function aggregate(rows: Row[], by: (row: Row) => (string | number)[]): Row[] {
  const groups = new Map<string, Row>();
  for (const row of rows) {
    const key = JSON.stringify(by(row));
    const existing = groups.get(key);
    if (existing) existing.samples.push(...row.samples);
    else groups.set(key, { ...row, layout: 'all layouts', samples: [...row.samples] });
  }
  return [...groups.values()];
}

const caption = ({ seeds, firstSeed = 1 }: Config) =>
  `Seeds ${firstSeed}–${firstSeed + seeds - 1}, ${ROUNDS} rounds, ${BUDGET} applied actions, full starter-lattice bot. Aware uses gauge + cracks. Blind uses neither. Hold is off in both. Worn trips carry actual HP and charges, take the first loot and leave the doorway unchanged; cooled trips prioritize the cold plunge. Opening bridge layouts precede the first span choice.`;

const durationHeadings = ['entry charges', 'median rounds (wins)', 'median HP left (wins)'];
const durationCells = (samples: Sample[]) => {
  const wins = samples.filter((s) => s.outcome === 'win');
  return [
    mean(column(samples, (s) => s.entryCharges)),
    median(column(wins, (s) => s.rounds)),
    median(column(wins, (s) => s.hpLeft)),
  ];
};

export function bathTables(config: Config, compareCanals: boolean): string {
  const rows = sweep('bathhouses', config);
  const canalRows = compareCanals ? sweep('canals', { ...config, freshOnly: true }) : [];
  const comparison = aggregate(canalRows, ids);
  const outcomes = (samples: Sample[]) => `${count(samples, 'win')}/${count(samples, 'loss')}`;
  const headings = [
    'party',
    'policy',
    'state',
    'depth',
    'layout',
    'heat',
    'wins/fights',
    'fresh canal wins/fights',
    'delta pp',
    'boils/fight',
    'median boils',
    'first boil dusk',
    'earliest boil dusk',
    'legacy bot round',
    'no boil',
    'member hits/fight',
    'wins/losses if boil',
    'wins/losses if no boil',
    'stalls',
    'budget',
    'entry HP',
    'Steward HP',
    ...durationHeadings,
  ];
  const table = (r: Row, layout: string) => {
    const s = r.samples;
    const canal = comparison.find(
      (c) => c.party === r.party && c.policy === r.policy && c.depth === r.depth,
    );
    const delta =
      canal && s.length && r.mode.startsWith('fresh')
        ? (percent(s) - percent(canal.samples)).toFixed(1)
        : '—';
    const dry = s.filter((sample) => !sample.boils);
    return markdown([
      ...ids(r),
      layout,
      s[0]?.heat ??
        (r.mode.endsWith('cooled') && r.depth >= 2 && r.depth <= 4
          ? r.depth - 1
          : Math.min(r.depth, 4)),
      rate(s),
      canal && r.mode.startsWith('fresh') ? rate(canal.samples) : '—',
      delta,
      mean(column(s, (x) => x.boils)),
      median(column(s, (x) => x.boils)),
      median(column(s, (x) => x.firstBoil)),
      earliest(column(s, (x) => x.firstBoil)),
      median(column(s, (x) => x.botFirstBoil)),
      dry.length,
      mean(column(s, (x) => x.memberHits)),
      outcomes(s.filter((sample) => sample.boils)),
      outcomes(dry),
      count(s, 'stall'),
      count(s, 'budget'),
      mean(column(s, (x) => x.entryHp)),
      [...new Set(column(s, (x) => x.bossHp))].join(', ') || '—',
      ...durationCells(s),
    ]);
  };
  const header = [markdown(headings), markdown(headings.map(() => '---'))];
  return [
    caption(config),
    '',
    'First boil uses the round in the event log, before the following round starts. The legacy bot column uses the post-action round. Both medians exclude fights without a boil. Win/loss counts exclude stalls and exhausted budgets.',
    '',
    '#### Baths by depth and effective heat',
    '',
    ...header,
    ...aggregate(rows, ids).map((r) => table(r, r.layout)),
    '',
    '<details><summary>Baths by layout</summary>',
    '',
    ...header,
    ...rows.map((r) => table(r, label(r))),
    '',
    '</details>',
    '',
    ...(canalRows.length
      ? [
          '<details><summary>Fresh canal comparison by layout</summary>',
          '',
          '| party | policy | depth | layout | wins/fights | stalls | budget |',
          '| --- | --- | --- | --- | --- | --- | --- |',
          ...canalRows.map((r) =>
            markdown([
              r.party,
              r.policy,
              r.depth,
              label(r),
              rate(r.samples),
              count(r.samples, 'stall'),
              count(r.samples, 'budget'),
            ]),
          ),
          '',
          '</details>',
          '',
        ]
      : []),
  ].join('\n');
}

export function bridgeTable(config: Config): string {
  const rows = sweep('bridges', config);
  const headings = [
    'party',
    'policy',
    'state',
    'depth',
    'span',
    'wins/fights',
    'losses',
    'stalls',
    'budget',
    'member falls/fight',
    'entry HP',
    'Chief HP',
    ...durationHeadings,
  ];
  return [
    caption(config),
    '',
    markdown(headings),
    markdown(headings.map(() => '---')),
    ...aggregate(rows, (r) => [...ids(r), r.axis]).map((r) => {
      const s = r.samples;
      return markdown([
        ...ids(r),
        r.axis,
        rate(s),
        count(s, 'loss'),
        count(s, 'stall'),
        count(s, 'budget'),
        mean(column(s, (x) => x.falls)),
        mean(column(s, (x) => x.entryHp)),
        [...new Set(column(s, (x) => x.bossHp))].join(', ') || '—',
        ...durationCells(s),
      ]);
    }),
  ].join('\n');
}
