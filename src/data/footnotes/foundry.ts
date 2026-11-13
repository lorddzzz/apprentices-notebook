import type { VariantDef } from '../types';

/**
 * Batch `foundry` (bell-foundry plan BF-F2, BF-F3): the Resonance runes Toll, Coil and Unison,
 * then the solvents Rivet and Filings. Texts are the approved draft in
 * docs/design/footnotes-content/foundry.md (§2, §4). Effects live in `resolve.ts`, `bursts.ts`,
 * `runes/flow.ts`, `exposed.ts`, `schedule.ts`, `solvents.ts` and `districts/foundry/`, keyed by
 * these ids. Coil's diagonal capstone is built (`auras.ts`) and the Carillonneur's note
 * (`carillonneur:toll`) is registered with the rivals.
 */
export const FOUNDRY: readonly VariantDef[] = [
  // ── Toll: the bell (level I and II) ──
  {
    id: 'toll-bell-clappers',
    subject: 'toll',
    slot: { line: 'toll:bell', level: 1 },
    text: 'A Toll aimed at a bell also reaches every Clapper of its tone.',
  },
  {
    id: 'toll-bell-ringers',
    subject: 'toll',
    slot: { line: 'toll:bell', level: 1 },
    text: 'A Toll aimed at a bell also reaches every Ringer on a rope of its tone.',
  },
  {
    id: 'toll-bell-beside',
    subject: 'toll',
    slot: { line: 'toll:bell', level: 2 },
    text: 'A Toll aimed at a bell also reaches the units standing beside it.',
  },
  {
    id: 'toll-bell-next',
    subject: 'toll',
    slot: { line: 'toll:bell', level: 2 },
    text: 'A Toll aimed at a bell also strikes the nearest other bell of its tone, ties in reading order.',
  },
  // ── Toll: capstones ──
  {
    id: 'toll-cap-gap',
    subject: 'toll',
    slot: { capstone: true },
    text: 'A Toll also joins tiles of its state across a gap of one tile.',
  },
  {
    id: 'toll-cap-knell',
    subject: 'toll',
    slot: { capstone: true },
    text: "When a Toll's strike makes a bell ring, the units its pulses push are pushed one tile further.",
  },
  // ── Coil: the bell (level I and II) ──
  {
    id: 'coil-bell-strike',
    subject: 'coil',
    slot: { line: 'coil:bell', level: 1 },
    text: "A bell on Coil's extra tile is struck by the burst.",
  },
  {
    id: 'coil-bell-retune',
    subject: 'coil',
    slot: { line: 'coil:bell', level: 1 },
    text: "A bell on Coil's extra tile is retuned one tone up instead, and not struck.",
  },
  {
    id: 'coil-bell-pulse',
    subject: 'coil',
    slot: { line: 'coil:bell', level: 2 },
    text: 'A ring that a burst Coil widened caused pulses one tile further.',
  },
  {
    id: 'coil-bell-muffle',
    subject: 'coil',
    slot: { line: 'coil:bell', level: 2 },
    text: "A bell on Coil's extra tile takes a cloud for one round.",
  },
  // ── Coil: capstone (the diagonal is `coil-diagonal`, built) ──
  {
    id: 'coil-cap-surge',
    subject: 'coil',
    slot: { capstone: true },
    text: 'When a burst or conducted action Coil widened hits three or more units, its reach grows one tile further for that hit, once.',
  },
  // ── Unison: the bell (level I and II) ──
  {
    id: 'unison-bell-tone',
    subject: 'unison',
    slot: { line: 'unison:bell', level: 1 },
    text: 'A cast that landed on a bell counts for Unison on every bell of its tone.',
  },
  {
    id: 'unison-bell-beside',
    subject: 'unison',
    slot: { line: 'unison:bell', level: 1 },
    text: 'A cast that landed on a tile beside a bell counts for Unison on it.',
  },
  {
    id: 'unison-bell-lingers',
    subject: 'unison',
    slot: { line: 'unison:bell', level: 2 },
    text: 'A cast that landed on a bell still counts for Unison on it during your next turn.',
  },
  {
    id: 'unison-bell-hush',
    subject: 'unison',
    slot: { line: 'unison:bell', level: 2 },
    text: 'A ring that a passed Unison caused does not pulse your own party.',
  },
  // ── Unison: capstones ──
  {
    id: 'unison-cap-three',
    subject: 'unison',
    slot: { capstone: true },
    text: 'When two or more other apprentices signed the target, the rest acts twice.',
  },
  {
    id: 'unison-cap-share',
    subject: 'unison',
    slot: { capstone: true },
    text: 'When a Unison passes, each apprentice whose cast signed it gains 1 shield.',
  },
  // ── Rivet: the unit (level I and II) ──
  {
    id: 'rivet-unit-anvil',
    subject: 'rivet',
    slot: { line: 'rivet:unit', level: 1 },
    text: 'A unit you Rivet takes one more from every hit while it is held.',
  },
  {
    id: 'rivet-unit-spare',
    subject: 'rivet',
    slot: { line: 'rivet:unit', level: 1 },
    text: 'Rivet never holds your own party.',
  },
  {
    id: 'rivet-unit-strike',
    subject: 'rivet',
    slot: { line: 'rivet:unit', level: 2 },
    text: 'A Clapper you Rivet rings its tone as the Rivet lands.',
  },
  {
    id: 'rivet-unit-gag',
    subject: 'rivet',
    slot: { line: 'rivet:unit', level: 2 },
    text: 'A Ringer or Detuner you Rivet loses its next act.',
  },
  // ── Rivet: capstones ──
  {
    id: 'rivet-cap-pair',
    subject: 'rivet',
    slot: { capstone: true },
    text: 'When Rivet holds a unit that stands beside another unit, that unit is held too, once.',
  },
  {
    id: 'rivet-cap-lock',
    subject: 'rivet',
    slot: { capstone: true },
    text: 'When Rivet holds a unit beside a bell, that bell cannot be retuned until your next turn.',
  },
  // ── Filings: the bell (level I and II) ──
  {
    id: 'filings-bell-strike',
    subject: 'filings',
    slot: { line: 'filings:bell', level: 1 },
    text: "Filings' second run strikes the bell it comes back to, so it rings again.",
  },
  {
    id: 'filings-bell-follow',
    subject: 'filings',
    slot: { line: 'filings:bell', level: 1 },
    text: "Filings' second run follows the unit it reached: it hits the unit wherever it stands then.",
  },
  {
    id: 'filings-bell-brass',
    subject: 'filings',
    slot: { line: 'filings:bell', level: 2 },
    text: 'A bell counts as brass for Filings: it comes back to a bell with no brass beside it.',
  },
  {
    id: 'filings-bell-twice',
    subject: 'filings',
    slot: { line: 'filings:bell', level: 2 },
    text: 'Filings comes back at the start of each of your next two turns.',
  },
  // ── Filings: capstones ──
  {
    id: 'filings-cap-plate',
    subject: 'filings',
    slot: { capstone: true },
    text: 'When Filings comes back and no brass touches the target, a plate lands on its tile.',
  },
  {
    id: 'filings-cap-guard',
    subject: 'filings',
    slot: { capstone: true },
    text: 'When Filings comes back, you gain 1 shield.',
  },
];
