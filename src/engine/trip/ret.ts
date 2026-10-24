import type { ReturnPolicy } from '$data/districts/index';
import type { ReturnCheck } from '../districts/types';
import type { Trip } from '../types';
import { type DistrictShape, heartOf, shapeInput, shapeOf } from './shape';

/** Whether the policy alone lets the party home after room `room` (the heart always does). */
export function policyAllows(ret: ReturnPolicy, room: number, heart: number): boolean {
  if (room >= heart) return true;
  switch (ret.kind) {
    case 'any':
      return true;
    case 'landings':
      return ret.after.includes(room);
    case 'until':
      return room <= ret.after;
  }
}

/** The first room after `room` where the policy lets the party home (the heart at the latest). */
export function nextReturnPoint(ret: ReturnPolicy, room: number, heart: number): number {
  for (let i = room + 1; i < heart; i++) if (policyAllows(ret, i, heart)) return i;
  return heart;
}

const WHY = {
  landings: 'No landing here.',
  until: 'No way home until the heart.',
} as const;

/**
 * May the party go home from this Crossroads (P3)? The policy first, then the module's blocks
 * (a signed term) with their reason. The heart is always a return point: a cleared trip has
 * nowhere else to go, so blocks never apply there. `next` names the next room where the policy
 * would allow it, for the greyed button.
 */
export function returnCheck(t: Trip, shape: DistrictShape = shapeOf(t.district)): ReturnCheck {
  const heart = heartOf(shape);
  if (t.status === 'cleared' || t.encounter >= heart) return { ok: true };
  if (!policyAllows(shape.ret, t.encounter, heart)) {
    const why = shape.ret.kind === 'any' ? '' : WHY[shape.ret.kind];
    return { ok: false, why, next: nextReturnPoint(shape.ret, t.encounter, heart) };
  }
  const block = shape.trip?.returnBlocks?.(shapeInput(t, shape))[0];
  return block ? { ok: false, why: block.why } : { ok: true };
}

/** Whether pushing on from here walks past the point of no return ("no way home" warning). */
export function crossesNoReturn(t: Trip, shape: DistrictShape = shapeOf(t.district)): boolean {
  const heart = heartOf(shape);
  const next = t.encounter + 1;
  if (next >= heart) return false;
  return (
    policyAllows(shape.ret, t.encounter, heart) &&
    nextReturnPoint(shape.ret, t.encounter, heart) === heart &&
    shape.ret.kind === 'until'
  );
}
