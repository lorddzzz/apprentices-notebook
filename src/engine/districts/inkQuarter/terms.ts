import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import type { TermCondition, TermDef, TermId } from '$data/districts/inkQuarter/types';
import type { EventLog } from '../../events';
import type {
  DistrictEvent,
  DistrictEventDef,
  KitLootSpec,
  ReturnBlock,
  TripShapeDef,
} from '../types';
import {
  type InkTripState,
  openTerm,
  type Term,
  type TermBrokenEvent,
  type TermPaidEvent,
  type TermSignedEvent,
} from './types';

/**
 * Terms in the trip (P5; IQ-3): signing, the return block while one is open, and settling when
 * the next room is won. The stakes' effects (reward taken back, losses, next-room costs) are
 * IQ-4's; this file only decides paid or broken.
 */

/** The def a term names, from the district's term list (null for an id no longer listed). */
export const termDef = (id: TermId, defs: readonly TermDef[] = INK_TERMS): TermDef | null =>
  defs.find((d) => d.id === id) ?? null;

/** The page a reward names (a rune, method or solvent id), or null for any other spec. */
export function pageIdOf(spec: KitLootSpec): string | null {
  switch (spec.kind) {
    case 'rune':
      return spec.rune;
    case 'method':
      return spec.method;
    case 'solvent':
      return spec.solvent;
    default:
      return null;
  }
}

/** The page a def rewards, or null for an extra pick alone. */
export const rewardPage = (d: TermDef): string | null =>
  d.reward.kind === 'extraPick' ? null : pageIdOf(d.reward.spec);

// ── Conditions (P6) ─────────────────────────────────────
/** Rounds the fight began (the last `round` event's number; 0 for an empty log). */
const roundsIn = (log: EventLog): number =>
  log.reduce((n, e) => (e.type === 'round' ? Math.max(n, e.round) : n), 0);

/** An apprentice went down or out of the room: both come back at revive HP. */
const memberDowned = (log: EventLog): boolean =>
  log.some((e) => (e.type === 'died' || e.type === 'outOfRoom') && e.unit.member === true);

/** Whether a won room's log meets the condition (a lost room never reaches here). */
export function conditionMet(c: TermCondition, log: EventLog): boolean {
  switch (c.kind) {
    case 'winRoom':
      return true;
    case 'withinRounds':
      return roundsIn(log) <= c.rounds;
    case 'noneDowned':
      return !memberDowned(log);
  }
}

// ── Sign and settle ─────────────────────────────────────
/** Signs `def` in room `room`'s loot: a new open term. Throws while another is open (P5). */
export function signTerm(state: InkTripState, def: TermId, room: number): InkTripState {
  if (openTerm(state)) throw new Error('A term is already open');
  const term: Term = { id: `t${state.terms.length}`, def, signedAt: room, status: 'open' };
  return { terms: [...state.terms, term] };
}

/**
 * Room `room` was won: a term signed before it is settled, paid when its condition held in `log`,
 * else broken. A term signed in this room's own loot is not open yet (it is signed after this).
 * An id no longer listed reads as `winRoom`, so an old save never strands the party.
 */
export function settleTerms(
  state: InkTripState,
  room: number,
  log: EventLog,
  defs: readonly TermDef[] = INK_TERMS,
): InkTripState {
  const open = openTerm(state);
  if (!open || open.signedAt >= room) return state;
  const cond = termDef(open.def, defs)?.condition ?? { kind: 'winRoom' };
  const status = conditionMet(cond, log) ? 'paid' : 'broken';
  return { terms: state.terms.map((t) => (t.id === open.id ? { ...t, status } : t)) };
}

/** The reason on the greyed Return home while a term is open (P5). */
export function termBlocks(
  state: InkTripState,
  defs: readonly TermDef[] = INK_TERMS,
): readonly ReturnBlock[] {
  const open = openTerm(state);
  if (!open) return [];
  const cond = termDef(open.def, defs)?.text.condition;
  return [{ why: `A signed term holds you here${cond ? `: ${cond}` : ''}.` }];
}

