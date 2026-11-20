import type { EnemyDef, VariantDef } from '../types';
import type { RivalDef, RivalPageDef } from './types';

/**
 * The Registrar as a rival (cartographers plan P10-P12, CG-7; rivals plan P10): the guild's keeper
 * of the register, who struck the owner's name out. His kit is two casts of the school's own runes,
 * *Rub out* (`Bolt> Erase`: a setup, or the pencil under an apprentice) and *Pull in*
 * (`Bolt> Swap`). Erase is starved on a tile with nothing to take, and the planner's next step then
 * picks the Swap. His signature trick is *strike from the register*
 * (`engine/districts/cartographers/registrar.ts`): a per-round mark that circles a unit's tile.
 * There is no stand-in (P12): clearing his fight is the heart. Every number is *tune by playing*.
 */

const ERASE = 'Bolt> Erase';
const SWAP = 'Bolt> Swap';

export const REGISTRAR_TRICK_ID = 'cartographers:strikeFromTheRegister';
/** District goals his routine reads (`engine/districts/cartographers/registrar.ts`). */
export const RUB_OUT = 'cartographers:rubOut';
export const PULL_IN = 'cartographers:pullIn';

export const REGISTRAR_TUNING = {
  hp: 40,
  move: 1,
  /** Circles drawn each round, and below half his HP. */
  circles: 1,
  circlesBelowHalf: 2,
} as const;

export const REGISTRAR_RIVAL: RivalDef = {
  id: 'registrar',
  name: 'Registrar',
  token: 'Y',
  district: 'cartographers',
  hp: REGISTRAR_TUNING.hp,
  move: REGISTRAR_TUNING.move,
  elite: true,
  habitat: 'any',
  blurb:
    'The keeper of the register, who struck the owner out. Each round he circles a tile, and whoever stands there at round end is erased from the fight. Move off it, Erase it, or take down the hand that holds the circle; with no hand left, he holds it himself.',
  spells: [
    { id: 'erase', name: 'Rub out', lattice: ERASE, charges: 4 },
    { id: 'swap', name: 'Pull in', lattice: SWAP, charges: 4 },
  ],
  /**
   * Rub out what there is to take; with nothing to take (a starved Erase is never shown), pull an
   * apprentice in; else walk closer.
   */
  routine: [
    { goal: RUB_OUT, action: { kind: 'spell', spell: 'erase' } },
    { goal: PULL_IN, action: { kind: 'spell', spell: 'swap' } },
    { goal: 'approach', action: { kind: 'move' } },
  ],
  trick: REGISTRAR_TRICK_ID,
  fallback: { damage: 1 },
  dryStrike: 'bite',
  page: 'registrar:pullIn',
};

/**
 * His recovered page (P11): *Pull in*. His note is on Swap (level II, `swap:unit`); his page never
 * counts toward the hall's hearing.
 */
export const REGISTRAR_PAGE: RivalPageDef = {
  id: 'registrar:pullIn',
  rival: 'registrar',
  spell: 'swap',
  title: 'Pull in',
  lattice: SWAP,
  annotation:
    'Bolt carries the cast down the line and Swap trades places with whatever it meets: you stand where it stood, and it stands where you did (Bolt, Swap).',
  story:
    'A page of the register, ruled in columns, every name ticked off in a neat hand. One line has been struck so hard the nib went through the paper. In the margin, in the same hand, smaller: the register is never wrong. It is only ever corrected.',
  trial: { board: '. . . . . .\nD . . . r .\n. . . . . .' },
  note: { rune: 'swap', line: 'swap:unit', variant: 'registrar:swap' },
};

/** The note itself, in FN's variant shape (registered in the footnote `rivals` batch). */
export const REGISTRAR_NOTE: VariantDef = {
  id: 'registrar:swap',
  subject: 'swap',
  slot: { line: 'swap:unit', level: 2 },
  text: 'Struck from the register. A foe your Swap leaves standing on pencil is circled; if it is still on that tile at round end, it is erased from the fight.',
  rival: 'registrar',
  credit: "Copied from the Registrar's register.",
};

const PLAIN = {
  ai: 'idle',
  brass: false,
  oilTrail: false,
  flies: false,
  snuffs: false,
  bursts: false,
} as const;

/**
 * His board shell (`ENEMIES`): spawn turns an enemy whose id is in `RIVALS` into a rival, reading
 * the name and HP here; the def above holds his kit, and his token is claimed in `RIVAL_TOKENS`.
 */
export const REGISTRAR_SHELL: EnemyDef = {
  id: 'registrar',
  name: 'Registrar',
  token: REGISTRAR_RIVAL.token,
  hp: REGISTRAR_RIVAL.hp,
  move: REGISTRAR_RIVAL.move,
  ...PLAIN,
  attack: 'bite',
  elite: true,
  anchored: false,
  boss: true,
  habitat: 'any',
  blurb: REGISTRAR_RIVAL.blurb,
};
