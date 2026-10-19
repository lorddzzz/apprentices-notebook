import type { VariantDef } from './types';

/**
 * Footnote variants (P39): level I, two per line for Shove (wall, slick), Spark (slick) and Oil
 * (slick). Only `shove-wall-soft` changes behaviour so far (push.ts reads it); the rest are
 * follow-ups. Bolt has no fine-print rows yet, so it has no variants.
 */

/** The wall crush that skips the per-tile damage (push.ts resolves this id to its text). */
export const SHOVE_WALL_SOFT = 'shove-wall-soft';

export const VARIANTS: readonly VariantDef[] = [
  {
    id: SHOVE_WALL_SOFT,
    line: 'shove:wall',
    level: 1,
    text: 'A crush against a wall skips the damage for distance, so the pushed unit takes only 1.',
  },
  {
    id: 'shove-wall-heavy',
    line: 'shove:wall',
    level: 1,
    text: 'A crush against a wall deals 1 more to the unit pushed into it.',
  },
  {
    id: 'shove-slick-far',
    line: 'shove:slick',
    level: 1,
    text: 'A unit that slides on oil slides one tile further before it stops.',
  },
  {
    id: 'shove-slick-again',
    line: 'shove:slick',
    level: 1,
    text: 'The oil a unit slides over stays slick for the round, so a second push can slide it again.',
  },
  {
    id: 'spark-slick-hot',
    line: 'spark:slick',
    level: 1,
    text: 'Spark on oil lights it for 3 now instead of 2.',
  },
  {
    id: 'spark-slick-long',
    line: 'spark:slick',
    level: 1,
    text: 'Spark on oil lights it, and the fire burns for 3 rounds instead of 2.',
  },
  {
    id: 'oil-slick-corners',
    line: 'oil:slick',
    level: 1,
    text: 'Oil on a slick makes a pool that also covers the tiles diagonal to it.',
  },
  {
    id: 'oil-slick-short',
    line: 'oil:slick',
    level: 1,
    text: 'Oil on a slick makes a pool that lasts one round less.',
  },
];
