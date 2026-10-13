import type { EncounterDef } from './types';

const BASE: readonly Omit<EncounterDef, 'variants'>[] = [
  {
    id: 'three-rats',
    title: 'Three rats',
    depth: 1,
    layout: [
      '. . r . . .',
      '. . . . r .',
      'r . . . . .',
      '. . . . . .',
      '. . . . . .',
      '. . . . . .',
      '. D . . S .',
      '. . . . . .',
    ].join('\n'),
    loot: 'shallow',
    picks: 1,
    heart: false,
  },
  {
    id: 'rats-and-familiar',
    title: "A familiar's errand",
    depth: 2,
    layout: [
      '. f . . . .',
      '. . . . r .',
      '. o o . . .',
      '. . . . i .',
      'r . . . . .',
      '. . . . . .',
      '. . D . S .',
      '. . . . . .',
    ].join('\n'),
    loot: 'shallow',
    picks: 1,
    heart: false,
  },
  {
    id: 'sentry-post',
    title: 'The sentry post',
    depth: 3,
    layout: [
      '. . b . . .',
      '. . . . . r',
      '. o o o . .',
      '. o . o . .',
      'r . . . . .',
      '. . = . . .',
      '. D . . S .',
      '. . . . . .',
    ].join('\n'),
    loot: 'deep',
    picks: 1,
    heart: false,
  },
  {
    id: 'heart',
    title: 'Heart of the Seam',
    depth: 4,
    layout: [
      'b . . f . b',
      '. = . . = .',
      '. . @~ ~ . r',
      'r o o . . .',
      '. . . . @~ .',
      '. = . . . .',
      '. . D S . .',
      '. . . . . .',
    ].join('\n'),
    loot: 'heart',
    picks: 2,
    heart: true,
  },
];

/** W0 stub: one variant per depth (its current board). L1 adds two more per depth. */
export const ENCOUNTERS: readonly EncounterDef[] = BASE.map((e) => ({
  ...e,
  variants: [{ name: e.title, layout: e.layout }],
}));
