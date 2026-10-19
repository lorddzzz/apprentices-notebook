import type { LineId } from '$data';
import type { GameEvent } from './events';
import type { Coord } from './grid';
import type { UnitId } from './types';

/** Lines fired in a log, first-seen order (L1). */
export function witnessedIn(_log: readonly GameEvent[]): LineId[] {
  throw new Error('not implemented (L1)');
}
/** D2/D3: hide what unwitnessed lines do; keep landings as blanks; always flag party harm (L1). */
export function maskPreview(
  _log: readonly GameEvent[],
  _witnessed: ReadonlySet<LineId>,
  _party: readonly UnitId[],
): { shown: GameEvent[]; blanks: Coord[]; hurt: UnitId[] } {
  throw new Error('not implemented (L1)');
}
