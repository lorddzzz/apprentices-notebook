import type { HabitDef, HabitId } from './types';

/**
 * Every habit (party.md §1–§2, AH P9–P10), keyed by id, never by apprentice: any apprentice, the
 * Lab or a rival (`EnemyDef.trick`) can carry one. `rule` holds only the field the habit bends.
 * `mender` is reserved for EN.
 */
export const HABITS: Readonly<Record<HabitId, HabitDef>> = {
  twoJars: {
    id: 'twoJars',
    line: 'Keeps two jars',
    kind: 'lattice',
    leansOn: 'jar',
    rule: { jarLimit: 2 },
  },
  forkAhead: {
    id: 'forkAhead',
    line: 'Forks also act on the tile ahead',
    kind: 'lattice',
    leansOn: 'fork',
    rule: { forkAhead: true },
  },
  fuseOnStep: {
    id: 'fuseOnStep',
    line: 'Own Fuse jars also open on a step',
    kind: 'body',
    leansOn: 'fuse',
    rule: { fuseOnStep: true },
  },
  markTwice: {
    id: 'markTwice',
    line: 'A mark counts twice in Tally',
    kind: 'lattice',
    leansOn: 'tally',
    rule: { tallyMarkWeight: 2 },
  },
  steamproof: {
    id: 'steamproof',
    line: 'Steam never hurts',
    kind: 'body',
    leansOn: null,
    rule: { wards: ['steam'] },
  },
  holdTwo: {
    id: 'holdTwo',
    line: 'Hold also holds one unit beside the target',
    kind: 'lattice',
    leansOn: 'hold',
    rule: { holdExtra: 1 },
  },
  nearUnison: {
    id: 'nearUnison',
    line: 'Unison also passes for a cast beside the target',
    kind: 'lattice',
    leansOn: 'unison',
    rule: { unisonReach: 1 },
  },
  longTouch: {
    id: 'longTouch',
    line: 'Touch reaches two tiles away',
    kind: 'lattice',
    leansOn: 'touch',
    rule: { touchReach: 2 },
  },
  restoreErase: {
    id: 'restoreErase',
    line: 'Erase puts back what the last Erase took',
    kind: 'lattice',
    leansOn: 'erase',
    rule: { eraseRestores: true },
  },
};

/** HABIT_IDS in table order (the pair's two, then the recruits' seven). */
export const HABIT_IDS = Object.keys(HABITS) as HabitId[];
