import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import type { TermDef, TermId } from '$data/districts/inkQuarter/types';
import { termDef } from '$engine/districts/inkQuarter/terms';
import { parseInkState, type Term } from '$engine/districts/inkQuarter/types';

/**
 * What the ink quarter's terms look like on screen (IQ-17): the three plain-words lines on a
 * card, the open-term line during a room, and the settled line after one. Pure, read off the
 * trip's kit state; every screen draws from these.
 */

type TripLike = { district: string; kit?: { state: unknown } };

const NO_WORDS = 'an old term, no longer listed';

export interface TermLines {
  reward: string;
  condition: string;
  penalty: string;
}

/** The three lines a card shows before signing (P7); an unlisted id reads plainly, never blank. */
export function termLines(id: TermId, defs: readonly TermDef[] = INK_TERMS): TermLines {
  const t = termDef(id, defs)?.text;
  return t
    ? { reward: t.reward, condition: t.condition, penalty: t.penalty }
    : { reward: NO_WORDS, condition: 'win the next room', penalty: 'nothing' };
}

/** The terms of this trip (empty off the quarter or with no kit). */
export function tripTerms(trip: TripLike | null): Term[] {
  return trip?.district === 'inkQuarter' && trip.kit ? parseInkState(trip.kit.state).terms : [];
}

export interface OpenTermLine {
  /** "win the next room within 8 rounds" */
  condition: string;
  /** "lose 2 ink from the trip" */
  penalty: string;
  /** A round limit (`withinRounds`), with where the fight stands. Null for other conditions. */
  count: { round: number; limit: number; over: boolean } | null;
}

/** The open term as the room's banner shows it; `round` is the battle's current round. */
export function openTermLine(
  trip: TripLike | null,
  round: number,
  defs: readonly TermDef[] = INK_TERMS,
): OpenTermLine | null {
  const open = tripTerms(trip).find((t) => t.status === 'open');
  if (!open) return null;
  const c = termDef(open.def, defs)?.condition;
  const lines = termLines(open.def, defs);
  const count =
    c?.kind === 'withinRounds'
      ? { round: Math.min(round, c.rounds), limit: c.rounds, over: round > c.rounds }
      : null;
  return { condition: lines.condition, penalty: lines.penalty, count };
}

export interface SettledTermLine {
  status: 'paid' | 'broken';
  text: string;
}

/**
 * The term the room just won settled, for the Loot screen. A term signed in room r settles in
 * room r+1 (one open at a time, and the next win settles it), so it is the settled term signed
 * one room before `room`.
 */
export function settledTermLine(
  trip: TripLike | null,
  room: number,
  defs: readonly TermDef[] = INK_TERMS,
): SettledTermLine | null {
  const t = tripTerms(trip).find((x) => x.signedAt === room - 1 && x.status !== 'open');
  if (!t || t.status === 'open') return null;
  const lines = termLines(t.def, defs);
  return t.status === 'paid'
    ? { status: 'paid', text: `The term is paid: ${lines.reward} is yours.` }
    : { status: 'broken', text: `The term is broken: ${lines.penalty}.` };
}

/** One line per term on the trip status block: open ones with their condition, settled ones as done. */
export function termStatusLines(
  trip: TripLike | null,
  defs: readonly TermDef[] = INK_TERMS,
): { status: Term['status']; text: string }[] {
  return tripTerms(trip).map((t) => {
    const lines = termLines(t.def, defs);
    const text =
      t.status === 'open'
        ? `Term open: ${lines.condition}`
        : t.status === 'paid'
          ? `Term paid: ${lines.reward}`
          : `Term broken: ${lines.penalty}`;
    return { status: t.status, text };
  });
}
