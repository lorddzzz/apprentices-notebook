import type { EnemyDef } from '../../types';
import { BRIDGE_FOE_TOKENS, BRIDGE_TUNING } from './types';

/**
 * The wardens' staff, part one (bridges-plan P8; BR-5): the Warden and the Gargoyle as ordinary
 * foes on the kit's behaviour registry (`engine/districts/bridges/foes.ts`). The numbers are
 * `BRIDGE_TUNING.foes` (*tune by playing*); neither has a core attack, the threat is the floor.
 * The Mason and the Chief Warden join in BR-6 and BR-9.
 */

export const BRIDGE_FOE_TUNING = {
  /** The chalk circle holds through the party's next turn (the counter drops at its start). */
  chalkRounds: 2,
} as const;

const PLAIN = {
  attack: null,
  ai: 'idle',
  brass: false,
  oilTrail: false,
  habitat: 'any',
  anchored: false,
  snuffs: false,
  bursts: false,
  boss: false,
} as const;

export const WARDEN: EnemyDef = {
  id: 'warden',
  name: 'warden',
  token: BRIDGE_FOE_TOKENS.warden,
  hp: BRIDGE_TUNING.foes.warden.hp,
  move: BRIDGE_TUNING.foes.warden.move,
  elite: BRIDGE_TUNING.foes.warden.elite,
  flies: BRIDGE_TUNING.foes.warden.flies,
  behaviour: 'bridges:warden',
  blurb: `A bridge-warden with a stick of chalk. Draws a circle on one of you up to ${BRIDGE_TUNING.chalkRange} tiles off in a straight line; whoever is still standing in it is held, so you cannot walk off a crumbling span.`,
  ...PLAIN,
};

export const GARGOYLE: EnemyDef = {
  id: 'gargoyle',
  name: 'gargoyle',
  token: BRIDGE_FOE_TOKENS.gargoyle,
  hp: BRIDGE_TUNING.foes.gargoyle.hp,
  move: BRIDGE_TUNING.foes.gargoyle.move,
  elite: BRIDGE_TUNING.foes.gargoyle.elite,
  flies: BRIDGE_TUNING.foes.gargoyle.flies,
  behaviour: 'bridges:gargoyle',
  blurb: `Flies, and is never dropped. Takes one of you beside it up to ${BRIDGE_TUNING.carrySteps} tiles toward the nearest fog, onto a cracked tile if it can. A held apprentice cannot be carried.`,
  ...PLAIN,
};

export const BRIDGE_ENEMIES = { warden: WARDEN, gargoyle: GARGOYLE } as const;
