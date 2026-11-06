import type { HeatLevel } from '$data/districts/bathhouses/types';
import type { BattleState } from '$engine';
import { boilOverState } from '$engine/districts/bathhouses/boilOver';

/** The heat the Lab board's boil-over gauge runs at, or null when the rule is off (BH-14). */
export function labHeatOf(s: BattleState): HeatLevel | null {
  return boilOverState(s)?.heat ?? null;
}
