import type { ApprenticeId, Drawing } from '$data';
import {
  type BattleState,
  compiledFor,
  deriveSeed,
  newSave,
  type Profile,
  type SaveData,
  serializeBoard,
  startTrip,
  type Trip,
} from '$engine';
import { chooseAt } from '$engine/districts/api';
import { boilOverState } from '$engine/districts/bathhouses/boilOver';
import {
  BELL_PIECE,
  type FoundryTripState,
  GREAT_BELL_PIECE,
  parseFoundryState,
} from '$engine/districts/foundry/types';
import { weightBand } from '$engine/drawing/cost';
import {
  checkGenerated,
  type GeneratedRoom,
  generateRoom,
  inkRoom,
  missingKit,
  offeredTrial,
  specFor,
} from '$engine/drawing/generate';
import { parseInkedState, roomInput, storeRoom } from '$engine/drawing/trip';
import type { BoardSpec } from '$engine/notation';
import { botFight, runTrip } from '$engine/sim';
import { choicesAt } from '$engine/trip/choices';
import * as flow from '../../../src/app/flow';
import { CAL_PARTIES, calibrationProfile } from '../../fixtures/calibration/drawings';
import type { Adapter, Options } from './runner';

// Fixed, kit-backed fixtures: cost bands come from production's cost function.
const drawings: Drawing[] = [
  {
    name: 'CAL light',
    rule: null,
    foes: ['rat'],
    pieces: [],
    shape: 'plain',
    length: 3,
    heart: 'marginalia',
  },
  {
    name: 'CAL medium',
    rule: null,
    foes: ['rat', 'sentry', 'familiar'],
    pieces: [],
    shape: 'plain',
    length: 6,
    heart: 'registrar',
  },
  {
    name: 'CAL heavy',
    rule: 'foundry:bells',
    foes: ['rat', 'sentry', 'familiar'],
    pieces: ['foundry:rope'],
    shape: 'plain',
    length: 6,
    heart: 'registrar',
  },
];
function drawingFor(axis: string): Drawing {
  const d = drawings.find((d) => weightBand(d) === axis);
  if (!d || missingKit(d))
    throw new Error(`Missing drawing/kit for ${axis}: ${d ? missingKit(d) : 'no fixture'}`);
  return d;
}
export const drawn: Adapter = {
  name: 'drawn',
  district: 'inkedPage',
  axes: ['light', 'medium', 'heavy'],
  depth: (axis) => drawingFor(axis).length,
  profile: (p, axis) => ({
    ...p,
    footnotes: { ...p.footnotes, bind: { points: 100, slots: {}, capstone: 'bind-cap-rearm' } },
    foesMet: ['rat', 'sentry', 'familiar'],
    met: [...p.met, 'bell', 'rope'],
    city: { ...p.city, hearts: [...p.city.open] },
    ending: { handover: true, creditsSeen: false },
    drawings: [drawingFor(axis), null, null],
  }),
  prepare: (p, t) => inkRoom(p, t),
};

type Mode = 'fresh' | 'carried';

interface Sample {
  drawing: Drawing;
  party: readonly ApprenticeId[];
  mode: Mode;
  seed: number;
  depth: number;
  choice?: string;
  generation?: {
    fallback: boolean;
    verified: boolean;
    dull: boolean;
    ops: number;
    ms: number;
    walkover: boolean;
    offerAttempt: number | undefined;
    attempts: number;
    budget: number | undefined;
    rounds: number | undefined;
    hpShare: number | undefined;
    trialHeats?: number[];
    heldAttempts: number;
    guardrails: string[];
    offeredIssues: string[];
    offeredIssueReasons: string[];
    capped: boolean;
    bells: number;
    stampMin?: number;
    greatNotes: number[];
  };
  fight?: {
    outcome: BattleState['phase'];
    exhausted: boolean;
    rounds: number;
    actions: number;
    entryHp: number;
    entryCharges: number;
    hp: number;
    charges: number;
    heat: number | undefined;
    pressure: number | undefined;
    boils: number;
    firstBoil: number | null;
    greatNotes: number[];
    alliedBells: number;
    peal: FoundryTripState | undefined;
  };
  error?: string;
}

