import type { ScenarioDef } from './types';

/**
 * Lab scenarios (deep link `#/lab?scenario=<id>`). Each demo replays to exactly `expected`
 * (tests/scenarios/lab.test.ts), so every scenario doubles as a regression test.
 * Spell keys are the source rune's lattice cell: `Bolt> Spark` → '0,0'.
 * The rune redesign's demos are written by S1; only the sandbox stays meanwhile.
 */
export const SCENARIOS: readonly ScenarioDef[] = [
  {
    id: 'sandbox',
    title: 'Sandbox',
    note: 'Two training dummies, a slick patch, a cloud and a brass plate. Your own lattices.',
    board: [
      '. . . . . .',
      '. d . . d .',
      '. . . . . .',
      '. . o o . .',
      '. ~ . . = .',
      '. . . . . .',
      '. D . . S .',
      '. . . . . .',
    ].join('\n'),
    demo: [],
    expected: [],
  },
];
