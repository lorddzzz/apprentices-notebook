import type { VariantDef } from '../types';

/**
 * Footnote variants (P39): level I, two per line for Shove (wall, slick), Spark (slick) and Oil
 * (slick), plus unobstructed Bolt landing distance.
 */

/** The wall crush that skips the per-tile damage (push.ts resolves this id to its text). */
export const SHOVE_WALL_SOFT = 'shove-wall-soft';

/** Batch `seam-runes` (plan FN P8). FN-3 and FN-C1–C7 add to it. */
export const SEAM_RUNES: readonly VariantDef[] = [
  {
    id: 'bolt-empty-far',
    subject: 'bolt',
    slot: { line: 'bolt:empty', level: 1 },
    text: 'An unobstructed Bolt shot lands one tile farther, if that tile is clear.',
  },
  {
    id: 'bolt-empty-near',
    subject: 'bolt',
    slot: { line: 'bolt:empty', level: 1 },
    text: 'An unobstructed Bolt shot lands one tile nearer, without landing on its caster.',
  },
  {
    id: SHOVE_WALL_SOFT,
    subject: 'shove',
    slot: { line: 'shove:wall', level: 1 },
    text: 'A crush against a wall skips the damage for distance, so the pushed unit takes only 1.',
  },
  {
    id: 'shove-wall-heavy',
    subject: 'shove',
    slot: { line: 'shove:wall', level: 1 },
    text: 'A crush against a wall deals 1 more to the unit pushed into it.',
  },
  {
    id: 'shove-slick-far',
    subject: 'shove',
    slot: { line: 'shove:slick', level: 1 },
    text: 'A unit that slides on oil slides one tile further before it stops.',
  },
  {
    id: 'shove-slick-again',
    subject: 'shove',
    slot: { line: 'shove:slick', level: 1 },
    text: 'The oil a unit slides over stays slick for the round, so a second push can slide it again.',
  },
  {
    id: 'spark-slick-hot',
    subject: 'spark',
    slot: { line: 'spark:slick', level: 1 },
    text: 'Spark on oil lights it for 3 now instead of 2.',
  },
  {
    id: 'spark-slick-long',
    subject: 'spark',
    slot: { line: 'spark:slick', level: 1 },
    text: 'Spark on oil lights it, and the fire burns for 3 rounds instead of 2.',
  },
  {
    id: 'oil-slick-corners',
    subject: 'oil',
    slot: { line: 'oil:slick', level: 1 },
    text: 'Oil on a slick makes a pool that also covers the tiles diagonal to it.',
  },
  {
    id: 'oil-slick-short',
    subject: 'oil',
    slot: { line: 'oil:slick', level: 1 },
    text: 'Oil on a slick makes a pool that lasts one round less.',
  },
];
