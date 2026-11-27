import { parseLattice } from '$engine';
import type { Fixture } from '../fixtures';
import { fightSave, midProfile } from '../recipes';

/**
 * Pack-fix fixtures: two more fights on the canals' first board. Own file so no pack hand-merges
 * `fixtures.ts`; registered there with one spread. Built from engine calls only, like every recipe.
 */

export type FightExtraFixtureId = 'fight-lampwater-trio' | 'fight-multispell';

/** Pell's page with two separate spells: Bolt, Shove on the middle row and Bolt, Strike below it. */
const TWO_SPELLS = [
  '.     .   .     . .',
  'Bolt> Shove . . .',
  '.     .   .     . .',
  'Bolt> Strike . . .',
  'x     .   .     . x',
].join('\n');

export const FIGHT_EXTRA_FIXTURES: Record<FightExtraFixtureId, Fixture> = {
  'fight-lampwater-trio': {
    id: 'fight-lampwater-trio',
    route: 'trip',
    save: () => fightSave('canals', midProfile()),
    expect: 'end-turn',
    note: 'Lampwater (the canals), first fight at its real 5×9 board with all three seated members (Pell, Joost and the first recruit): idle, the party to move.',
  },
  'fight-multispell': {
    id: 'fight-multispell',
    route: 'trip',
    save: () => {
      const p = midProfile();
      return fightSave('canals', {
        ...p,
        lattices: { ...p.lattices, draughtsman: [...parseLattice(TWO_SPELLS).runes] },
      });
    },
    expect: 'end-turn',
    note: 'Lampwater first fight, three members, Pell holding two spells (Bolt→Shove and Bolt→Strike): the spell picker with more than one entry. Idle, the party to move.',
  },
};
