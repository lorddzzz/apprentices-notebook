import type { Coord, Dir } from '../grid';
import type { Ctx } from './ctx';
import type { Origin, Unit } from './model';

export interface PushResult {
  moved: number;
  end: Coord;
  crushed: string | 'wall' | 'plate' | null; // a UnitId, or what it hit
  dropped: boolean;
}
/** Push along a heading: slide on oil, crush, drop, Hold (E3, design §4.4). */
export function push(
  _ctx: Ctx,
  _unit: Unit,
  _dir: Dir,
  _tiles: number,
  _origin: Origin | null,
): PushResult {
  throw new Error('not implemented (E3)');
}
