import type { EnemyDef } from '../../types';
import { FOUNDRY_FOE_TOKENS, FOUNDRY_TUNING } from '../foundry';

/**
 * The ringers' staff (foundry-plan P5, P12, P16; BF-6, BF-7): the Ringer, the Detuner and the
 * Clapper as ordinary foes on the kit's behaviour registry (`engine/districts/foundry/foes.ts`).
 * The numbers are `FOUNDRY_TUNING.foes` (*tune by playing*); none has a core attack, the threat is
 * the ring.
 */

const PLAIN = {
  attack: null,
  ai: 'idle',
  brass: false,
  oilTrail: false,
  elite: false,
  habitat: 'any',
  flies: false,
  snuffs: false,
  bursts: false,
  boss: false,
} as const;

export const RINGER: EnemyDef = {
  id: 'ringer',
  name: 'ringer',
  token: FOUNDRY_FOE_TOKENS.ringer,
  hp: FOUNDRY_TUNING.foes.ringer.hp,
  move: FOUNDRY_TUNING.foes.ringer.move,
  anchored: FOUNDRY_TUNING.foes.ringer.anchored,
  behaviour: 'foundry:ringer',
  blurb:
    'Stands on its rope and pulls it: the bells of the rope’s tone ring a round later, and each hurts whoever stands beside it, friend or foe. The outlined tiles are where. Ring that tone first and its pull falls silent.',
  ...PLAIN,
};

export const DETUNER: EnemyDef = {
  id: 'detuner',
  name: 'detuner',
  token: FOUNDRY_FOE_TOKENS.detuner,
  hp: FOUNDRY_TUNING.foes.detuner.hp,
  move: FOUNDRY_TUNING.foes.detuner.move,
  anchored: FOUNDRY_TUNING.foes.detuner.anchored,
  behaviour: 'foundry:detuner',
  blurb:
    'Walks to the nearest bell and retunes it one tone up, spoiling the net you meant to ring. Muffled or humming, it makes no difference to it. Kill it or block it and the net stays as it was.',
  ...PLAIN,
};

export const CLAPPER: EnemyDef = {
  id: 'clapper',
  name: 'clapper',
  token: FOUNDRY_FOE_TOKENS.clapper,
  hp: FOUNDRY_TUNING.foes.clapper.hp,
  move: FOUNDRY_TUNING.foes.clapper.move,
  anchored: FOUNDRY_TUNING.foes.clapper.anchored,
  behaviour: 'foundry:clapper',
  blurb:
    'A walking bell. While it stands it is one of the bells of its tone, and hitting it rings that tone. Bumps whoever stands beside it.',
  ...PLAIN,
};

/**
 * The Carillonneur's board shell (P10; BF-9): he is a rival, so his kit and trick live in `RIVALS`
 * (`src/data/rivals/carillonneur.ts`) and this is the board-facing entry with the same id, token and
 * HP. He never walks: he rings from the Great Bell.
 */
export const CARILLONNEUR: EnemyDef = {
  id: 'carillonneur',
  name: 'Carillonneur',
  token: 'V',
  hp: FOUNDRY_TUNING.carillonneur.hp,
  move: FOUNDRY_TUNING.carillonneur.move,
  ...PLAIN,
  attack: 'line',
  elite: true,
  anchored: true,
  boss: true,
  blurb:
    'The ringer of the Great Bell, playing a four-note tune. Each round he rings the next note; after the fourth the Great Peal rings every bell. Ring a note first, mute it, or silence him, and the tune starts over.',
};

export const FOUNDRY_ENEMIES = {
  ringer: RINGER,
  detuner: DETUNER,
  clapper: CLAPPER,
  carillonneur: CARILLONNEUR,
} as const;
