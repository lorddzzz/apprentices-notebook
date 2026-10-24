import type { HabitId, HarmKind, LineId } from '$data';
import type { Ctx } from './ctx';
import type { Dir } from './grid';
import { habitOf, ruleOf } from './habits';
import { findUnit } from './queries';
import type { UnitId } from './types';

/**
 * The harm guard registry (AH-W0, orchestrator addition): guards that may pass, cancel or redirect
 * a hit, a push or a mark before it applies. Consumers: AH's `steamproof` (AH-4), BH's dissolved
 * bather and boil-over, IQ's forwarding writ, RV-11's `beforeHarm`. Each owner keeps its own list;
 * `HARM_GUARDS` composes them in a fixed order. Nothing registers at runtime.
 */

/** What is about to happen to a unit. `harm` tags the source's kind (null = untagged). */
export type Harm =
  | { kind: 'hit'; unit: UnitId; amount: number; source: string; harm: HarmKind | null }
  | { kind: 'push'; unit: UnitId; dir: Dir; harm: HarmKind | null }
  | { kind: 'mark'; unit: UnitId; harm: HarmKind | null };
export type HarmEventKind = Harm['kind'];

/**
 * pass: go on. cancel: it does not happen (a cancelled hit logs `unharmed` and is not a hit).
 * redirect: it happens to `to` instead, unguarded. `line`/`habit` tag what the guard logs.
 */
export type HarmVerdict =
  | { kind: 'pass' }
  | { kind: 'cancel'; line?: LineId; habit?: HabitId }
  | { kind: 'redirect'; to: UnitId; line?: LineId; habit?: HabitId };

export interface HarmGuard {
  /** Owner-prefixed: `habit:steamproof`, `bh:bather`, `iq:writ`, `rv:beforeHarm`. */
  id: `${string}:${string}`;
  kinds: readonly HarmEventKind[];
  run: (ctx: Ctx, harm: Harm) => HarmVerdict;
}
export type HarmGuardList = readonly HarmGuard[];

const PASS: HarmVerdict = { kind: 'pass' };

/**
 * A habit's `wards` (AH P14, the towel-bearer's `steamproof`): a hit tagged with a warded harm
 * kind does not happen to its bearer. The `unharmed` event carries the habit.
 */
const habitWards: HarmGuard = {
  id: 'habit:wards',
  kinds: ['hit'],
  run(ctx, harm) {
    if (!harm.harm) return PASS;
    const u = findUnit(ctx.s, harm.unit);
    const habit = u ? habitOf(u) : null;
    return habit && ruleOf(habit).wards?.includes(harm.harm) ? { kind: 'cancel', habit } : PASS;
  },
};

/** AH's guards. */
export const HABIT_GUARDS: HarmGuardList = [habitWards];

/** Every guard, in order: habits first; BH, IQ and RV append their own lists here. */
export const HARM_GUARDS: HarmGuardList = [...HABIT_GUARDS];

/** The first guard that does not pass decides; with none, the harm goes on. */
export function guardHarm(ctx: Ctx, harm: Harm, guards: HarmGuardList = HARM_GUARDS): HarmVerdict {
  for (const g of guards) {
    if (!g.kinds.includes(harm.kind)) continue;
    const v = g.run(ctx, harm);
    if (v.kind !== 'pass') return v;
  }
  return PASS;
}
