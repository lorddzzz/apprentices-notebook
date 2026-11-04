import type {
  DistrictId,
  EncounterDef,
  EncounterVariant,
  EnemyDef,
  EnemyId,
  KindId,
} from '../types';
import type { DistrictData } from './index';

const board = (rows: readonly string[]): string => rows.join('\n');

/**
 * Each depth has three boards (plan S10); the trip seed picks one (`variantFor`) and the
 * Crossroads names it. Foe counts are the same across a depth's variants: only the shape of the
 * room changes. SM-3 re-laid them at per-place sizes, tuned for two (Seam §1 "Re-laying"):
 * room 1 tight (5×6, 6×6), room 2 6×7, room 3 6×8 and 7×8, the heart 7×8. Every variant of a
 * depth carries the same hearing setups (SM P4), and no start point sits beside a foe except for
 * the depth-1 bite.
 */
/**
 * Depth 1: every start point is beside exactly one rat, so turn 1 always shows a bite coming (the
 * strict turn-1 bite, HC P9). Setups: a line of three oils ending at the wall, and plates
 * (fire on 3+ oil, The Wall, cross debt).
 */
const DEPTH_1: readonly EncounterVariant[] = [
  {
    name: 'The lamplit landing',
    layout: board(['o o o . .', '. = . r P', '. . . . .', 'P r . = .', '. . i . .', '. P r P .']),
  },
  {
    name: 'The drainage cut',
    layout: board([
      'r P . . . .',
      '. . . = . .',
      '. . i . . P',
      'o o o . . r',
      '. . = . . P',
      'P r . . . .',
    ]),
  },
  {
    name: 'The coal chute',
    layout: board([
      '. . = . P .',
      'P r . . r .',
      '. P . . . .',
      '. = . . . o',
      '. . r . . o',
      '. . P . . o',
    ]),
  },
];

/**
 * Depth 2: a line of three oils, a vent's cloud and a short plate run (fire, Storm on 3,
 * conducted on 3, cross debt).
 */
const DEPTH_2: readonly EncounterVariant[] = [
  {
    name: 'The oil cellar',
    layout: board([
      '. f . . . .',
      '. . . . r .',
      'o o o . . .',
      '. . @~ @~ @~ i',
      'r . . . . .',
      '. = = . P .',
      'P . . P . P',
    ]),
  },
  {
    name: 'The scullery',
    layout: board([
      '. . . r . .',
      '. i . . . f',
      'P . @~ @~ . .',
      '. . @~ . o .',
      'r . = = o .',
      '. . . . o .',
      '. P . P . P',
    ]),
  },
  {
    name: 'The flooded stair',
    layout: board([
      '. . . . f .',
      '. r . . . .',
      '. . @~ @~ @~ .',
      'P . . . . P',
      '. o o o . .',
      '. . . = = r',
      'P . P . . .',
    ]),
  },
];

/** Depth 3: plates and a vent (Storm, conducted, The Wall); no start point in the sentry's line. */
const DEPTH_3: readonly EncounterVariant[] = [
  {
    name: 'The sentry post',
    layout: board([
      '. . b . . .',
      '. . . . . r',
      'o o . . = =',
      '. . @~ . . .',
      'r . @~ @~ . P',
      '. . = . . .',
      '. P . . P .',
      'P . . . . .',
    ]),
  },
  {
    name: 'The brass gallery',
    layout: board([
      '. r . . . . b',
      '. . . . . . .',
      '. = = = . . .',
      'P . . . . o o',
      '. @~ @~ @~ . . .',
      'r . . . . P .',
      '. . . = . . .',
      '. P . . P . .',
    ]),
  },
  {
    name: 'The boiler alley',
    layout: board([
      'b . . . . . .',
      '. . . . . r .',
      '. . @~ @~ . o o',
      '. . @~ . . . P',
      '. = = r . . .',
      '. . . . . . .',
      '. . P . . . .',
      '. . . . P . P',
    ]),
  },
];

/**
 * The heart: the Marginalia (`G`) and its two ink familiars (SM P3), with plates, vents and oil
 * for the hands to mix with. Five start points, none beside a foe.
 */
const DEPTH_4: readonly EncounterVariant[] = [
  {
    name: 'Heart of the Seam',
    layout: board([
      '. . . G . . .',
      '. f . . . f .',
      '. = . @~ . = .',
      '. . . . . . .',
      'o o . . . o o',
      '. . = . = . .',
      'P . . P . . P',
      '. . P . P . .',
    ]),
  },
  {
    name: 'The furnace hall',
    layout: board([
      '@~ . . . . . .',
      '. . . G . . .',
      '. f . = . f .',
      '. . . = . . .',
      'o o . . . . @~',
      '. . . . = . .',
      '. P . . . P .',
      'P . . P . . P',
    ]),
  },
  {
    name: 'The old foundry',
    layout: board([
      '. . . . . . .',
      '. f . . . . .',
      '. . = G = . .',
      '@~ . . . . f @~',
      '. . o o o . .',
      '. = . . . = .',
      'P . . P . . P',
      '. . P . . P .',
    ]),
  },
];

