import type { DistrictId, EncounterDef, EncounterVariant, EnemyId, KindId } from '../types';
import type { DistrictData } from './index';

const board = (rows: readonly string[]): string => rows.join('\n');

/**
 * Each depth has three boards (plan S10); the trip seed picks one (`variantFor`) and the
 * Crossroads names it. Enemy counts and the difficulty band are the same across a depth's
 * variants: only the shape of the room changes.
 */
/**
 * Depth 1: a rat sits beside a start point, so turn 1 often shows a bite coming (best effort with
 * drawn start points, HC P9; CN/SM restore it when they re-lay the rooms).
 */
const DEPTH_1: readonly EncounterVariant[] = [
  {
    name: 'The lamplit landing',
    layout: board([
      '. . r . . .',
      '. . . . . .',
      'r . . . . .',
      '. . . . . .',
      'P . P . . .',
      '. . . . r .',
      '. P . . P .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The drainage cut',
    layout: board([
      'r . . . . r',
      '. . . . . .',
      '. i . . i .',
      '. . . . . .',
      '. . P . . .',
      'r . . . . .',
      'P . P . . P',
      '. . . . . .',
    ]),
  },
  {
    name: 'The coal chute',
    layout: board([
      '. . . r . .',
      'o o . . . =',
      'r . . . . .',
      '. . . . o .',
      '. . P . . .',
      '. . . . r .',
      'P . P . P .',
      '. . . . . .',
    ]),
  },
];

const DEPTH_2: readonly EncounterVariant[] = [
  {
    name: 'The oil cellar',
    layout: board([
      '. f . . . .',
      '. . . . r .',
      '. o o . . .',
      '. . . . i .',
      'r . P . . .',
      '. . . . . .',
      'P . P . P .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The scullery',
    layout: board([
      '. . . r . P',
      '. i . . . .',
      '. . . . . f',
      'o o . P . =',
      '. . . . . .',
      'r . . . i .',
      '. P . . P .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The flooded stair',
    layout: board([
      '. . . . f .',
      '. r . . . .',
      '. . ~ ~ P .',
      '. . . . . .',
      'P . o o . r',
      '. . . . . .',
      '. P . . P .',
      '. . . . . .',
    ]),
  },
];

const DEPTH_3: readonly EncounterVariant[] = [
  {
    name: 'The sentry post',
    layout: board([
      'P . b . . .',
      '. . . . . r',
      'o o o . . .',
      '. o . o . .',
      'r . . . . P',
      '. . = . . .',
      '. P . . P .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The brass gallery',
    layout: board([
      '. r . . . .',
      '. . . . . .',
      '. = . . . b',
      'P . o o . .',
      '. . o . . P',
      'r . . . = .',
      '. P . . P .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The boiler alley',
    layout: board([
      'b . . . . .',
      '. . . . . r',
      '. @~ P . o o',
      '. . . . . .',
      'r . o o . P',
      '. . . . = .',
      '. P . . P .',
      '. . . . . .',
    ]),
  },
];

const DEPTH_4: readonly EncounterVariant[] = [
  {
    name: 'Heart of the Seam',
    layout: board([
      'b . . f . b',
      '. = . . = .',
      '. = @~ ~ . r',
      'r o o . . .',
      '. . . . @~ .',
      '. = . . . .',
      'P . P P . P',
      '. . . . . .',
    ]),
  },
  {
    name: 'The furnace hall',
    layout: board([
      '. b . P . .',
      '. . . P . r',
      '@~ . . = . .',
      '. o o . . b',
      'r . . . @~ .',
      '. . = . f .',
      '. P . . P .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The old foundry',
    layout: board([
      '. . . f . .',
      'b . . . . b',
      '. . = ~ . r',
      '. . . . = .',
      'r . o o . .',
      '@~ . . . . @~',
      'P . P P . P',
      '. . . . . .',
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
/** The heart's foe. Numbers tune by playing (Seam §2). */
export const MARGINALIA = {
  id: 'seam:marginalia',
  token: 'G',
  hp: 16,
  move: 0,
  /** Ink familiars the heart room opens with; they fall with it (P3). */
  familiars: 2,
} as const;

/** The Seam's deep rooms (P14): RC registers its guarantees here, after Conduct in the heart. */
export const SEAM_DEEP_ROOMS = ['sentry-post', 'heart'] as const;

// ── Hearing hints (SM P6; SM-5 authors the five lines) ──
/** One `???` line in the owner's margin on the map: the deed, never the district's name. */
export interface SeamHint {
  district: DistrictId;
  line: string;
}
/** One per district heard in the Seam, in map order. Empty until SM-5. */
export const SEAM_HINTS: readonly SeamHint[] = [];

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