/** The terms' trip-shape hooks (P5): an open term blocks the way home; the next win settles it. */
export const TERM_HOOKS: Pick<TripShapeDef<InkTripState>, 'returnBlocks' | 'afterRoom'> = {
  returnBlocks: ({ state }) => termBlocks(state),
  afterRoom: ({ state, room }, log, won) => (won ? settleTerms(state, room, log) : state),
};

// ── Events (P5) ─────────────────────────────────────────
export type TermEvent = TermSignedEvent | TermPaidEvent | TermBrokenEvent;

/**
 * What changed between two states of the trip's terms, as events: a new term is signed (in its
 * signing room), an open one paid or broken (in `room`, the room whose win settled it). Terms
 * change outside any battle (a pick, a won room), so the trip screens show these rather than a
 * battle log.
 */
export function termEvents(before: InkTripState, after: InkTripState, room: number): TermEvent[] {
  const out: TermEvent[] = [];
  for (const t of after.terms) {
    const was = before.terms.find((u) => u.id === t.id);
    if (!was) {
      out.push({
        type: 'inkQuarter:termSigned',
        data: { term: t.id, def: t.def, room: t.signedAt },
      });
    } else if (was.status === 'open' && t.status !== 'open') {
      const type = t.status === 'paid' ? 'inkQuarter:termPaid' : 'inkQuarter:termBroken';
      out.push({ type, data: { term: t.id, def: t.def, room } });
    }
  }
  return out;
}

const defOf = (e: DistrictEvent): TermDef | null => {
  const d = e.data;
  const id = d && typeof d === 'object' && !Array.isArray(d) ? (d as { def?: unknown }).def : null;
  return typeof id === 'string' && id.startsWith('inkQuarter:') ? termDef(id as TermId) : null;
};

/** The terms' log lines, worded from the def's own text where it is listed. */
export const TERM_EVENT_DEFS: readonly DistrictEventDef[] = [
  {
    type: 'inkQuarter:termSigned',
    describe: (e) => {
      const cond = defOf(e)?.text.condition;
      return cond ? `a term is signed: ${cond}` : 'a term is signed';
    },
  },
  { type: 'inkQuarter:termPaid', describe: () => 'the term is paid' },
  {
    type: 'inkQuarter:termBroken',
    describe: (e) => {
      const penalty = defOf(e)?.text.penalty;
      return penalty ? `the term is broken: ${penalty}` : 'the term is broken';
    },
  },
];

// ── The data check (P5, P7) ─────────────────────────────
/**
 * Problems with a term list for a district of `length` rooms (the last is the heart), or none.
 * A term may never be offered at the heart: nothing would settle it and it would block nothing,
 * so the heart's loot stays term-free (P5). A rewarded page is a rune, method or solvent page,
 * and a guarantee names the page its term rewards.
 */
export function checkTermDefs(defs: readonly TermDef[], length: number): string[] {
  const heart = length - 1;
  const errors: string[] = [];
  defs.forEach((d, i) => {
    if (defs.findIndex((x) => x.id === d.id) !== i) errors.push(`${d.id}: listed twice`);
    if (d.rooms.length === 0) errors.push(`${d.id}: offered in no room`);
    for (const r of d.rooms) {
      if (!Number.isInteger(r) || r < 0 || r >= length) errors.push(`${d.id}: no room ${r}`);
      else if (r === heart) errors.push(`${d.id}: a term at the heart`);
    }
    const page = rewardPage(d);
    if (d.reward.kind !== 'extraPick' && page === null)
      errors.push(`${d.id}: reward is not a page`);
    if (d.guaranteedWhileLacking !== undefined && d.guaranteedWhileLacking !== page) {
      errors.push(`${d.id}: guaranteed while lacking a page it does not reward`);
    }
    if (d.condition.kind === 'withinRounds' && d.condition.rounds < 1) {
      errors.push(`${d.id}: within ${d.condition.rounds} rounds`);
    }
  });
  return errors;
}
