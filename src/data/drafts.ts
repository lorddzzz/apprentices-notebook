import { COLLECTION } from './folios/collection';
import { FOUNDRY_BELL } from './folios/foundry-bell';
import { LAMPLIGHTER } from './folios/lamplighter';
import { LEFT_HAND_FIRST } from './folios/left-hand-first';
import { WET_WORK } from './folios/wet-work';
import type { DraftDef } from './types';

/**
 * The owner's drafts (M29), as folios (BL-14): broken pages found in the Seam, in story order, one file each. Insides are lattice
 * ASCII in the Glyph's local frame (flow enters `entry` moving right); the engine shifts the entry
 * to (0,0). Fixes live in the tests only (tests/run/folios-*.test.ts guard every page, board, goal and tray).
 * Test boards are notation at most 7 x 5, the Draughtsman `D` at the left edge.
 */
export const DRAFTS: readonly DraftDef[] = [
  LAMPLIGHTER,
  COLLECTION,
  WET_WORK,
  LEFT_HAND_FIRST,
  FOUNDRY_BELL,
];

export const DRAFT_IDS: readonly string[] = DRAFTS.map((d) => d.id);
