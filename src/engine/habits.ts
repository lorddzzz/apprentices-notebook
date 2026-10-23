import { ENEMIES, HABITS, type HabitId, type HabitRule } from '$data';
import type { Unit } from './types';

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
