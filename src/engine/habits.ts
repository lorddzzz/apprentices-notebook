import { ENEMIES, HABITS, type HabitId, type HabitRule, LINES, type LineDef } from '$data';
import type { Profile, Unit } from './types';

/**
 * Habits as data-keyed rules (AH P9): the engine never asks *who* carries a habit, only which one
 * and what its rule bends. A member's habit is its lean's; a foe's is its def's `trick` (RV).
 */
export { withHabit } from './ctx';

/** The rule of no habit: every field absent, so each reader falls back to the plain rule. */
export const NO_RULE: HabitRule = Object.freeze({});

/** The habit a unit carries: a member's lean, a foe's `trick`, or none. */
export const habitOf = (u: Unit): HabitId | null =>
  u.kind === 'member' ? u.lean.habit : (ENEMIES[u.def].trick ?? null);

/** A habit's rule; no habit reads as `NO_RULE`. Flows and jars carry an id, so they read this. */
export const ruleOf = (h: HabitId | null | undefined): HabitRule => (h ? HABITS[h].rule : NO_RULE);

/** The rule a unit's habit bends (AH P9). */
export const habitRule = (u: Unit | null | undefined): HabitRule =>
  u ? ruleOf(habitOf(u)) : NO_RULE;

/**
 * Whether `other` is on `u`'s side (Unison's "another apprentice", AH contract for RV): members
 * with members, foes with foes.
 */
export const sameSide = (u: Unit, other: Unit): boolean => u.kind === other.kind;

/** A habit's fine print against what the household has seen (D1): the seen lines, a count of the rest. */
export interface HabitFinePrint {
  seen: LineDef[];
  unseen: number;
}

/** Witnessed lines of one habit, and how many remain unwitnessed (no hints, no text for those). */
export function habitFinePrint(
  profile: Pick<Profile, 'witnessed'>,
  habit: HabitId,
): HabitFinePrint {
  const rows = LINES.filter((l) => l.subject === habit && !l.pending);
  const seen = rows.filter((l) => profile.witnessed.includes(l.id));
  return { seen, unseen: rows.length - seen.length };
}