function activeTrip(save: SaveData): Trip {
  if (!save.trip) throw new Error('CAL-5 needs a started trip');
  return save.trip;
}

function begin(d: Drawing, p: Profile, seed: number): SaveData {
  const profile: Profile = { ...p, drawings: [d, null, null] };
  return { ...newSave(seed), profile, trip: startTrip(profile, seed, 'inkedPage', { page: 0 }) };
}

function health(state: BattleState) {
  const party = state.units.filter((u) => u.kind === 'member');
  return {
    hp: party.reduce((sum, u) => sum + u.hp, 0),
    charges: party.reduce(
      (sum, u) => sum + Object.values(u.charges).reduce((n, value) => n + value, 0),
      0,
    ),
  };
}

function tilesWithNotes(tiles: BoardSpec['tiles'] | BattleState['tiles']) {
  const great = tiles.flatMap((t) => (t.piece?.id === GREAT_BELL_PIECE ? [t.piece.data] : []));
  const bells = tiles.filter((t) => t.piece?.id === BELL_PIECE).length;
  const notes = great.flatMap((entry) =>
    entry && typeof entry === 'object' && 'note' in entry && typeof entry.note === 'number'
      ? [entry.note]
      : [],
  );
  const allied = great.filter(
    (entry) => entry && typeof entry === 'object' && 'allied' in entry && entry.allied === true,
  ).length;
  return { bells, notes, allied };
}

function measureRoom(
  save: SaveData,
  mode: Mode,
  opts: Options,
  samples: Sample[],
  cache: Map<number, GeneratedRoom>,
  trialHeats: readonly number[],
) {
  const trip = activeTrip(save);
  const input = roomInput(save.profile, trip);
  const { drawing, party, seed, room, choice } = input;
  const sample: Sample = {
    drawing,
    party,
    mode,
    seed,
    depth: room + 1,
    ...(choice === undefined ? {} : { choice }),
  };
  samples.push(sample);

  const started = performance.now();
  // Fresh and carried openings have identical generation inputs. Reuse that output and time only
  // the fresh call. Later rooms may have a shape choice or profiles with banked footnote progress.
  const reused = mode === 'carried' && room === 0 ? cache.get(seed) : undefined;
  const heatOffset = trialHeats.length;
  const result = reused ?? generateRoom(input);
  if (mode === 'fresh' && room === 0) cache.set(seed, result);
  const ms = performance.now() - started;
  const offered = offeredTrial(result);
  const tiles = tilesWithNotes(result.layout.tiles);
  const spec = specFor(input, deriveSeed(seed, offered?.salt ?? 0), offered?.budget);
  const offeredIssues = checkGenerated(result.layout, spec);
  if (offeredIssues.length > 0) {
    console.log(
      'CAL5 INVALID',
      JSON.stringify({
        name: drawing.name,
        depth: sample.depth,
        mode,
        party,
        seed,
        issues: offeredIssues,
      }),
    );
  }
  sample.generation = {
    fallback: result.fallback,
    verified: result.verified,
    dull: result.dull,
    ops: result.ops,
    ms: reused ? 0 : ms,
    walkover: offered?.walkover ?? false,
    offerAttempt: offered?.attempt,
    attempts: result.attempts,
    budget: offered?.budget,
    rounds: offered?.won ? offered.rounds : undefined,
    hpShare: offered?.won ? offered.hpLeft : undefined,
    ...(spec.heart && drawing.heart === 'bathSteward'
      ? { trialHeats: trialHeats.slice(heatOffset) }
      : {}),
    heldAttempts: result.trials.filter((t) => t.won === null).length,
    guardrails: result.trials.flatMap((t) => t.guardrails.map((issue) => issue.guardrail)),
    offeredIssues: offeredIssues.map((issue) => issue.guardrail),
    offeredIssueReasons: offeredIssues.map((issue) => issue.reason),
    capped: result.trials.some((t) => t.capped),
    bells: tiles.bells,
    ...(drawing.rule === 'foundry:bells' && !spec.heart
      ? { stampMin: result.fallback ? 2 : 3 }
      : {}),
    greatNotes: tiles.notes,
  };
  const inked = storeRoom(trip, room, serializeBoard(result.layout));
  const ready = { ...save, trip: inked };
  const start = flow.startBattle(ready);
  const entry = health(start.state);
  const heat = boilOverState(start.state)?.heat;
  const inner = parseInkedState(inked.kit?.state).inner;
  const peal = drawing.shape === 'foundry:peal' ? parseFoundryState(inner) : undefined;
  const setup = tilesWithNotes(start.state.tiles);
  const fight = botFight(start.state, opts.rounds, party, {
    budget: opts.budget,
    gauge: true,
    cracks: true,
    lite: false,
  });
  const remaining = health(fight.state);
  sample.fight = {
    outcome: fight.state.phase,
    exhausted: fight.exhausted,
    rounds: fight.state.round,
    actions: fight.actions.length,
    entryHp: entry.hp,
    entryCharges: entry.charges,
    hp: remaining.hp,
    charges: remaining.charges,
    heat,
    pressure: boilOverState(fight.state)?.pressure,
    boils: fight.events.filter((event) => event.type === 'bathhouses:boilOver').length,
    firstBoil: fight.firstBoil,
    greatNotes: setup.notes,
    alliedBells: setup.allied,
    peal,
  };
  return { ready, state: fight.state, events: [...start.events, ...fight.events] };
}

