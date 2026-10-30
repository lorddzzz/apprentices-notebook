import type { EnemyDef } from '../../types';

/**
 * The postal staff's data (ink-quarter plan P8; IQ-5a: the dead letter and the Sorter; the Sealer
 * and the heart join in IQ-5b and IQ-7). Every number is *tune by playing*. Their AI is the
 * kit's behaviour registry (`engine/districts/inkQuarter/foes.ts`); `ai: 'idle'` is only the
 * Lab fallback label.
 */

/** Numbers the foes' behaviours read. */
export const INK_FOE_TUNING = {
  /** The dead letter's burst on delivery. */
  deadLetterBurst: 2,
  /** The Sorter's plain file when it has no mark to forward. */
  sorterFile: 1,
  /** How far (Manhattan) the Sealer can mark a tile for its seal. */
  sealerRange: 3,
  /** Rounds a seal lasts, counting the round it lands in (it holds its bearer as long). */
  sealRounds: 2,
} as const;

/** A fluttering paper minion, addressed to the nearest apprentice; bursts on delivery. */
export const DEAD_LETTER: EnemyDef = {
  id: 'deadLetter',
  name: 'dead letter',
  token: 'x',
  hp: 1,
  move: 2,
  attack: null,
  ai: 'idle',
  behaviour: 'inkQuarter:deadLetter',
  brass: false,
  oilTrail: false,
  elite: false,
  blurb:
    'Undelivered mail, addressed to you. Bursts on delivery; paper, so fire ends it. Leaves a blot.',
  habitat: 'any',
  flies: true,
  anchored: false,
  snuffs: false,
  bursts: false,
  boss: false,
};

/** Walks the floor and forwards a mark from a foe onto an apprentice, else files a hit. */
export const SORTER: EnemyDef = {
  id: 'sorter',
  name: 'sorter',
  token: 'u',
  hp: 4,
  move: 2,
  attack: null,
  ai: 'idle',
  behaviour: 'inkQuarter:sorter',
  brass: false,
  oilTrail: false,
  elite: false,
  blurb: 'A clerk of the sorting hall. Moves the mark on a foe onto one of you, if you let it.',
  habitat: 'any',
  flies: false,
  anchored: false,
  snuffs: false,
  bursts: false,
  boss: false,
};

/** Marks a tile within reach and seals it in wax: whoever stands there is held; dodge it. */
export const SEALER: EnemyDef = {
  id: 'sealer',
  name: 'sealer',
  token: 'z',
  hp: 5,
  move: 1,
  attack: null,
  ai: 'idle',
  behaviour: 'inkQuarter:sealer',
  brass: false,
  oilTrail: false,
  elite: false,
  blurb:
    'Marks a tile within three, then drops a wax seal on it. Stand there and you are held for the round; fire melts the wax, and it dies with the Sealer.',
  habitat: 'any',
  flies: false,
  anchored: false,
  snuffs: false,
  bursts: false,
  boss: false,
};

/** The threshold's undelivered letter: inert, sits on its desk until it is shoved (IQ-11, IQ-16). */
export const LETTER: EnemyDef = {
  id: 'letter',
  name: 'letter',
  token: 'a',
  hp: 12,
  move: 0,
  attack: null,
  ai: 'idle',
  brass: false,
  oilTrail: false,
  elite: false,
  blurb: 'An undelivered letter, sealed and waiting. It does not act; it only wants to go back.',
  habitat: 'any',
  flies: false,
  anchored: false,
  snuffs: false,
  bursts: false,
  boss: false,
};

/** The postmaster's clock writ (P9; IQ-6). */
export const CLOCK_TUNING = {
  /** The deadline is the serve round plus this: unanswered at its dusk, the marks collect. */
  deadlineAfter: 3,
  /** Damage each collected mark deals its bearer. */
  collect: 3,
  /** Rounds after the writ ends (lifted or collected) before he may serve again. */
  cooldown: 2,
} as const;

/** The postmaster's seal (P9): an anchored, inert 3-HP unit; breaking it answers the clock writ. */
export const CLOCK_SEAL: EnemyDef = {
  id: 'clockSeal',
  name: "postmaster's seal",
  token: 'q',
  hp: 3,
  move: 0,
  attack: null,
  ai: 'none',
  behaviour: 'inkQuarter:clockSeal',
  brass: false,
  oilTrail: false,
  elite: false,
  blurb:
    "The postmaster's seal on his writ. Break it, or stand on his stamp, before the clock runs out.",
  habitat: 'any',
  flies: false,
  anchored: true,
  snuffs: false,
  bursts: false,
  boss: false,
};

export const INK_ENEMIES = {
  deadLetter: DEAD_LETTER,
  sorter: SORTER,
  sealer: SEALER,
  clockSeal: CLOCK_SEAL,
  letter: LETTER,
} as const;

/** The stand-in postmaster's numbers (IQ-7): his pen strike and how tough he is. */
export const POSTMASTER_TUNING = {
  /** The pen strike's damage to the apprentice it was thrown at. */
  pen: 2,
} as const;

/**
 * The postmaster as the district's stand-in heart (P10; IQ-7, replaced by the rival at IQ-22):
 * a scripted foe that never walks. Round by round he serves the clock writ, strikes with his pen,
 * and seals a tile; `standIn` means clearing him gives no page. `ai`/`behaviour` serve only the
 * death hook (`withdrawClock`) and the Lab label; the script wins in battle.
 */
export const POSTMASTER: EnemyDef = {
  id: 'postmaster',
  name: 'postmaster',
  token: 'p',
  hp: 14,
  move: 0,
  attack: null,
  ai: 'idle',
  behaviour: 'inkQuarter:postmaster',
  script: {
    steps: ['inkQuarter:serve', 'inkQuarter:pen', 'inkQuarter:waxSeal'],
    standIn: true,
  },
  brass: false,
  oilTrail: false,
  elite: false,
  blurb:
    'Serves a writ with a clock: break his seal or stand on his stamp in three rounds, or every mark collects. Strikes with his pen and seals your tile in wax.',
  habitat: 'any',
  flies: false,
  anchored: true,
  snuffs: false,
  bursts: false,
  boss: true,
};

export const INK_HEART_ENEMIES = { postmaster: POSTMASTER } as const;
