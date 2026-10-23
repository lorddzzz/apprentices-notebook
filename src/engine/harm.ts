import type { HabitId, HarmKind, LineId } from '$data';
import type { Ctx } from './ctx';
import type { Dir } from './grid';
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

/** AH's guards (the habit wards land in AH-4). */
export const HABIT_GUARDS: HarmGuardList = [];

/** Every guard, in order: habits first; BH, IQ and RV append their own lists here. */
export const HARM_GUARDS: HarmGuardList = [...HABIT_GUARDS];

const PASS: HarmVerdict = { kind: 'pass' };

/** The first guard that does not pass decides; with none, the harm goes on. */
export function guardHarm(ctx: Ctx, harm: Harm, guards: HarmGuardList = HARM_GUARDS): HarmVerdict {
  for (const g of guards) {
    if (!g.kinds.includes(harm.kind)) continue;
    const v = g.run(ctx, harm);
    if (v.kind !== 'pass') return v;
  }
  return PASS;
}
