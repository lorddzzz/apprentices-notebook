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
    id: 'spark-slick-smoke',
    subject: 'spark',
    slot: { line: 'spark:slick', level: 2 },
    text: 'Fire that burns out leaves a cloud on its tile.',
  },
  {
    id: 'spark-slick-soot',
    subject: 'spark',
    slot: { line: 'spark:slick', level: 2 },
    text: 'Fire that burns out leaves a blot on its tile.',
  },
  {
    id: 'spark-mark-wide',
    subject: 'spark',
    slot: { line: 'spark:mark', level: 1 },
    text: 'A detonation also deals 1 to each unit beside the marked one.',
  },
  {
    id: 'spark-mark-keep',
    subject: 'spark',
    slot: { line: 'spark:mark', level: 1 },
    text: 'A detonation deals 2, and the mark stays.',
  },
  {
    id: 'spark-mark-chain',
    subject: 'spark',
    slot: { line: 'spark:mark', level: 2 },
    text: 'A detonation in a cloud also detonates the spread copies of that mark in the same cloud.',
  },
  {
    id: 'spark-mark-blast',
    subject: 'spark',
    slot: { line: 'spark:mark', level: 2 },
    text: 'A detonation knocks the unit one tile along the heading.',
  },
  {
    id: 'spark-plate-focus',
    subject: 'spark',
    slot: { line: 'spark:plate', level: 1 },
    text: 'A conduct deals 3 to units standing on the brass and no longer reaches units only beside it.',
  },
  {
    id: 'spark-plate-spare',
    subject: 'spark',
    slot: { line: 'spark:plate', level: 1 },
    text: 'A conduct passes over your apprentices, but deals 1, not 2; a charge it leaves passes over them too.',
  },
  {
    id: 'spark-plate-jolt',
    subject: 'spark',
    slot: { line: 'spark:plate', level: 2 },
    text: "A unit a conduct hits is jolted one tile off the brass, along the spark's heading.",
  },
  {
    id: 'spark-plate-charge',
    subject: 'spark',
    slot: { line: 'spark:plate', level: 2 },
    text: 'Sparked brass stays charged for the round: the first unit to step onto or beside it takes 1.',
  },
  {
    id: 'ink-mark-overflow',
    subject: 'ink',
    slot: { line: 'ink:mark', level: 1 },
    text: 'Ink on a marked unit runs over: the nearest unmarked unit beside it is marked instead, and the first mark stays plain.',
  },
  {
    id: 'ink-mark-heavy',
    subject: 'ink',
    slot: { line: 'ink:mark', level: 1 },
    text: 'A deep-marked unit is too heavy to slide: pushed onto oil, it stops at once.',
  },
  {
    id: 'ink-mark-pass',
    subject: 'ink',
    slot: { line: 'ink:mark', level: 2 },
    text: 'When a Spark peels a deep mark, the plain mark left over jumps to the nearest unmarked unit beside it.',
  },
  {
    id: 'ink-mark-flare',
    subject: 'ink',
    slot: { line: 'ink:mark', level: 2 },
    text: 'When a Spark peels a deep mark, each unit beside it takes 1.',
  },
  {
    id: 'ink-stain-pushed',
    subject: 'ink',
    slot: { line: 'ink:stain', level: 1 },
    text: 'A stain also marks a unit pushed or slid across it, not only one that comes to rest on it.',
  },
  {
    id: 'ink-stain-wet',
    subject: 'ink',
    slot: { line: 'ink:stain', level: 1 },
    text: 'A stain marks a unit that walks across it, not only one that stops on it.',
  },
  {
    id: 'ink-stain-deepen',
    subject: 'ink',
    slot: { line: 'ink:stain', level: 2 },
    text: 'A stain deepens the mark of a marked unit that ends its move on it.',
  },
  {
    id: 'ink-stain-wick',
    subject: 'ink',
    slot: { line: 'ink:stain', level: 2 },
    text: 'Fire running along oil burns a stain as Inkfire, not as plain fire.',
  },
  {
    id: 'ink-spread-kin',
    subject: 'ink',
    slot: { line: 'ink:spread', level: 1 },
    text: "A spreading mark reaches only units on its bearer's side: a foe's mark spreads to foes, an ally's to allies.",
  },
  {
    id: 'ink-spread-seep',
    subject: 'ink',
    slot: { line: 'ink:spread', level: 1 },
    text: 'A spreading mark also reaches units standing beside the cloud.',
  },
  {
    id: 'ink-spread-brand',
    subject: 'ink',
    slot: { line: 'ink:spread', level: 2 },
    text: 'A cloud a mark spreads through becomes a brand cloud.',
  },
  {
    id: 'ink-spread-deep',
    subject: 'ink',
    slot: { line: 'ink:spread', level: 2 },
    text: 'A marked unit the spread reaches has its mark deepened.',
  },
  {
    id: 'oil-slick-lane',
    subject: 'oil',
    slot: { line: 'oil:slick', level: 2 },
    text: "A pool also reaches one more tile ahead along the spell's heading.",
  },
  {
    id: 'oil-slick-seep',
    subject: 'oil',
    slot: { line: 'oil:slick', level: 2 },
    text: "A pool's soak turns a neighbouring blot into a stain, not a slick.",
  },
  {
    id: 'oil-cloud-wide',
    subject: 'oil',
    slot: { line: 'oil:cloud', level: 1 },
    text: 'Oil on a cloud greases the whole connected cloud, not only its tile.',
  },
  {
    id: 'oil-cloud-long',
    subject: 'oil',
    slot: { line: 'oil:cloud', level: 1 },
    text: 'Grease fog lasts one round longer.',
  },
  {
    id: 'oil-cloud-drip',
    subject: 'oil',
    slot: { line: 'oil:cloud', level: 2 },
    text: 'Grease fog leaves a slick on each of its tiles when it fades.',
  },
  {
    id: 'oil-cloud-slip',
    subject: 'oil',
    slot: { line: 'oil:cloud', level: 2 },
    text: 'In grease fog, a unit that walks slides one tile on, as if pushed.',
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
    text: 'Oil on a slick makes a pool that lasts one round less, and each tile it clears from leaves a blot.',
  },
];
