import {
  type BattleState,
  type GameEvent,
  newProfile,
  newSave,
  type Profile,
  type SaveData,
  type Trip,
} from '$engine';
import { TERMED } from '$engine/districts/inkQuarter/offers';
import { signTerm, termDef } from '$engine/districts/inkQuarter/terms';
import { parseInkState, type Term } from '$engine/districts/inkQuarter/types';
import { returnCheck } from '$engine/trip/ret';
import {
  endBattle,
  leaveDoorway,
  pushOnward,
  setOut,
  startBattle,
  takeOffer,
} from '../../src/app/flow';
import { botFight } from './bot';

/**
 * Whole-trip bot for the ink quarter (IQ-20). Signing policy: `never` refuses every termed card;
 * `always` signs whenever one is offered and none is open; `winRoom` signs only terms whose
 * condition is `winRoom` (no clock to beat). The bot never goes home early: it pushes on to the
 * heart, so the tables read the rooms, not a retreat decision.
 */
export type SignPolicy = 'never' | 'always' | 'winRoom';

export type RoomRow = {
  room: number;
  won: boolean;
  rounds: number;
  /** The def of the term open going into this room (signed earlier), if any. */
  term: string | null;
  /** How that term settled (only when the room was won). */
  settled: Term['status'] | null;
};
export type InkTripRun = {
  rooms: RoomRow[];
  signed: string[];
  cleared: boolean;
  maxOpen: number;
  /** A term was signed with the heart as the next room's neighbour: never allowed. */
  termAtHeart: boolean;
  /** Cleared, yet the way home was shut. */
  stranded: boolean;
  save: SaveData;
};

export const inkProfile = (): Profile => {
  const p = newProfile();
  return { ...p, city: { ...p.city, heard: ['seam', 'inkQuarter'], open: ['seam', 'inkQuarter'] } };
};

const termsOf = (t: Trip) => parseInkState(t.kit?.state).terms;
const openOf = (t: Trip) => termsOf(t).filter((x) => x.status === 'open');

function pickIndex(t: Trip, policy: SignPolicy): number {
  const idx = t.offers.findIndex((o) => {
    if (o.kind !== TERMED) return false;
    if (policy === 'always') return true;
    if (policy === 'never') return false;
    const d = termDef((o.data as { def: string }).def as never);
    return d?.condition.kind === 'winRoom';
  });
  if (idx >= 0) return idx;
  const plain = t.offers.findIndex((o) => o.kind !== TERMED);
  return plain >= 0 ? plain : 0;
}

/** A lost or stalled room becomes a win (`force`), so fuzz trips still reach the heart. */
function forced(b: BattleState): BattleState {
  const s = structuredClone(b);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  for (const u of s.units) if (u.kind === 'member' && u.hp === 0) u.hp = 1;
  return s;
}

/**
 * `bot`: real fights, the trip ends at the first loss or stall. `skip`: no fighting, every room
 * is won by fiat after a seeded 1-12 rounds (cheap, for invariants; some terms break).
 */
export type FightMode = 'bot' | 'skip';

export function inkTrip(
  seed: number,
  policy: SignPolicy,
  mode: FightMode = 'bot',
  maxRounds = 40,
): InkTripRun {
  let save: SaveData = { ...newSave(seed), profile: inkProfile() };
  save = setOut(save, 'inkQuarter');
  const run: InkTripRun = {
    rooms: [],
    signed: [],
    cleared: false,
    maxOpen: 0,
    termAtHeart: false,
    stranded: false,
    save,
  };
  for (let guard = 0; guard < 60 && save.trip; guard++) {
    const t = save.trip;
    run.maxOpen = Math.max(run.maxOpen, openOf(t).length);
    if (t.status === 'fight') {
      const open = openOf(t)[0] ?? null;
      const fight =
        mode === 'skip'
          ? {
              state: {
                ...forced(startBattle(save).state),
                round: 1 + ((seed * 7 + t.encounter * 5) % 12),
              },
              events: [
                { type: 'round', round: 1 + ((seed * 7 + t.encounter * 5) % 12) },
              ] as GameEvent[],
            }
          : botFight(startBattle(save).state, maxRounds);
      if (fight.state.phase === 'player') {
        // Out of rounds: a stall counts as a loss in the tables.
        run.rooms.push({
          room: t.encounter,
          won: false,
          rounds: fight.state.round,
          term: open?.def ?? null,
          settled: null,
        });
        break;
      }
      const end = endBattle(save, fight.state, fight.events);
      const won = end.outcome === 'won';
      const after = end.save.trip;
      const was = open && after ? termsOf(after).find((x) => x.id === open.id) : null;
      run.rooms.push({
        room: t.encounter,
        won,
        rounds: fight.state.round,
        term: open?.def ?? null,
        settled: won ? (was?.status ?? null) : null,
      });
      save = end.save;
      if (!won) break;
    } else if (t.status === 'looting') {
      const before = termsOf(t).length;
      const room = t.encounter;
      save = takeOffer(save, pickIndex(t, policy));
      if (save.trip && termsOf(save.trip).length > before) {
        run.signed.push(termsOf(save.trip).at(-1)?.def ?? '');
        if (room >= 4) run.termAtHeart = true;
      }
    } else if (t.status === 'doorway') save = leaveDoorway(save, save.profile);
    else if (t.status === 'crossroads') save = pushOnward(save);
    else {
      run.cleared = t.status === 'cleared';
      run.stranded = t.status === 'cleared' && !returnCheck(t).ok;
      break;
    }
  }
  run.save = save;
  return run;
}

/** One room fought on a fresh party (full HP and charges), optionally under a term signed in the room before. */
export type RoomOutcome = { won: boolean; rounds: number; settled: Term['status'] | null };
export function roomRun(seed: number, room: number, def: string | null): RoomOutcome {
  let save: SaveData = { ...newSave(seed), profile: inkProfile() };
  save = setOut(save, 'inkQuarter');
  const t = save.trip as Trip;
  const kit = t.kit ? { ...t.kit } : undefined;
  if (kit && def) kit.state = signTerm(parseInkState(kit.state), def as never, room - 1);
  save = { ...save, trip: { ...t, encounter: room, ...(kit ? { kit } : {}) } };
  const open = def ? termsOf(save.trip as Trip)[0] : null;
  const fight = botFight(startBattle(save).state, 40);
  if (fight.state.phase !== 'won' && fight.state.phase !== 'lost')
    return { won: false, rounds: fight.state.round, settled: null };
  const end = endBattle(save, fight.state, fight.events);
  const won = end.outcome === 'won';
  const was = open && end.save.trip ? termsOf(end.save.trip).find((x) => x.id === open.id) : null;
  return { won, rounds: fight.state.round, settled: won ? (was?.status ?? null) : null };
}

export { checkStakeDefs } from '$engine/districts/inkQuarter/stakes';
export { checkTermDefs } from '$engine/districts/inkQuarter/terms';
export { returnCheck };
