import type { EnemyDef } from '../../types';
import { CARTOGRAPHERS_FOE_TOKENS } from './types';

/**
 * The guild's hands (cartographers-plan P7-P9; CG-5, CG-6): the Surveyor, the Eraser and the
 * Tracer as ordinary foes on the kit's behaviour registry (`engine/districts/cartographers/foes.ts`).
 * None has a core attack: each threat is its telegraph. Every number is *tune by playing* (CAL).
 */
export const CARTOGRAPHERS_FOE_TUNING = {
  surveyor: {
    hp: 3,
    move: 2,
    /** Both swapped units must stand within this many tiles of him. */ range: 3,
  },
  eraser: { hp: 3, move: 2 },
  tracer: { hp: 4, move: 1, /** The damage of each mirrored strike. */ strike: 1 },
} as const;

const PLAIN = {
  attack: null,
  ai: 'idle',
  brass: false,
  oilTrail: false,
  elite: false,
  habitat: 'any',
  flies: false,
  anchored: false,
  snuffs: false,
  bursts: false,
  boss: false,
} as const;

export const SURVEYOR: EnemyDef = {
  id: 'surveyor',
  name: 'surveyor',
  token: CARTOGRAPHERS_FOE_TOKENS.surveyor,
  hp: CARTOGRAPHERS_FOE_TUNING.surveyor.hp,
  move: CARTOGRAPHERS_FOE_TUNING.surveyor.move,
  behaviour: 'cartographers:surveyor',
  blurb:
    'Sights along his rule and swaps two units within three tiles of him, dragging an apprentice onto pencil about to be rubbed out. Move out of range, hold one of the pair, or take him down and the swap fails.',
  ...PLAIN,
};

export const ERASER: EnemyDef = {
  id: 'eraser',
  name: 'eraser',
  token: CARTOGRAPHERS_FOE_TOKENS.eraser,
  hp: CARTOGRAPHERS_FOE_TUNING.eraser.hp,
  move: CARTOGRAPHERS_FOE_TUNING.eraser.move,
  behaviour: 'cartographers:eraser',
  blurb:
    'Rubs out one tile a round: its state, its jar or the mark of whoever stands there, or the pencil itself, early, and whoever stands on it with it. The outlined tile is where; step off or finish it first.',
  ...PLAIN,
};

export const TRACER: EnemyDef = {
  id: 'tracer',
  name: 'tracer',
  token: CARTOGRAPHERS_FOE_TOKENS.tracer,
  hp: CARTOGRAPHERS_FOE_TUNING.tracer.hp,
  move: CARTOGRAPHERS_FOE_TUNING.tracer.move,
  behaviour: 'cartographers:tracer',
  blurb:
    'Tethered to one apprentice, it copies her work a round late: every tile she hurt last turn is struck again, mirrored across the middle of the room. Cast through the middle and it answers on the far side.',
  ...PLAIN,
};

/** The district's foes for `ENEMIES`. */
export const CARTOGRAPHERS_ENEMIES = {
  surveyor: SURVEYOR,
  eraser: ERASER,
  tracer: TRACER,
} as const;
