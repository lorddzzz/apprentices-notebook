import type { LineId } from '$data/next/types';
import type { Coord } from '../grid';
import type { UnitId } from '../types';
import type { AnyEvent } from './ctx';

/** Lines fired in a log, first-seen order (L1). */
export function witnessedIn(_log: readonly AnyEvent[]): LineId[] {
  throw new Error('not implemented (L1)');
}
/** D2/D3: hide what unwitnessed lines do; keep landings as blanks; always flag party harm (L1). */
export function maskPreview(
  _log: readonly AnyEvent[],
  _witnessed: ReadonlySet<LineId>,
  _party: readonly UnitId[],
): { shown: AnyEvent[]; blanks: Coord[]; hurt: UnitId[] } {
  throw new Error('not implemented (L1)');
}
