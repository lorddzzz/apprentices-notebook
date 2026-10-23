import { DISTRICTS, type DistrictId, MEMBER_IDS } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  beginEncounter,
  boardOf,
  closeBattle,
  type GameEvent,
  memberById,
  newProfile,
  type Profile,
  parseLattice,
  parseSaveData,
  pickLoot,
  placeOf,
  pushOn,
  returnHome,
  type SaveData,
  startTrip,
  type Trip,
  variantFor,
} from '$engine';
import { thresholdOutcome, thresholdStart } from '../../../src/app/threshold';
import { botFight } from '../../sim/bot';

/** One room of a recorded trip: what was fought, the whole event log, and how it ended. */
export interface RoomRecord {
  encounter: number;
  variant: number;
  place: string;
  actions: Action[];
  events: GameEvent[];
  phase: string;
  outcome: 'won' | 'wiped';
  offers: unknown;
  picked: number[];
  stats: unknown;
}
export interface TripOptions {
  /** Every member starts the trip at this hp. */
  startHp?: number;
  /** The party only ends its turn (a certain wipe). */
  idle?: boolean;
  maxRounds?: number;
  /** Bolt/Oil and Spark lattices instead of the starting notebook. */
  canalLoadout?: boolean;
}
export interface TripRecord {
  district: DistrictId;
  seed: number;
  options: TripOptions;
  rooms: RoomRecord[];
  outcome: 'returned' | 'wiped' | 'stopped';
  profile: Profile;
  trip: Trip | null;
  /** The end save as the save boundary reads it back. */
  save: SaveData;
}

const OIL_D = ['.     .   . . .', 'Bolt> Oil . . .', 'x     .   . . x'].join('\n');
const SPARK_S = ['x Boltv x', '. Spark .', '. .     .', '. .     .', '. .     .', 'x .     x'].join(
  '\n',
);

/** The profile every recording starts from: a new notebook with both districts open. */
export function baseProfile(canalLoadout = false): Profile {
  const p = newProfile();
  const both: DistrictId[] = ['seam', 'canals'];
  const city = { ...p.city, heard: both, open: both, fresh: [] };
  if (!canalLoadout) return { ...p, city };
  const lattices = {
    ...p.lattices,
    draughtsman: [...parseLattice(OIL_D).runes],
    stoker: [...parseLattice(SPARK_S).runes],
  };
  return { ...p, lattices, city };
}

/** A party that never acts: only ends its turn until the foes win (or the round cap). */
function idleFight(initial: BattleState, maxRounds = 40) {
  let state = initial;
  const events: GameEvent[] = [];
  const actions: Action[] = [];
  for (let n = 0; n < maxRounds && state.phase === 'player'; n++) {
    const a: Action = { type: 'endTurn' };
    const r = applyAction(state, a);
    state = r.state;
    events.push(...r.events);
    actions.push(a);
  }
  return { state, events, actions };
}

export function tripStart(p: Profile, district: DistrictId, seed: number, startHp?: number): Trip {
  const t = startTrip(p, seed, district);
  if (startHp === undefined) return t;
  return { ...t, hp: Object.fromEntries(MEMBER_IDS.map((m) => [m, startHp])) as Trip['hp'] };
}

/** Drives a whole trip with the greedy bot, picking the first offer, until it returns or wipes. */
export function recordTrip(
  district: DistrictId,
  seed: number,
  o: TripOptions = {},
  /** Replay mode: the recorded actions per room stand in for the bot. */
  replay?: readonly (readonly Action[])[],
): TripRecord {
  let p = baseProfile(o.canalLoadout);
  let t: Trip | null = tripStart(p, district, seed, o.startHp);
  const rooms: RoomRecord[] = [];
  let outcome: TripRecord['outcome'] = 'stopped';
  for (let guard = 0; guard < 20 && t; guard++) {
    const first = beginEncounter(p, t);
    let fight: { state: BattleState; events: GameEvent[]; actions: Action[] };
    let events: GameEvent[];
    if (replay) {
      const actions = [...(replay[guard] ?? [])];
      const again = beginEncounter(p, { ...t, actions });
      fight = { state: again.state, events: [], actions };
      events = again.events;
    } else {
      fight = o.idle ? idleFight(first.state) : botFight(first.state, o.maxRounds);
      events = [...first.events, ...fight.events];
    }
    if (fight.state.phase === 'player') break; // the bot timed out: not a fixture
    const encounter: number = t.encounter;
    const closed = closeBattle(p, { ...t, actions: fight.actions }, fight.state, events);
    p = closed.profile;
    const room: RoomRecord = {
      encounter,
      variant: variantFor(t, encounter),
      place: placeOf(t, encounter),
      actions: fight.actions,
      events,
      phase: fight.state.phase,
      outcome: closed.outcome,
      offers: closed.trip?.offers ?? [],
      picked: [],
      stats: closed.stats,
    };
    rooms.push(room);
    t = closed.trip;
    if (!t) {
      outcome = 'wiped';
      break;
    }
    while (t.status === 'looting') {
      room.picked.push(0);
      t = pickLoot(t, 0);
    }
    if (t.status === 'cleared') {
      p = returnHome(p, t);
      outcome = 'returned';
      break;
    }
    if (t.status !== 'crossroads') break;
    t = pushOn(t);
  }
  const raw = { profile: p, trip: t, seedCounter: seed, lastTrip: null };
  const save = parseSaveData(JSON.parse(JSON.stringify(raw)));
  return { district, seed, options: o, rooms, outcome, profile: p, trip: t, save };
}

// ── The canal lock ──────────────────────────────────────

const SHOVE_D = ['.     .   .     . .', 'Bolt> Oil Shove . .', 'x     .   .     . x'].join('\n');

export interface ThresholdRecord {
  /** 'solve' casts Bolt, Oil, Shove (the rat drops); 'fire' casts Bolt, Oil, Spark (it only dies). */
  kind: 'solve' | 'fire';
  events: GameEvent[];
  phase: string;
  board: string;
  profile: Profile;
}

/** The notebook the lock is tried with: the canals heard but still barred. */
export function lockProfile(kind: ThresholdRecord['kind']): Profile {
  const p = baseProfile(true);
  const draughtsman =
    kind === 'solve' ? parseLattice(SHOVE_D).runes : (p.lattices.draughtsman ?? []);
  return {
    ...p,
    lattices: { ...p.lattices, draughtsman: [...draughtsman] },
    city: { ...p.city, open: ['seam' as DistrictId] },
  };
}

/** Plays the lock with one cast of the Draughtsman's first spell, aimed right. */
export function playLock(kind: ThresholdRecord['kind']): ThresholdRecord {
  const gate = DISTRICTS.canals.gate;
  if (gate.kind !== 'threshold') throw new Error('the canals have a threshold');
  const p = lockProfile(kind);
  const start = thresholdStart(p, gate.room);
  const spell = memberById(start.state, 'draughtsman').spells[0];
  if (!spell) throw new Error('the Draughtsman has no spell');
  const r = applyAction(start.state, {
    type: 'cast',
    unit: 'draughtsman',
    spell: spell.key,
    aim: { kind: 'dir', dir: 'right' },
  });
  return {
    kind,
    events: [...start.events, ...r.events],
    phase: r.state.phase,
    board: boardOf(r.state),
    profile: thresholdOutcome(p, 'canals', r.state),
  };
}
