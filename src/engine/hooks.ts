import type { Ctx } from './ctx';
import type { Coord, Dir } from './grid';
import * as marks from './marks';
import * as solvents from './solvents';
import type { UnitId } from './types';

/**
 * Things that happen to units which marks and solvents wait for (design §6.2, §7). `entered` is
 * never notified: arriving on a tile goes through the arrival pipeline (arrival.ts), whose hooks
 * hand it to solvents and marks in their fixed order.
 */
export type Hook =
  | { kind: 'hit'; unit: UnitId; heading: Dir | null; from: Coord | null }
  | { kind: 'entered'; unit: UnitId; at: Coord }
  | { kind: 'pushed'; unit: UnitId; dir: Dir }
  | { kind: 'died'; unit: UnitId };

/** The hooks `notify` fans out (an arrival is never notified). */
export type NotifiedHook = Exclude<Hook, { kind: 'entered' }>;

/** Static fan-out, no registration: solvents first (Wax melts before its mark could release), then marks. */
export function notify(ctx: Ctx, h: NotifiedHook): void {
  solvents.onHook(ctx, h);
  marks.onHook(ctx, h);
}
