import { CHIEF_WARDEN_TRICK_ID } from '$data/rivals/chiefWarden';
import { isAlive } from '../../queries';
import type { TrickDef } from '../../rivals/types';
import type { BattleState, Unit } from '../../types';
import { COLLAPSE_RULE_ID, KEYSTONE_PIECE, parseBridges, tileKey } from './types';

/**
 * The Chief Warden's signature trick (bridges plan P17, RV-11 `resists`): right of way. While the
 * keystone has HP he is unmoved by a push, a hold and a fall; once it breaks he is ordinary. The
 * refusal is logged by the rival engine (`bridges:trickResists`).
 */

/** Whether the keystone stands: a keystone tile whose stone is above 0. */
export function keystoneStands(s: BattleState): boolean {
  const own = parseBridges(s.rules?.[COLLAPSE_RULE_ID]);
  return s.tiles.some((t, i) => {
    if (t.piece?.id !== KEYSTONE_PIECE) return false;
    return (own.stone[tileKey(i % s.width, Math.floor(i / s.width))] ?? 0) > 0;
  });
}

/** Cheap and silent: is this the Chief Warden, alive, with the keystone standing? */
export function holdsRightOfWay(s: BattleState, unit: Unit): boolean {
  return (
    unit.kind === 'enemy' &&
    unit.def === 'chiefWarden' &&
    unit.rival !== undefined &&
    isAlive(unit) &&
    keystoneStands(s)
  );
}

export const KEYSTONE_RIGHT: TrickDef = {
  id: CHIEF_WARDEN_TRICK_ID,
  name: 'right of way',
  init: () => null,
  resists: (state, unit) => holdsRightOfWay(state, unit),
  draw: () => ({ label: 'right of way', tiles: [], units: [] }),
  describe: () => 'right of way: unmoved while the keystone stands',
};

export const BRIDGE_TRICKS: readonly TrickDef[] = [KEYSTONE_RIGHT];
