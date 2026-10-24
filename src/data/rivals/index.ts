import type { TokenEntry } from '../districts/index';
import { LAMPLIGHTER, LAMPLIGHTER_PAGE } from './lamplighter';
import type { RivalDef, RivalId, RivalPageDef, RivalPageId } from './types';

export type * from './types';

/** Every rival, by id. */
export const RIVALS: Readonly<Partial<Record<RivalId, RivalDef>>> = { lamplighter: LAMPLIGHTER };

/** Every recovered page, by id. */
export const RIVAL_PAGES: Readonly<Partial<Record<RivalPageId, RivalPageDef>>> = {
  [LAMPLIGHTER_PAGE.id]: LAMPLIGHTER_PAGE,
};

/**
 * Board tokens the rivals claim (P15), for the collision check beside `DISTRICT_TOKENS`. Claimed
 * now so no district or roster letter takes it before RV-1 makes it parse.
 */
export const RIVAL_TOKENS: readonly TokenEntry[] = [
  { token: 'L', kind: 'foe', id: 'lamplighter', district: 'canals' },
];
