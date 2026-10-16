import type { TierLevel } from '$engine/types';

/**
 * Words for Glyph mastery (design research-and-mastery §4.9, plan M13–M16). `{…}` slots are filled
 * by the profiler and must stay in the text; the profiler tests pin the exact wording.
 */
export const TIER_NAMES: Readonly<Record<TierLevel, string>> = {
  0: 'unproven',
  1: 'bronze',
  2: 'silver',
  3: 'gold',
};

/** One mark per tier, for the sheet header, the ranked list and shelf tiles. */
export const TIER_MARKS: Readonly<Record<TierLevel, string>> = {
  0: '○',
  1: '◔',
  2: '◑',
  3: '●',
};

export const METRIC_NAMES = { economy: 'Economy', reliability: 'Reliability' } as const;

/** The profiler's one-line suggestions (M13), in priority order. */
export const SUGGESTIONS = {
  deadCell: 'The {rune} on row {row} never fired in {casts} casts. Lifting it saves {ink} ink.',
  deadCellNoInk:
    'The {rune} on row {row} never fired in {casts} casts. Lifting it saves no ink but frees the rune.',
  closedTrigger: 'The {rune} ran but never opened.',
  idleCasts: '{idle} of the last {window} casts did nothing.',
} as const;

/** A tier-up highlight on the trip page (M16). */
export const TIER_UP_LINES = {
  economy: '{name} v{version} reached {tier} Economy.',
  reliability: '{name} v{version} reached {tier} Reliability.',
  extraExit: 'Pick its extra exit at the desk.',
  secondParam: 'It can leave a second cell open now.',
} as const;
