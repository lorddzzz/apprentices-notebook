import { TUNING } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { dealDamage, kill } from './damage';
import type { OutCause } from './districts/types';
import { unitById } from './queries';
import type { Unit, UnitId } from './types';

/**
 * Out of the room (P11, bridges §0, Cartographers §0): a fall or an erase. A member leaves the
 * board until the room ends (hauled back at 1 HP on a win), a minion is gone, an elite stays and
 * takes the drop damage and loses its next action. The canals keep their own drop (`push.ts`).
 * The caller runs `checkEnd` afterwards, as for any damage.
 */
export function removeFromRoom(ctx: Ctx, who: Unit | UnitId, cause: OutCause): void {
  const unit = typeof who === 'string' ? unitById(ctx.s, who) : who;
  if (unit.hp <= 0 || unit.out) return;
  if (unit.kind === 'enemy' && unit.elite) {
    dealDamage(ctx, unit, TUNING.dropEliteDamage, cause === 'fell' ? 'Fall' : 'Erase');
    if (unit.hp > 0) {
      unit.stunned = true;
      emit(ctx, { type: 'stunned', unit: ref(unit) });
    }
    return;
  }
  unit.out = cause;
  emit(ctx, { type: 'outOfRoom', unit: ref(unit), cause });
  if (unit.kind === 'enemy') {
    // A minion is gone: it dies off the board, no death-burst (as the canals' drop).
    unit.hp = 0;
    kill(ctx, unit, false);
    return;
  }
  unit.undo = null;
  // Its delayed effects lapse as for a downed caster (graphite undos still restore the board).
  ctx.s.scheduled = ctx.s.scheduled.filter((e) => e.kind === 'graphite' || e.owner !== unit.id);
}

/** Is the unit out of the room (P11)? */
export const isOut = (u: Unit): boolean => !!u.out;
