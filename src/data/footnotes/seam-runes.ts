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
    id: 'bolt-empty-seek',
    subject: 'bolt',
    slot: { line: 'bolt:empty', level: 2 },
    text: "An unobstructed shot that ends beside a unit turns onto it; the spell keeps the shot's heading.",
  },
  {
    id: 'bolt-empty-settle',
    subject: 'bolt',
    slot: { line: 'bolt:empty', level: 2 },
    text: 'An unobstructed shot stops on the first tile holding a slick, blot or fire, and lands there; it is not moved farther or nearer.',
  },
  {
    id: 'bolt-cloud-through',
    subject: 'bolt',
    slot: { line: 'bolt:cloud', level: 1 },
    text: 'Bolt passes through the first cloud tile it meets and stops at what lies beyond.',
  },
  {
    id: 'bolt-cloud-find',
    subject: 'bolt',
    slot: { line: 'bolt:cloud', level: 1 },
    text: 'A Bolt stopped by a cloud finds the unit hidden in it and aims at the unit, not the tile.',
  },
  {
    id: 'bolt-cloud-cover',
    subject: 'bolt',
    slot: { line: 'bolt:cloud', level: 2 },
    text: 'A Bolt cast from inside a cloud is not stopped by the cloud it starts in.',
  },
  {
    id: 'bolt-cloud-clear',
    subject: 'bolt',
    slot: { line: 'bolt:cloud', level: 2 },
    text: 'A cloud that stops a Bolt thins: that tile clears once the spell ends.',
  },
  {
    id: SHOVE_WALL_SOFT,
    subject: 'shove',
    slot: { line: 'shove:wall', level: 1 },
    text: 'A crush against a wall skips the damage for distance, so the pushed unit takes only 1, but it wears the wall by two crushes.',
  },
  {
    id: 'shove-wall-heavy',
    subject: 'shove',
    slot: { line: 'shove:wall', level: 1 },
    text: 'A crush against a wall deals 1 more to the unit pushed into it.',
  },
  {
    id: 'shove-wall-ring',
    subject: 'shove',
    slot: { line: 'shove:wall', level: 2 },
    text: 'A unit crushed against a wall makes it ring: every other unit touching the wall is pushed one tile away, unharmed.',
  },
  {
    id: 'shove-wall-through',
    subject: 'shove',
    slot: { line: 'shove:wall', level: 2 },
    text: 'A unit crushed into a wall that breaks goes on into the tile behind it, if that tile is free.',
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
    id: 'shove-slick-carry',
    subject: 'shove',
    slot: { line: 'shove:slick', level: 2 },
    text: 'A sliding unit that hits another unit hands on the tiles it had left: the other one slides them, and neither is crushed.',
  },
  {
    id: 'shove-slick-smear',
    subject: 'shove',
    slot: { line: 'shove:slick', level: 2 },
    text: 'A unit that slides over a blot or stain picks up the ink and is marked.',
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
