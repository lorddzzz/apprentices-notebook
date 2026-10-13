import type { EncounterDef, EncounterVariant } from './types';

const board = (rows: readonly string[]): string => rows.join('\n');

/**
 * Each depth has three boards (plan S10); the trip seed picks one (`variantFor`) and the
 * Crossroads names it. Enemy counts and the difficulty band are the same across a depth's
 * variants: only the shape of the room changes.
 */
const DEPTH_1: readonly EncounterVariant[] = [
  {
    name: 'The lamplit landing',
    // One rat starts beside the Stoker, so turn 1 already shows a bite coming.
    layout: board([
      '. . r . . .',
      '. . . . . .',
      'r . . . . .',
      '. . . . . .',
      '. . . . . .',
      '. . . . r .',
      '. D . . S .',
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
      '. . r . . .',
      '. . . . . .',
      'D . . . . S',
      '. . . . . .',
    ]),
  },
  {
    name: 'The coal chute',
    layout: board([
      '. . . r . .',
      '. o o . . .',
      'r . . . . .',
      '. . . . o .',
      '. . . . . r',
      '. . . . . .',
      '. . D . S .',
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
      'r . . . . .',
      '. . . . . .',
      '. . D . S .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The scullery',
    layout: board([
      '. . . r . .',
      '. i . . . .',
      '. . . . . f',
      'o o . . . .',
      '. . . . . .',
      'r . . . i .',
      '. D . . S .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The flooded stair',
    layout: board([
      '. . . . f .',
      '. r . . . .',
      '. . ~ ~ . .',
      '. . . . . .',
      '. . o o . r',
      '. . . . . .',
      '. D . . S .',
      '. . . . . .',
    ]),
  },
];

const DEPTH_3: readonly EncounterVariant[] = [
  {
    name: 'The sentry post',
    layout: board([
      '. . b . . .',
      '. . . . . r',
      '. o o o . .',
      '. o . o . .',
      'r . . . . .',
      '. . = . . .',
      '. D . . S .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The brass gallery',
    layout: board([
      '. r . . . .',
      '. . . . . .',
      '. = . . . b',
      '. . o o . .',
      '. . o . . .',
      'r . . . = .',
      '. D . . S .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The boiler alley',
    layout: board([
      'b . . . . .',
      '. . . . . r',
      '. @~ . . o o',
      '. . . . . .',
      'r . o o . .',
      '. . . . = .',
      '. D . . S .',
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
      '. . @~ ~ . r',
      'r o o . . .',
      '. . . . @~ .',
      '. = . . . .',
      '. . D S . .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The furnace hall',
    layout: board([
      '. b . . . .',
      '. . . . . r',
      '@~ . . = . .',
      '. o o . . b',
      'r . . . @~ .',
      '. . = . f .',
      '. D . . S .',
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
      '. . D S . .',
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
