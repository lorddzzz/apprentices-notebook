import type { HabitId, HarmKind, LineId } from '$data';
import type { Ctx } from './ctx';
import { KIT } from './districts/kit';
import type { Dir } from './grid';
import { habitOf, ruleOf } from './habits';
import { findUnit } from './queries';
import type { UnitId } from './types';

/**
 * The harm guard registry (AH-W0, orchestrator addition): guards that may pass, cancel or redirect
 * a hit, a push or a mark before it applies. Consumers: AH's `steamproof` (AH-4), BH's dissolved
 * bather and boil-over, IQ's forwarding writ, RV-11's `beforeHarm`. Each owner keeps its own list;
 * `harmGuards()` composes them in a fixed order: habits, then the district modules' `harmGuards`
 * (DK-IQ D1, assembled by `buildKit`). Nothing registers at runtime.
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

/**
 * Every guard, in order: habits first, then the district kit's (registry order). Read lazily:
 * district modules import the movers, so `KIT` is not ready while this file loads.
 */
export function harmGuards(): HarmGuardList {
  return KIT.harmGuards.length === 0 ? HABIT_GUARDS : [...HABIT_GUARDS, ...KIT.harmGuards];
}

function firstVerdict(ctx: Ctx, harm: Harm, guards: HarmGuardList): HarmVerdict | null {
  for (const g of guards) {
    if (!g.kinds.includes(harm.kind)) continue;
    const v = g.run(ctx, harm);
    if (v.kind !== 'pass') return v;
  }
  return null;
}

/** The first guard that does not pass decides; with none, the harm goes on. */
export function guardHarm(ctx: Ctx, harm: Harm, guards?: HarmGuardList): HarmVerdict {
  if (guards) return firstVerdict(ctx, harm, guards) ?? PASS;
  return firstVerdict(ctx, harm, HABIT_GUARDS) ?? firstVerdict(ctx, harm, KIT.harmGuards) ?? PASS;
}
