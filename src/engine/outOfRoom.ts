import { TUNING } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { dealDamage, kill } from './damage';
import type { OutCause } from './districts/types';
import { unitById } from './queries';
import type { Unit, UnitId } from './types';

/**
 * A lower-Seam floor lists this rule (SM P9), and `removeFromRoom` then turns a fall into the
 * canals' survivable drop. The rule itself does nothing; its being listed is the switch.
 */
export const SEAM_DROP_RULE = 'lowerSeam:drop';

/** The canals' drop (`push.ts` `fall`): an elite or member takes 4 and is stunned, a minion is gone. */
export function seamDrop(ctx: Ctx, unit: Unit): void {
  emit(ctx, { type: 'dropped', unit: ref(unit), at: { ...unit.pos }, elite: unit.elite });
  if (!unit.elite) {
    unit.hp = 0;
    kill(ctx, unit, false, 'Drop');
    return;
  }
  dealDamage(ctx, unit, TUNING.dropEliteDamage, 'Drop');
  if (unit.hp > 0) {
    unit.stunned = true;
    emit(ctx, { type: 'stunned', unit: ref(unit) });
  }
}

/**
 * Out of the room (P11, bridges §0, Cartographers §0): a fall or an erase. A member leaves the
 * board until the room ends (hauled back at 1 HP on a win), a minion is gone, an elite stays and
 * takes the drop damage and loses its next action. The canals keep their own drop (`push.ts`).
 * The caller runs `checkEnd` afterwards, as for any damage.
 */
export function removeFromRoom(ctx: Ctx, who: Unit | UnitId, cause: OutCause): void {
  const unit = typeof who === 'string' ? unitById(ctx.s, who) : who;
  if (unit.hp <= 0 || unit.out) return;
  if (cause === 'fell' && Object.hasOwn(ctx.s.rules ?? {}, SEAM_DROP_RULE)) {
    seamDrop(ctx, unit);
    return;
  }
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
