import { type Drawing, ENEMIES, type EnemyId } from '$data';
// biome-ignore lint/style/noRestrictedImports: the baths' heart heat is data, and `$data` does not re-export it
import { HEART_HEAT } from '$data/districts/bathhouses';
// biome-ignore lint/style/noRestrictedImports: the hall's room pencils are data, and `$data` does not re-export them
import { ROOM_PENCIL } from '$data/districts/cartographers/rooms';
// biome-ignore lint/style/noRestrictedImports: the pencil config is data, and `$data` does not re-export it
import { DEFAULT_PENCIL } from '$data/districts/cartographers/types';
import { DRAWN_HEART_HP_BONUS } from '$data/drawing';
// biome-ignore lint/style/noRestrictedImports: the districts' own rule ids (cycle-free by their own notes)
import { BOIL_OVER_RULE_ID } from '../districts/bathhouses/types';
// biome-ignore lint/style/noRestrictedImports: the districts' own rule ids (cycle-free by their own notes)
import { GUILD_HAND_RULE_ID } from '../districts/cartographers/types';
// biome-ignore lint/style/noRestrictedImports: the districts' own rule ids (cycle-free by their own notes)
import { TUNE_RULE_ID } from '../districts/foundry/types';
import type { Json, RuleId } from '../districts/types';
import type { BattleSpec } from '../types';
import { weightBand } from './cost';
import { HEART_FRAMES } from './frames';

/**
 * The drawn heart's HP by enemy definition, for the trial and the played room alike: the frame's
 * own `enemyHp`, with its master raised by the weight band's bonus (`DRAWN_HEART_HP_BONUS`). With
 * no bonus the frame's `enemyHp` is returned as is (`undefined` stays `undefined`).
 */
export function heartEnemyHp(drawing: Drawing): BattleSpec['enemyHp'] {
  const frame = HEART_FRAMES[drawing.heart];
  const bonus = DRAWN_HEART_HP_BONUS[weightBand(drawing)];
  if (!frame || bonus === 0) return frame?.enemyHp;
  const foe = frame.setup.foe;
  if (!(foe in ENEMIES)) return frame.enemyHp;
  const master = foe as EnemyId;
  const base = frame.enemyHp?.[master] ?? ENEMIES[master].hp;
  return { ...frame.enemyHp, [master]: base + bonus };
}

/**
 * P39: the config a master's rule gets in the district's own heart room (read, not copied, where a
 * constant exists): the tune's seed is the trip's, the baths run at their heart heat, the guild's
 * hand at the hall's last room's pencil. Rules with no config (the clock, the collapse) get none.
 * The played heart (`inkedPage` roomSetup) and the generator's trial both read it.
 */
export function heartConfig(id: RuleId, tripSeed: number): Json | undefined {
  if (id === TUNE_RULE_ID) return { seed: tripSeed };
  if (id === BOIL_OVER_RULE_ID) return { heat: HEART_HEAT };
  if (id === GUILD_HAND_RULE_ID) return { ...(ROOM_PENCIL.at(-1) ?? DEFAULT_PENCIL) };
  return undefined;
}
