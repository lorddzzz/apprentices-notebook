import type { VariantDef } from '../types';

/**
 * Batch `cartographers` (cartographers plan CG-F3, CG-F4): the Board runes Swap, Draw and Erase, then
 * the solvents Quicksilver and Graphite. Texts are the approved spec in
 * docs/design/footnotes-content/cartographers.md (§2 to §4, as amended at CG-G3). Effects live in
 * `runes/actions.ts`, `solvents.ts` and `districts/cartographers/`, keyed by these ids. The
 * Registrar's note (`registrar:swap`) is registered with the rivals.
 */
export const CARTOGRAPHERS: readonly VariantDef[] = [
  // ── Swap ──
  {
    id: 'swap-held-around',
    subject: 'swap',
    slot: { line: 'swap:held', level: 1 },
    text: 'A Swap aimed at a held unit trades with the nearest unit beside it instead, the first unheld one in reading order.',
  },
  {
    id: 'swap-held-slip',
    subject: 'swap',
    slot: { line: 'swap:held', level: 1 },
    text: 'If you are held, your Swap still trades places, and your hold ends.',
  },
  {
    id: 'swap-held-ease',
    subject: 'swap',
    slot: { line: 'swap:held', level: 2 },
    text: 'A Swap that meets a hold lifts one turn off it.',
  },
  {
    id: 'swap-held-brace',
    subject: 'swap',
    slot: { line: 'swap:held', level: 2 },
    text: 'A Swap that meets a hold gives you 1 shield.',
  },
  {
    id: 'swap-unit-carry',
    subject: 'swap',
    slot: { line: 'swap:unit', level: 1 },
    text: 'A Swap trades the pencil too: each unit takes the pencil under it to its new tile, fate and all.',
  },
  {
    id: 'swap-unit-strand',
    subject: 'swap',
    slot: { line: 'swap:unit', level: 1 },
    text: 'A foe your Swap leaves standing on pencil cannot move until your next turn.',
  },
  {
    id: 'swap-unit-ink',
    subject: 'swap',
    slot: { line: 'swap:unit', level: 2 },
    text: 'The pencil you are left standing on by a Swap is inked in.',
  },
  {
    id: 'swap-unit-due',
    subject: 'swap',
    slot: { line: 'swap:unit', level: 2 },
    text: "Every pencil tile under a Swap's pair has its fate put off a round.",
  },
  {
    id: 'swap-cap-step',
    subject: 'swap',
    slot: { capstone: true },
    text: 'When a Swap finds nobody at its target, you step onto that tile instead, if it is empty paper within two tiles of you.',
  },
  {
    id: 'swap-cap-pact',
    subject: 'swap',
    slot: { capstone: true },
    text: 'When you Swap with a friend, you both gain 1 shield.',
  },
  // ── Draw ──
  {
    id: 'draw-jar-slide',
    subject: 'draw',
    slot: { line: 'draw:jar', level: 1 },
    text: 'A jar you Draw keeps going along the heading until the next tile holds a unit, a jar, blank paper or the edge.',
  },
  {
    id: 'draw-jar-quiet',
    subject: 'draw',
    slot: { line: 'draw:jar', level: 1 },
    text: 'A jar you Draw arrives quietly: it does not open on arrival, even under a unit.',
  },
  {
    id: 'draw-jar-trade',
    subject: 'draw',
    slot: { line: 'draw:jar', level: 2 },
    text: 'A jar you Draw onto another jar trades places with it.',
  },
  {
    id: 'draw-jar-claim',
    subject: 'draw',
    slot: { line: 'draw:jar', level: 2 },
    text: "A jar you Draw becomes yours: it keeps what is sealed in it, and your name replaces its owner's.",
  },
  {
    id: 'draw-drop-over',
    subject: 'draw',
    slot: { line: 'draw:drop', level: 1 },
    text: 'A Draw hops over one blank tile to the paper beyond it, if that tile is free.',
  },
  {
    id: 'draw-drop-mend',
    subject: 'draw',
    slot: { line: 'draw:drop', level: 1 },
    text: 'A Draw refused by blank paper pencils the blank tile in, bare and unplanned.',
  },
  {
    id: 'draw-drop-yield',
    subject: 'draw',
    slot: { line: 'draw:drop', level: 2 },
    text: 'A Draw refused by blank paper gives you 1 shield.',
  },
  {
    id: 'draw-drop-spend',
    subject: 'draw',
    slot: { line: 'draw:drop', level: 2 },
    text: 'A state or jar a Draw is refused at blank paper is spent: it is gone, and the tile is inked in as paper.',
  },
  {
    id: 'draw-cap-mix',
    subject: 'draw',
    slot: { capstone: true },
    text: 'When a Draw carries a state onto a tile that holds another state, the two mix as if you had landed it.',
  },
  {
    id: 'draw-cap-drag',
    subject: 'draw',
    slot: { capstone: true },
    text: 'When a Draw moves a state off a tile with a unit on it, the unit is drawn one tile along the heading too, if it is free.',
  },
  // ── Erase ──
  {
    id: 'erase-unit-trace',
    subject: 'erase',
    slot: { line: 'erase:unit', level: 1 },
    text: 'A tile you un-draw is not lost: it turns back to bare pencil, and whoever stood on it is still erased.',
  },
  {
    id: 'erase-unit-wide',
    subject: 'erase',
    slot: { line: 'erase:unit', level: 1 },
    text: 'An Erase on pencil also un-draws every pencil tile touching the first.',
  },
  {
    id: 'erase-unit-spare',
    subject: 'erase',
    slot: { line: 'erase:unit', level: 2 },
    text: 'A party member standing on pencil you un-draw is not erased: she is set down on the nearest paper tile instead.',
  },
  {
    id: 'erase-unit-sweep',
    subject: 'erase',
    slot: { line: 'erase:unit', level: 2 },
    text: 'The states and jars on the tiles beside an un-drawn tile are erased too.',
  },
  {
    id: 'erase-mark-clean',
    subject: 'erase',
    slot: { line: 'erase:mark', level: 1 },
    text: 'An Erase that lifts a mark also lifts the mark of every unit beside the target.',
  },
  {
    id: 'erase-mark-release',
    subject: 'erase',
    slot: { line: 'erase:mark', level: 1 },
    text: 'A mark you Erase is released as it goes: whatever it held happens, then it is spent.',
  },
  {
    id: 'erase-mark-ward',
    subject: 'erase',
    slot: { line: 'erase:mark', level: 2 },
    text: 'A friend whose mark you Erase gains 1 shield.',
  },
  {
    id: 'erase-mark-reset',
    subject: 'erase',
    slot: { line: 'erase:mark', level: 2 },
    text: 'A bound mark you Erase comes back as a plain mark, its action gone.',
  },
  {
    id: 'erase-cap-through',
    subject: 'erase',
    slot: { capstone: true },
    text: 'When an Erase finds nothing to take, it acts on the next tile along its heading.',
  },
  {
    id: 'erase-cap-salvage',
    subject: 'erase',
    slot: { capstone: true },
    text: 'When an Erase un-draws a tile, the state or jar on it is not erased but drawn to the nearest paper tile.',
  },
  // ── Quicksilver (solvent) ──
  {
    id: 'quicksilver-edge-turn',
    subject: 'quicksilver',
    slot: { line: 'quicksilver:edge', level: 1 },
    text: 'Quicksilver mirrors top to bottom instead of left to right.',
  },
  {
    id: 'quicksilver-edge-self',
    subject: 'quicksilver',
    slot: { line: 'quicksilver:edge', level: 1 },
    text: 'Quicksilver mirrors across you: the copy acts on the tile as far from you on the other side, if it is on the board.',
  },
  {
    id: 'quicksilver-edge-middle',
    subject: 'quicksilver',
    slot: { line: 'quicksilver:edge', level: 2 },
    text: 'A target that is its own mirror is acted on twice, not once.',
  },
  {
    id: 'quicksilver-edge-spare',
    subject: 'quicksilver',
    slot: { line: 'quicksilver:edge', level: 2 },
    text: 'The mirrored copy passes over your own party.',
  },
  {
    id: 'quicksilver-cap-rebound',
    subject: 'quicksilver',
    slot: { capstone: true },
    text: "When the copy would land on blank paper or off the board, it acts on the nearest paper tile on the mirror's side instead.",
  },
  {
    id: 'quicksilver-cap-ward',
    subject: 'quicksilver',
    slot: { capstone: true },
    text: 'When the copy would reach a party member, she gains 1 shield.',
  },
  // ── Graphite (solvent) ──
  {
    id: 'graphite-unit-late',
    subject: 'graphite',
    slot: { line: 'graphite:unit', level: 1 },
    text: 'Graphite waits one more round: it undoes at the start of your turn after next.',
  },
  {
    id: 'graphite-unit-stay',
    subject: 'graphite',
    slot: { line: 'graphite:unit', level: 1 },
    text: 'A unit whose home tile is taken when Graphite undoes its move stays where it is.',
  },
  {
    id: 'graphite-unit-redraw',
    subject: 'graphite',
    slot: { line: 'graphite:unit', level: 2 },
    text: 'Graphite also puts back paper the invention un-drew: the tile returns as bare pencil.',
  },
  {
    id: 'graphite-unit-shield',
    subject: 'graphite',
    slot: { line: 'graphite:unit', level: 2 },
    text: 'Each unit Graphite sets back on its home tile gains 1 shield.',
  },
  {
    id: 'graphite-cap-trace',
    subject: 'graphite',
    slot: { capstone: true },
    text: 'Graphite also undoes the marks and jars the invention placed.',
  },
  {
    id: 'graphite-cap-pin',
    subject: 'graphite',
    slot: { capstone: true },
    text: 'When Graphite sets a foe back on its home tile, the foe cannot move until your next turn.',
  },
];
