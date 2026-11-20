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
import { runTrip } from '$engine/sim';
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
  /** The heart fight, when the trip reached it (real fights only). */
  heart: HeartRun | null;
};

/** The postmaster's recovered page, banked on a heart win (IQ-23). */
export const POSTMASTER_PAGE_ID = 'postmaster:serveNotice' as const;
export const HEART_ROOM = 4;

/** One heart fight read back from its log and end state (IQ-23, CAL-2). */
export type HeartRun = {
  outcome: 'won' | 'lost' | 'stalled';
  rounds: number;
  /** Writs served / lifted (answered) / collected (the clock ran out) in the fight. */
  served: number;
  lifted: number;
  collected: number;
  /** The first thing the postmaster did: his trick's name or his first cast's spell name. */
  opener: string | null;
  /** His trick by name, if he used it at all. */
  trick: string | null;
  /** His spell casts (Serve notice / Collect), not his trick. */
  casts: number;
  /** His page was banked by this fight's end (won only; a stall ends nothing). */
  page: boolean;
  pmHp: number;
  /** His remaining charges: serveNotice, collect. */
  charges: [number, number];
  /** Sum of the party's HP at the end. */
  partyHp: number;
};

/** Reads a heart fight (state, log, the save it began from) into a `HeartRun`. */
export function heartRun(save: SaveData, state: BattleState, events: GameEvent[]): HeartRun {
  const outcome = state.phase === 'won' ? 'won' : state.phase === 'lost' ? 'lost' : 'stalled';
  let opener: string | null = null;
  let trick: string | null = null;
  let casts = 0;
  let served = 0;
  let lifted = 0;
  let collected = 0;
  for (const e of events) {
    if (e.type === 'trickUsed') {
      trick ??= e.name;
      opener ??= e.name;
    } else if (e.type === 'cast' && !e.caster.member && e.caster.name === 'postmaster') {
      casts++;
      opener ??= e.spell;
    } else if (e.type === 'inkQuarter:clockServed') served++;
    else if (e.type === 'inkQuarter:clockLifted') lifted++;
    else if (e.type === 'inkQuarter:clockCollected') collected++;
  }
  const pm = state.units.find((u) => u.kind === 'enemy' && u.def === 'postmaster');
  const rival = pm?.kind === 'enemy' ? pm.rival : undefined;
  const banked =
    outcome === 'stalled'
      ? false
      : endBattle(save, state, events).save.profile.pages.includes(POSTMASTER_PAGE_ID);
  return {
    outcome,
    rounds: state.round,
    served,
    lifted,
    collected,
    opener,
    trick,
    casts,
    page: banked,
    pmHp: pm?.hp ?? 0,
    charges: [rival?.charges.serveNotice ?? 0, rival?.charges.collect ?? 0],
    partyHp: state.units.reduce((n, u) => n + (u.kind === 'member' ? u.hp : 0), 0),
  };
}

/** The heart on a fresh party (full HP and charges), seed `seed`, bot fight of up to `maxRounds`. */
export function freshHeart(seed: number, def: string | null = null, maxRounds = 40): HeartRun {
  let save: SaveData = { ...newSave(seed), profile: inkProfile() };
  save = setOut(save, 'inkQuarter');
  const t = save.trip as Trip;
  const kit = t.kit ? { ...t.kit } : undefined;
  if (kit && def) kit.state = signTerm(parseInkState(kit.state), def as never, HEART_ROOM - 1);
  save = { ...save, trip: { ...t, encounter: HEART_ROOM, ...(kit ? { kit } : {}) } };
  const fight = botFight(startBattle(save).state, maxRounds);
  return heartRun(save, fight.state, fight.events);
}

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
    heart: null,
  };
  let pending: { save: SaveData; state: BattleState; events: GameEvent[] } | null = null;
  const track = (t: Trip) => {
    run.maxOpen = Math.max(run.maxOpen, openOf(t).length);
  };
  const out = runTrip(
    save,
    { startBattle, endBattle, takeOffer, leaveDoorway, pushOnward },
    {
      step: track,
      pick: (t) => pickIndex(t, policy),
      fight: (s, t) =>
        mode === 'skip'
          ? {
              state: {
                ...forced(startBattle(s).state),
                round: 1 + ((seed * 7 + t.encounter * 5) % 12),
              },
              events: [
                { type: 'round', round: 1 + ((seed * 7 + t.encounter * 5) % 12) },
              ] as GameEvent[],
            }
          : (() => {
              const f = botFight(startBattle(s).state, maxRounds);
              if (t.encounter === HEART_ROOM)
                pending = { save: s, state: f.state, events: f.events };
              return f;
            })(),
      // Out of rounds: a stall counts as a loss in the tables.
      onStall: (t, state) => {
        if (pending && t.encounter === HEART_ROOM)
          run.heart = heartRun(pending.save, pending.state, pending.events);
        run.rooms.push({
          room: t.encounter,
          won: false,
          rounds: state.round,
          term: openOf(t)[0]?.def ?? null,
          settled: null,
        });
      },
      onRoom: (t, state, end) => {
        if (pending && t.encounter === HEART_ROOM)
          run.heart = heartRun(pending.save, pending.state, pending.events);
        const open = openOf(t)[0] ?? null;
        const won = end.outcome === 'won';
        const after = end.save.trip;
        const was = open && after ? termsOf(after).find((x) => x.id === open.id) : null;
        run.rooms.push({
          room: t.encounter,
          won,
          rounds: state.round,
          term: open?.def ?? null,
          settled: won ? (was?.status ?? null) : null,
        });
      },
      onLoot: (t, after) => {
        if (after.trip && termsOf(after.trip).length > termsOf(t).length) {
          run.signed.push(termsOf(after.trip).at(-1)?.def ?? '');
          if (t.encounter >= 4) run.termAtHeart = true;
        }
      },
    },
  );
  save = out.save;
  const last = save.trip;
  if (last && out.end === 'cleared') {
    run.cleared = true;
    run.stranded = !returnCheck(last).ok;
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
