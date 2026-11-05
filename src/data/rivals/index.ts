import type { TokenEntry } from '../districts/index';
import { LAMPLIGHTER, LAMPLIGHTER_PAGE } from './lamplighter';
import { POSTMASTER_PAGE, POSTMASTER_RIVAL } from './postmaster';
import type { RivalDef, RivalId, RivalPageDef, RivalPageId } from './types';

export type * from './types';

/** Every rival, by id. */
export const RIVALS: Readonly<Partial<Record<RivalId, RivalDef>>> = {
  lamplighter: LAMPLIGHTER,
  postmaster: POSTMASTER_RIVAL,
};

/** Every recovered page, by id. */
export const RIVAL_PAGES: Readonly<Partial<Record<RivalPageId, RivalPageDef>>> = {
  [LAMPLIGHTER_PAGE.id]: LAMPLIGHTER_PAGE,
  [POSTMASTER_PAGE.id]: POSTMASTER_PAGE,
};

/**
 * Board tokens the rivals claim (P15), for the collision check beside `DISTRICT_TOKENS`. Each
 * rival's `ENEMIES` shell carries the same token (the collision tests skip the shells).
 */
export const RIVAL_TOKENS: readonly TokenEntry[] = [
  { token: 'L', kind: 'foe', id: 'lamplighter', district: 'canals' },
  { token: 'p', kind: 'foe', id: 'postmaster', district: 'inkQuarter' },
];