const BASE: readonly (Omit<EncounterDef, 'layout' | 'variants'> & {
  variants: readonly EncounterVariant[];
})[] = [
  {
    id: 'three-rats',
    title: 'Three rats',
    depth: 1,
    variants: DEPTH_1,
    loot: 'shallow',
    picks: 1,
    heart: false,
  },
  {
    id: 'rats-and-familiar',
    title: "A familiar's errand",
    depth: 2,
    variants: DEPTH_2,
    loot: 'shallow',
    picks: 1,
    heart: false,
  },
  {
    id: 'sentry-post',
    title: 'The sentry post',
    depth: 3,
    variants: DEPTH_3,
    loot: 'deep',
    picks: 1,
    heart: false,
  },
  {
    id: 'heart',
    title: 'Heart of the Seam',
    depth: 4,
    variants: DEPTH_4,
    loot: 'heart',
    picks: 2,
    heart: true,
  },
];

/** `layout` is the first variant's board: the original one. */
export const SEAM_ROOMS: readonly EncounterDef[] = BASE.map((e) => ({
  ...e,
  layout: e.variants[0]?.layout ?? '',
}));

/**
 * The Seam's data (K-1): its four rooms, the map root. Home is one step away after every room.
 */
export const SEAM_KIT: DistrictData = {
  id: 'seam',
  name: 'The Seam',
  guild: "No guild: the owner's drawing",
  edge: 'wall',
  rooms: SEAM_ROOMS,
  hear: [],
  gate: { kind: 'none' },
  line: 'Where the notebook was found.',
  barred: '',
  lean: { lean: 'ink', text: 'All five materials' },
  // The root of the map: the six districts branch up from it, its caption and the stair go below.
  map: { x: 50, y: 79, label: 'below' },
  ret: { kind: 'any' },
};

// ── The Marginalia (SM P2, P3; SM-1 builds it) ──────────
/** The five hands in cycle order, one per round (P2). */
export const MARGINALIA_HANDS: readonly KindId[] = ['ink', 'oil', 'steam', 'brass', 'spark'];
/** The Marginalia's numbers (P2, P3). They tune by playing (Seam §2). */
export const MARGINALIA_TUNING = {
  /** Ink familiars the heart room opens with (SM-3 places them); they fall with it (P3). */
  familiars: 2,
  /** A hand covers this many tiles each side of its centre, in a row: 1 = three tiles. */
  reach: 1,
} as const;

/**
 * The Seam's heart (SM P2, P3): the owner's leftover familiars gathered into one figure. One tile,
 * never moves (anchored), a script of five hands cycled by round (`seam:write:<kind>`, one kind
 * each). Its `behaviour` carries only the death hook: its familiars fall with it. Not a stand-in:
 * it is the heart itself.
 */
export const MARGINALIA: EnemyDef = {
  id: 'marginalia',
  name: 'marginalia',
  token: 'G',
  hp: 16,
  move: 0,
  attack: null,
  ai: 'idle',
  behaviour: 'seam:marginalia',
  script: {
    steps: MARGINALIA_HANDS.map((k) => `seam:write:${k}` as const),
    standIn: false,
  },
  brass: false,
  oilTrail: false,
  elite: true,
  blurb:
    "The notebook's margins, come alive. Each round one of its five hands writes a kind across three tiles by the nearest apprentice: a mark, a slick, a cloud, a plate, then a spark.",
  habitat: 'any',
  flies: false,
  anchored: true,
  snuffs: false,
  bursts: false,
  boss: true,
};

export const SEAM_ENEMIES = { marginalia: MARGINALIA } as const;

/** The Seam's deep rooms (P14): RC registers its guarantees here, after Conduct in the heart. */
export const SEAM_DEEP_ROOMS = ['sentry-post', 'heart'] as const;

// ── Hearing hints (SM P6; SM-5 authors the five lines) ──
/** One `???` line in the owner's margin on the map: the deed, never the district's name. */
export interface SeamHint {
  district: DistrictId;
  line: string;
}
/**
 * One per district heard in the Seam, in map order: the deed, never the place. A line retires once
 * its district is heard (the map then carries that district's own line).
 */
export const SEAM_HINTS: readonly SeamHint[] = [
  { district: 'canals', line: 'Three oils burning at once, and the water answers.' },
  { district: 'inkQuarter', line: 'One hand makes the mark; another hand comes to collect.' },
  { district: 'bathhouses', line: 'Three of you in one storm, and the air keeps count.' },
  { district: 'bridges', line: 'Set a stone upright and lean on it until it holds.' },
  { district: 'foundry', line: 'A note struck once and carried to three, each ringing.' },
];

// ── The lower Seam's floor format (SM P10; checked by `checkFloor`) ──
export interface FloorFormat {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  /** Three to place and a choice of spots. */
  minStarts: number;
  /** The Seam's own foes; an intrusion brings pieces and rules, never its district's foes. */
  foes: readonly EnemyId[];
}
export const FLOOR_FORMAT: FloorFormat = {
  minWidth: 6,
  maxWidth: 7,
  minHeight: 7,
  maxHeight: 9,
  minStarts: 5,
  foes: ['rat', 'sentry', 'familiar'],
};