export interface DrawnOptions extends Options {
  hearts: number;
  carried: number;
  onlyOrdinary?: boolean;
  onlyHearts?: boolean;
}

export function measureDrawn(
  drawings: readonly Drawing[],
  opts: DrawnOptions,
  trialHeats: readonly number[],
) {
  const samples: Sample[] = [];
  const ends: { name: string; party: number; seed: number; end: string }[] = [];
  const loadouts = [];
  const failedFight = new Error('CAL-5 measured fight failed');
  for (const who of Object.values(CAL_PARTIES).filter(
    (p) => opts.parties?.includes(p.length) ?? true,
  )) {
    const profile = calibrationProfile(who);
    loadouts.push(
      who.map((id) => ({
        id,
        spells: compiledFor(profile, id).spells.map((spell) => ({
          key: spell.key,
          path: spell.path,
          charges: spell.charges,
        })),
      })),
    );
    for (const drawing of drawings) {
      const cache = new Map<number, GeneratedRoom>();
      const safelyMeasure = (save: SaveData, mode: Mode) => {
        const index = samples.length;
        try {
          return measureRoom(save, mode, opts, samples, cache, trialHeats);
        } catch (error) {
          const s = samples[index];
          if (!s) throw error;
          s.error = error instanceof Error ? error.message : String(error);
          return undefined;
        }
      };
      for (let room = 0; room < drawing.length; room++) {
        const heart = room === drawing.length - 1;
        if ((opts.onlyOrdinary && heart) || (opts.onlyHearts && !heart)) continue;
        const count = heart ? opts.hearts : opts.seeds;
        for (let seed = 1; seed <= count; seed++) {
          const save = begin(drawing, profile, seed);
          safelyMeasure({ ...save, trip: { ...activeTrip(save), encounter: room } }, 'fresh');
        }
      }
      for (let seed = 1; seed <= opts.carried; seed++) {
        let ready: SaveData | undefined;
        try {
          const { end } = runTrip(
            begin(drawing, profile, seed),
            {
              ...flow,
              endBattle: (save, state, events) => flow.endBattle(ready ?? save, state, events),
              pushOnward: (save) => {
                const trip = activeTrip(save);
                if (drawing.shape !== 'bridges:span') return flow.pushOnward(save);
                const ways = choicesAt(trip).filter((choice) => choice.kind !== 'return');
                const choice = ways[(seed - 1) % ways.length];
                return choice
                  ? { ...save, trip: chooseAt(trip, choice.id) }
                  : flow.pushOnward(save);
              },
            },
            {
              pick: () => 0,
              fight: (save) => {
                const r = safelyMeasure(save, 'carried');
                if (!r) throw failedFight;
                ready = r.ready;
                return r;
              },
            },
          );
          ends.push({ name: drawing.name, party: who.length, seed, end });
        } catch (error) {
          if (error !== failedFight) throw error;
          ends.push({ name: drawing.name, party: who.length, seed, end: 'error' });
        }
      }
    }
  }
  return { samples, ends, loadouts };
}
