import type { TokenEntry } from '../districts/index';
import type { RivalDef, RivalId, RivalPageDef, RivalPageId } from './types';

export type * from './types';

/** Every rival, by id. Empty until RV-5 authors the Lamplighter. */
export const RIVALS: Readonly<Partial<Record<RivalId, RivalDef>>> = {
  // Fixture numbers (RV-1); RV-5 authors the real kit and routine.
  lamplighter: {
    id: 'lamplighter',
    name: 'Lamplighter',
    token: 'L',
    district: 'canals',
    hp: 6,
    move: 1,
    elite: true,
    habitat: 'any',
    blurb: 'A rival apprentice of the canals.',
    spells: [{ id: 'lantern', name: 'Lantern', lattice: 'Bolt> Ink', charges: 5 }],
    routine: [],
    trick: null,
    fallback: { damage: 1 },
    dryStrike: 'bite',
    page: null,
  },
};

/** Every recovered page, by id. Empty until RV-5. */
export const RIVAL_PAGES: Readonly<Partial<Record<RivalPageId, RivalPageDef>>> = {};

/**
 * Board tokens the rivals claim (P15), for the collision check beside `DISTRICT_TOKENS`. Claimed
 * now so no district or roster letter takes it before RV-1 makes it parse.
 */
export const RIVAL_TOKENS: readonly TokenEntry[] = [
  { token: 'L', kind: 'foe', id: 'lamplighter', district: 'canals' },
];
