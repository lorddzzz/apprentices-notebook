import type { VariantDef } from '../types';

/**
 * Batch `inkQuarter` (plan FN P8, IQ-F3–F5): the Contracts runes Sentence, Levy and Tally, then the
 * solvents Wax and Sand (IQ-F4) and the postmaster's note (IQ-F5). Texts are the approved draft in
 * docs/design/footnotes-content/inkQuarter.md (§7 review). Effects live in `runes/actions.ts`,
 * `runes/flow.ts`, `resolve.ts`, `marks.ts` and `solvents.ts`, keyed by these ids. Every "say so at
 * build" in the draft's Combos is a one-line comment at the engine site.
 */
export const INK_QUARTER: readonly VariantDef[] = [
  // ── Sentence: the mark (level I and II) ──
  {
    id: 'sentence-mark-release',
    subject: 'sentence',
    slot: { line: 'sentence:mark', level: 1 },
    text: 'The action a bound mark held is released on the unit as Sentence spends it, before the push.',
  },
  {
    id: 'sentence-mark-peel',
    subject: 'sentence',
    slot: { line: 'sentence:mark', level: 1 },
    text: 'A deep mark is only peeled: it drops to a plain mark and the unit is still pushed.',
  },
  {
    id: 'sentence-mark-held',
    subject: 'sentence',
    slot: { line: 'sentence:mark', level: 2 },
    text: 'A unit Sentence cannot move, held or sealed, keeps its mark.',
  },
  {
    id: 'sentence-mark-pass',
    subject: 'sentence',
    slot: { line: 'sentence:mark', level: 2 },
    text: 'When Sentence spends a mark whole, a plain mark lands on the nearest unmarked unit beside where the pushed unit ends.',
  },
  // ── Sentence: the bare unit (level I and II) ──
  {
    id: 'sentence-unit-nudge',
    subject: 'sentence',
    slot: { line: 'sentence:unit', level: 1 },
    text: 'Sentence on an unmarked unit still pushes it one tile, and spends nothing.',
  },
  {
    id: 'sentence-unit-serve',
    subject: 'sentence',
    slot: { line: 'sentence:unit', level: 1 },
    text: 'Sentence on an unmarked unit marks it plain instead of pushing.',
  },
  {
    id: 'sentence-unit-collar',
    subject: 'sentence',
    slot: { line: 'sentence:unit', level: 2 },
    text: 'A collared unit counts as marked: Sentence strikes the collar off and pushes the full two tiles.',
  },
  {
    id: 'sentence-unit-shield',
    subject: 'sentence',
    slot: { line: 'sentence:unit', level: 2 },
    text: 'A shielded unit counts as marked: Sentence strips the shield and pushes the full two tiles.',
  },
  // ── Sentence: capstone ──
  {
    id: 'sentence-cap-blot',
    subject: 'sentence',
    slot: { capstone: true },
    text: 'When Sentence spends a mark, the tile the unit was pushed from takes a blot.',
  },
  {
    id: 'sentence-cap-cosign',
    subject: 'sentence',
    slot: { capstone: true },
    text: 'When Sentence pushes a unit into another unit, the unit it hits is marked plain.',
  },
  // ── Levy: the mark (level I and II) ──
  {
    id: 'levy-mark-deep',
    subject: 'levy',
    slot: { line: 'levy:mark', level: 1 },
    text: 'A deep mark pays two shields, one for each spark it would have taken.',
  },
  {
    id: 'levy-mark-peel',
    subject: 'levy',
    slot: { line: 'levy:mark', level: 1 },
    text: 'A deep mark is only peeled to a plain one, and still pays a shield.',
  },
  {
    id: 'levy-mark-release',
    subject: 'levy',
    slot: { line: 'levy:mark', level: 2 },
    text: 'The action a bound mark held is released on its bearer as Levy spends it.',
  },
  {
    id: 'levy-mark-ward',
    subject: 'levy',
    slot: { line: 'levy:mark', level: 2 },
    text: 'The shield Levy gains lasts one round longer.',
  },
  // ── Levy: your own party (level I and II) ──
  {
    id: 'levy-member-self',
    subject: 'levy',
    slot: { line: 'levy:member', level: 1 },
    text: "Levy never takes your own mark, the caster's; your allies' marks still pay.",
  },
  {
    id: 'levy-member-share',
    subject: 'levy',
    slot: { line: 'levy:member', level: 1 },
    text: 'When Levy spends the mark of one of your party, that ally gains the shield instead of the caster.',
  },
  {
    id: 'levy-member-repay',
    subject: 'levy',
    slot: { line: 'levy:member', level: 2 },
    text: "An ally whose mark Levy spends also gains 1 shield, besides the caster's.",
  },
  {
    id: 'levy-member-near',
    subject: 'levy',
    slot: { line: 'levy:member', level: 2 },
    text: 'Levy also spends the mark of each of your party standing beside the caster, even outside its area.',
  },
  // ── Levy: capstone ──
  {
    id: 'levy-cap-bank',
    subject: 'levy',
    slot: { capstone: true },
    text: 'When Levy spends three or more marks in one cast, every member of your party gains 1 shield.',
  },
  {
    id: 'levy-cap-draw',
    subject: 'levy',
    slot: { capstone: true },
    text: "When Levy spends a foe's mark, that foe is also pulled one tile toward you.",
  },
  // ── Tally: the collar (level I and II) ──
  {
    id: 'tally-collar-twice',
    subject: 'tally',
    slot: { line: 'tally:collar', level: 1 },
    text: 'A collar counts twice: a collared unit alone passes.',
  },
  {
    id: 'tally-collar-shackle',
    subject: 'tally',
    slot: { line: 'tally:collar', level: 1 },
    text: 'A shackle counts twice, and a collar still counts once.',
  },
  {
    id: 'tally-collar-net',
    subject: 'tally',
    slot: { line: 'tally:collar', level: 2 },
    text: 'Each collared unit beside the target counts as one more thing, at most two.',
  },
  {
    id: 'tally-collar-spend',
    subject: 'tally',
    slot: { line: 'tally:collar', level: 2 },
    text: 'When a collar or a shackle carried Tally through, it is struck off the unit.',
  },
  // ── Tally: capstone ──
  {
    id: 'tally-cap-surplus',
    subject: 'tally',
    slot: { capstone: true },
    text: 'When Tally counts four or more things on a target, the rest acts on it twice.',
  },
  {
    id: 'tally-cap-refund',
    subject: 'tally',
    slot: { capstone: true },
    text: 'When Tally stops a cast on a target, a plain blot is left on its tile.',
  },
];
