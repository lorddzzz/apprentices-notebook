import type { DistrictId, EnemyId, KindId } from '../types';
import type { DistrictKitData } from './index';

/**
 * The Seam's kit data. Its rooms, hearing and map still live in `src/data/districts.ts` until
 * DK-17 moves them here. Home is one step away after every room.
 */
export const SEAM_KIT: DistrictKitData = {
  id: 'seam',
  lean: { lean: 'ink', text: 'All five materials' },
  // The root of the map: the six districts branch up from it, its caption and the stair go below.
  map: { x: 50, y: 79, label: 'below' },
  ret: { kind: 'any' },
};

// ── The Marginalia (SM P2, P3; SM-1 builds it) ──────────
/** The five hands in cycle order, one per round (P2). */
export const MARGINALIA_HANDS: readonly KindId[] = ['ink', 'oil', 'steam', 'brass', 'spark'];
/** The heart's foe. Numbers tune by playing (Seam §2). */
export const MARGINALIA = {
  id: 'seam:marginalia',
  token: 'G',
  hp: 16,
  move: 0,
  /** Ink familiars the heart room opens with; they fall with it (P3). */
  familiars: 2,
} as const;

/** The Seam's deep rooms (P14): RC registers its guarantees here, after Conduct in the heart. */
export const SEAM_DEEP_ROOMS = ['sentry-post', 'heart'] as const;

// ── Hearing hints (SM P6; SM-5 authors the five lines) ──
/** One `???` line in the owner's margin on the map: the deed, never the district's name. */
export interface SeamHint {
  district: DistrictId;
  line: string;
}
/** One per district heard in the Seam, in map order. Empty until SM-5. */
export const SEAM_HINTS: readonly SeamHint[] = [];

// ── The lower Seam's floor format (SM P10; checked by `checkFloor`) ──
export interface FloorFormat {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  /** Three to place and a choice of spots. */
  minStarts: number;
  /** The Seam's own foes; an intrusion brings pieces and rules, never its district's foes. */
  foes: readonly EnemyId[];
}
export const FLOOR_FORMAT: FloorFormat = {
  minWidth: 6,
  maxWidth: 7,
  minHeight: 7,
  maxHeight: 9,
  minStarts: 5,
  foes: ['rat', 'sentry', 'familiar'],
};
