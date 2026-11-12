import type { LineId } from '$data';
import type { Ctx } from './ctx';
import { crackedTiles } from './districts/api';
import { hasFootnote } from './footnotes';
import { sameCoord } from './grid';
import type { Unit } from './types';

/**
 * Exposure (bridges plan P21): "one step more from every hit". `hold-held-exposed` (held twice)
 * and `hold-cracked-pinned` (held on a cracked span) raise any hit on the unit by one step; the two
 * never stack (held twice is read first), so the step is 0 or 1. `dealDamage` adds it after the
 * trick and harm guards, to a hit of base 1 or more.
 */
export const NOT_EXPOSED: { step: 0 | 1; line: LineId | null } = { step: 0, line: null };

export function exposedStep(ctx: Ctx, unit: Unit): { step: 0 | 1; line: LineId | null } {
  if (unit.held <= 0) return NOT_EXPOSED;
  if ((unit.holds ?? 0) >= 2 && hasFootnote(ctx, 'hold-held-exposed')) {
    return { step: 1, line: 'hold:held' };
  }
  if (
    hasFootnote(ctx, 'hold-cracked-pinned') &&
    crackedTiles(ctx.s).some((c) => sameCoord(c, unit.pos))
  ) {
    return { step: 1, line: 'hold:cracked' };
  }
  return NOT_EXPOSED;
}
