import type { VariantDef } from '../types';

/**
 * Batch `canals` (plan FN P8, CN-F3): the Timing runes Jar and Fuse. Margin lines `jar:unit`,
 * `jar:jar`, `fuse:unit`, `fuse:water`, two options at level I and two at level II, and a pair of
 * capstones each (docs/design/footnotes-content/canals.md §2); CN-F4 adds the solvents Pitch
 * (`pitch:water`) and Wick (`wick:unit`) and Afterglow's second capstone (no margin rows: it has
 * no line yet, K5). Effects live in `engine/jars.ts`, `arrival.ts`, `solvents.ts`
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
  // ── Pitch ──
  {
    id: 'pitch-water-far',
    subject: 'pitch',
    slot: { line: 'pitch:water', level: 1 },
    text: 'A waiting Pitch invention drifts two tiles each round.',
  },
  {
    id: 'pitch-water-upstream',
    subject: 'pitch',
    slot: { line: 'pitch:water', level: 1 },
    text: 'A waiting Pitch invention drifts one tile upstream each round, against the current.',
  },
  {
    id: 'pitch-water-catch',
    subject: 'pitch',
    slot: { line: 'pitch:water', level: 2 },
    text: 'A drifting wait that floats onto a unit fixes on it, and acts on that unit wherever it goes; a far one fixes on the first unit of its two tiles.',
  },
  {
    id: 'pitch-water-wash',
    subject: 'pitch',
    slot: { line: 'pitch:water', level: 2 },
    text: 'A drifting wait carries its tile’s slick or cloud along with it.',
  },
  {
    id: 'pitch-cap-wake',
    subject: 'pitch',
    slot: { capstone: true },
    text: 'When a drifting wait acts, it also acts on the tile it last drifted from.',
  },
  {
    id: 'pitch-cap-shore',
    subject: 'pitch',
    slot: { capstone: true },
    text: 'When a drifting wait is stopped by a quay or a blocker, it also wakes at once.',
  },
  // ── Wick ──
  {
    id: 'wick-unit-long',
    subject: 'wick',
    slot: { line: 'wick:unit', level: 1 },
    text: 'Wick holds the invention two rounds, not one.',
  },
  {
    id: 'wick-unit-dusk',
    subject: 'wick',
    slot: { line: 'wick:unit', level: 1 },
    text: 'Wick acts at dusk of the same round, after the foes have moved, not at your next turn.',
  },
  {
    id: 'wick-unit-jar',
    subject: 'wick',
    slot: { line: 'wick:unit', level: 2 },
    text: 'A Wick invention that wakes on your jar’s tile opens the jar first, then acts.',
  },
  {
    id: 'wick-unit-proxy',
    subject: 'wick',
    slot: { line: 'wick:unit', level: 2 },
    text: 'A Wick whose caster is down when it wakes still acts, from where they fell.',
  },
  {
    id: 'wick-cap-twice',
    subject: 'wick',
    slot: { capstone: true },
    text: 'When a Wick invention wakes, it also acts once more at dusk of that round.',
  },
  {
    id: 'wick-cap-trip',
    subject: 'wick',
    slot: { capstone: true },
    text: 'When a foe steps beside a waiting Wick invention’s target, it also wakes at once.',
  },
  // ── Afterglow (the diagonal capstone is built in auras.ts) ──
  {
    id: 'afterglow-cap-plain',
    subject: 'afterglow',
    slot: { capstone: true },
    text: 'When a touching path lands a plain cloud, slick or plate, it also lasts 1 round longer.',
  },
];
