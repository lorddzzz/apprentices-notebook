import type { FootnoteKind, Tuning } from './types';

/** Growing-paper layout proposals, independent of gameplay ink and Glyph size rules. */
export const PAPER = {
  margin: 1,
  emptyRadius: 2,
  editPitch: 60,
  fitMarkerSize: 4,
  fitInset: 4,
  minTarget: 44,
  dragThreshold: 10,
  holdDelay: 450,
  overscan: 1,
} as const;

export const TUNING: Tuning = {
  grid: { width: 6, height: 8 },
  inkCost: { source: 2, action: 2, kind: 1, shape: 1, trigger: 1, seal: 2, aura: 3 },
  startInk: 8,
  inkReserve: 2,
  boltRange: 4,
  splashRange: 3,
  splashRadius: 1,
  vatRange: 1,
  strikeDamage: 2,
  sparkDamage: 1,
  guardShield: 2,
  shoveTiles: 1,
  crushBase: 1,
  crushPerTile: 1,
  crushStruck: 1,
  dropEliteDamage: 4,
  fireDamage: 1,
  compoundRounds: 2,
  cloudRounds: 2,
  plateRounds: 3,
  fireRounds: 2,
  reviveHp: 1,
  offersPerWin: 3,
  duplicateInk: 1,
  glyphMinCells: 3,
  glyphMaxCells: 8,
  provenCasts: 5,
  proofMasksPerMember: 300,
  compileVellum: 1,
  killHarm: 1,
  tierWindow: 10,
  economyTiers: [0.7, 1.0, 1.3], // C0 bot windows p50/p75/p90 were 0.6/1.0/1.1; gold raised because tiers are best-ever
  reliabilityTiers: [0.7, 0.85, 0.95],
  deadAfterCasts: 5,
  paramSlots: 1,
  paramSlotsGold: 2,
};

/** Board chemistry numbers beyond `TUNING` (E2, design §4, P17–P19). Tune by playing. */
export const CHEMISTRY = {
  /** Gifted Steam and Brass last this many rounds longer (P36 `round`). */
  giftRounds: 1,
  /** Bank: a cloud that lasts this many rounds longer than a compound (design §4.2). */
  bankExtraRounds: 2,
  /** Wall: hits before it breaks; plates, skid plates and kettles take one. */
  wallHits: 2,
  plateHits: 1,
  /** Kettle: damage to each unit beside it at round end. */
  kettleHeat: 1,
  /** Surge: the arc to the nearest other unit. */
  arcDamage: 1,
  /** Flashover: how long a burning fog tile burns. */
  flashoverFireRounds: 1,
  /** Brand cloud storm: a marked unit is hit this many times. */
  markedStormHits: 2,
  /** Shackle snap: tiles the unit is thrown along the heading. */
  shackleThrow: 1,
  /** Wall ring: tiles everyone touching it is pushed away. */
  wallPush: 1,
  /** Coil: extra tiles a burst reaches. */
  coilReach: 1,
} as const;

/** The authored Actions' numbers (design §5, P27–P28). */
export const ACTIONS = {
  /** Sentence pushes its marked target this many tiles. */
  sentenceTiles: 2,
  /** Hold lasts until the caster's next turn: player-phase starts. */
  holdRounds: 1,
  /** Levy: shield gained per mark spent. */
  levyShieldPerMark: 1,
} as const;

/**
 * Footnotes (P39, footnotes.md §1): points a subject needs for level I / II / III, per kind.
 * Methods and solvents fire less often, so they need fewer (*tune by playing*).
 */
export const FOOTNOTES: {
  readonly levels: Readonly<Record<FootnoteKind, readonly [number, number, number]>>;
} = {
  levels: { rune: [8, 25, 60], method: [5, 15, 36], solvent: [5, 15, 36] },
};

/** The solvents' numbers (design §6.3, P38). */
export const SOLVENT_TUNING = {
  /** Cinder: rounds a tile stays hot. */
  hotRounds: 2,
  /** Fog jar: steps weaker the neighbours are hit (push, damage; min 0). */
  fogWeaker: 1,
  /** Mortar: extra tiles every push goes. */
  mortarPush: 1,
  /** Chalk: extra tiles of network depth. */
  chalkReach: 1,
} as const;
