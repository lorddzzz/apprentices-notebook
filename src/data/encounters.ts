import type { EncounterDef, EncounterVariant } from './types';

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
export const ENCOUNTERS: readonly EncounterDef[] = BASE.map((e) => ({
  ...e,
  layout: e.variants[0]?.layout ?? '',
}));
