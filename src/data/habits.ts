import type { HabitDef, HabitId } from './types';

/** Every habit (party.md §1). AH adds the seven new rows (AH P10) and a `rule` per habit (AH P9). */
export const HABITS: Readonly<Record<HabitId, HabitDef>> = {
  twoJars: { id: 'twoJars', line: 'Keeps two jars', kind: 'lattice', leansOn: 'jar' },
  forkAhead: {
    id: 'forkAhead',
    line: 'Forks also act on the tile ahead',
    kind: 'lattice',
    leansOn: 'fork',
  },
};
