import type { VariantDef } from '../types';

/**
 * Batch `canals` (plan FN P8, CN-F3): the Timing runes Jar and Fuse. Margin lines `jar:unit`,
 * `jar:jar`, `fuse:unit`, `fuse:water`, two options at level I and two at level II, and a pair of
 * capstones each (docs/design/footnotes-content/canals.md §2). Pitch, Wick and Afterglow's
 * second capstone ship with CN-F4. Effects live in `engine/jars.ts`, `arrival.ts`, `solvents.ts`
 * and `bursts.ts`, keyed by these ids.
 */
export const CANALS: readonly VariantDef[] = [
  // ── Jar ──
  {
    id: 'jar-unit-kin',
    subject: 'jar',
    slot: { line: 'jar:unit', level: 1 },
    text: 'Your jar stays shut under you and your allies; only a foe opens it.',
  },
  {
    id: 'jar-unit-standing',
    subject: 'jar',
    slot: { line: 'jar:unit', level: 1 },
    text: 'A jar sealed under a standing unit opens on it at once, as if it had just stepped in.',
  },
  {
    id: 'jar-unit-pushed',
    subject: 'jar',
    slot: { line: 'jar:unit', level: 2 },
    text: 'A unit pushed, pulled or swapped onto your jar opens it facing the way it came; the rest takes that heading, not the seal’s.',
  },
  {
    id: 'jar-unit-slide',
    subject: 'jar',
    slot: { line: 'jar:unit', level: 2 },
    text: 'A unit sliding on oil stops on your jar, if it opens it, instead of sliding on past.',
  },
  {
    id: 'jar-jar-spill',
    subject: 'jar',
    slot: { line: 'jar:jar', level: 1 },
    text: 'A jar crumbled by your newer one opens instead, on whoever stands there or on the bare tile.',
  },
  {
    id: 'jar-jar-keep',
    subject: 'jar',
    slot: { line: 'jar:jar', level: 1 },
    text: 'At your limit a new jar fizzles instead: the old one stays and the new rest is lost (counted after a stack opens).',
  },
  {
    id: 'jar-jar-share',
    subject: 'jar',
    slot: { line: 'jar:jar', level: 2 },
    text: 'Your Fuses keep a limit of their own: one Jar and one Fuse can wait together.',
  },
  {
    id: 'jar-jar-stack',
    subject: 'jar',
    slot: { line: 'jar:jar', level: 2 },
    text: 'A jar sealed onto your own jar opens the old one first; the new one then waits in its place.',
  },
  {
    id: 'jar-cap-ring',
    subject: 'jar',
    slot: { capstone: true },
    text: 'When a unit opens your jar, the rest also acts on the first unit beside it.',
  },
  {
    id: 'jar-cap-reseal',
    subject: 'jar',
    slot: { capstone: true },
    text: 'When your jar opens, it also seals again once, with the same rest, for the next step.',
  },
  // ── Fuse ──
  {
    id: 'fuse-unit-follow',
    subject: 'fuse',
    slot: { line: 'fuse:unit', level: 1 },
    text: 'A Fuse sealed under a foe goes with that foe and opens at dusk wherever it stands.',
  },
  {
    id: 'fuse-unit-late',
    subject: 'fuse',
    slot: { line: 'fuse:unit', level: 1 },
    text: 'A Fuse waits one dusk longer before it opens.',
  },
  {
    id: 'fuse-unit-fire',
    subject: 'fuse',
    slot: { line: 'fuse:unit', level: 2 },
    text: 'Fire reaching your Fuse’s tile opens it at once, on whoever stands there.',
  },
  {
    id: 'fuse-unit-spare',
    subject: 'fuse',
    slot: { line: 'fuse:unit', level: 2 },
    text: 'A Fuse that would open under you or an ally waits for the next dusk instead.',
  },
  {
    id: 'fuse-water-slow',
    subject: 'fuse',
    slot: { line: 'fuse:water', level: 1 },
    text: 'Your Fuse floats only every other round.',
  },
  {
    id: 'fuse-water-swift',
    subject: 'fuse',
    slot: { line: 'fuse:water', level: 1 },
    text: 'Your Fuse floats two tiles downstream each round, stopping at land or a blocker.',
  },
  {
    id: 'fuse-water-wake',
    subject: 'fuse',
    slot: { line: 'fuse:water', level: 2 },
    text: 'A Fuse that floats under a unit opens on it at once, as a Jar would; a swift Fuse stops on the first unit.',
  },
  {
    id: 'fuse-water-heading',
    subject: 'fuse',
    slot: { line: 'fuse:water', level: 2 },
    text: 'A Fuse that has floated opens facing downstream; the rest takes the current’s heading.',
  },
  {
    id: 'fuse-cap-chain',
    subject: 'fuse',
    slot: { capstone: true },
    text: 'When your Fuse opens, any other jar beside it also opens, in reading order.',
  },
  {
    id: 'fuse-cap-reach',
    subject: 'fuse',
    slot: { capstone: true },
    text: 'When your Fuse opens on an empty tile, the rest also acts on the nearest unit within 2.',
  },
];
