import type { Ctx } from './ctx';
import type { Coord, Dir } from './grid';
import * as jars from './jars';
import * as marks from './marks';
import * as solvents from './solvents';
import type { UnitId } from './types';

/** Things that happen to units which marks, jars and solvents wait for (design §6.2, §7). */
export type Hook =
  | { kind: 'hit'; unit: UnitId; heading: Dir | null; from: Coord | null }
  | { kind: 'entered'; unit: UnitId; at: Coord }
  | { kind: 'pushed'; unit: UnitId; dir: Dir }
  | { kind: 'died'; unit: UnitId };

/** Static fan-out, no registration: the order is marks, then jars, then solvents. */
export function notify(ctx: Ctx, h: Hook): void {
  marks.onHook(ctx, h);
  jars.onHook(ctx, h);
  solvents.onHook(ctx, h);
}
