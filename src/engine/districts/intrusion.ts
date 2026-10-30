import type { IntrusionSpec } from '$data/districts/index';
import { KIT } from './kit';
import type { Kit, RuleId } from './types';

/**
 * Piece-scoped rule import (district-kit P9, DK-10). A district's lower-Seam floor brings its rules
 * with its board: the terrain and pieces switch them on (`isRuleActive`), so a floor lists no rule
 * for the fight. SM-8's floor builder builds the floor's battle from `floorLayout` and leaves the
 * fight's `rules` unset (`floorListedRules`).
 */

/** The rules a floor's board brings: `spec.rules`, each known and piece-scoped, in spec order. */
export function importedRules(spec: IntrusionSpec, kit: Kit = KIT): RuleId[] {
  return spec.rules.filter((id) => kit.rules[id]?.scope === 'piece');
}

/** What a floor's fight lists as district rules: never any. Imported rules ride on the board. */
export const floorListedRules = (): readonly RuleId[] => [];

/** The ASCII board of floor `index` (0-2), for the floor builder to hand to `createBattle`. */
export function floorLayout(spec: IntrusionSpec, index: 0 | 1 | 2): string {
  return spec.rooms[index];
}
