import { BRIDGE_TABLE_IDS, BRIDGE_TOKENS } from './bridges/types';
import { WARDENS_PASS } from './canals';
import type { DistrictData } from './index';

/**
 * The bridges' kit data (district-bridges.md, Hearing): perform The Wall in the Seam. The rumour
 * of five trips stays. BR-0: still drawing and roomless, free return after any room (P11), the
 * staff's tokens and the span tables' ids. The edge stays `wall` until the first bridge room
 * exists (BR-1 flips it to `drop` with the rooms).
 */
export const BRIDGES_KIT: DistrictData = {
  id: 'bridges',
  name: 'The bridges',
  guild: 'The bridge-wardens',
  edge: 'wall',
  rooms: [],
  ret: { kind: 'any' },
  tokens: BRIDGE_TOKENS,
  tables: BRIDGE_TABLE_IDS,
  gate: { kind: 'drawing' },
  line: 'the edge is a door too',
  barred: 'The page is still being drawn.',
  lean: { lean: 'height', text: 'Height, the drop' },
  map: { x: 75, y: 43, label: 'above' },
  hear: [
    {
      kind: 'performed',
      idiom: 'theWall',
      district: 'seam',
      voice: 'owner',
      text: 'Stone holds because it was pushed against. The owner inks in the bridges.',
    },
    { kind: 'trips', atLeast: 5, voice: 'rumour' },
  ],
};

// ── BR-12: the gate, the hearing and the lore (bridges-plan P14, P15, P18) ──
// None of this is wired: `gate` stays `drawing` and `barred` keeps its text until BR-18 opens the
// district. The key gate is the canals' wardens' pass (CN P7), which BR owns as the bridges' gate;
// its table is still the canals' `canalDeep` until request R4 gives room 4 its own table.

/** P14: the key gate, offered after canal room 4, once the bridges are heard (CN-8 reads it). */
export const BRIDGES_PASS_GATE: Extract<import('./index').KitGate, { kind: 'key' }> = WARDENS_PASS;

/** P14: the map hint while the gate is shut: where to look (the canals' existing line). */
export const BRIDGES_KEY_HINT =
  'The bridge-wardens want a pass, and it is carried far down the canal.';

/** P14: the pass's card (the Loot screen's key card reads `title` and `text`). */
export const BRIDGES_PASS_CARD = {
  title: "The wardens' pass",
  text: 'Carry it home and the arches will bear your weight.',
} as const;

/** P15: the owner's line, performed The Wall in the Seam. */
const WALL_OWNER_LINE = 'Stone holds because it was pushed against. The owner inks in the bridges.';
/** P15: the rumour that reaches the city after five trips, before anyone has heard the owner. */
const WALL_RUMOUR_LINE =
  'Nobody in the Seam will say what the arches are for, only that the stone stands while someone leans on it.';

/** P15: the hearing with both lines. The trigger is the one DK-8 set; only the rumour gains a line. */
export const BRIDGES_HEARING: readonly import('./index').KitHearCondition[] = [
  { kind: 'performed', idiom: 'theWall', district: 'seam', voice: 'owner', text: WALL_OWNER_LINE },
  { kind: 'trips', atLeast: 5, voice: 'rumour', text: WALL_RUMOUR_LINE },
];

/**
 * P18: the mason's-ledger lines, as data. Eight are span cards at the Crossroads (two per landing,
 * after rooms 1–4, 0-based `after`); the watchpost, the Chief Warden's line and the heart's are
 * single. No save field: a codex is BL-41's call, so `papers` is not set.
 */
export type BridgeLedgerAt =
  | { kind: 'span'; after: number; span: import('./bridges/types').SpanKind }
  | { kind: 'watchpost' }
  | { kind: 'chief' }
  | { kind: 'heart' };
export interface BridgeLedgerLine {
  id: string;
  title: string;
  hand: string;
  text: string;
  at: BridgeLedgerAt;
}

const ledger = (
  id: string,
  title: string,
  hand: string,
  text: string,
  at: BridgeLedgerAt,
): BridgeLedgerLine => ({ id: `bridges:${id}`, title, hand, text, at });

export const BRIDGES_LEDGER: readonly BridgeLedgerLine[] = [
  ledger(
    'span-1-sound',
    'To the stair',
    'A mason',
    'Long span north from the first pier, cut to the width of a stair we were told was there. The ledger has a landing at the far end and a number for its steps. We have never seen the landing. The stone is square and the joints are true, which is more than the street manages.',
    { kind: 'span', after: 0, span: 'sound' },
  ),
  ledger(
    'span-1-crumbling',
    'Three piers, one leaning',
    'A mason',
    'Short span with three piers, the middle one out of plumb. It reaches a gate set in a wall that is on no plan of the city. Mind the last stones: they were set for a crossing, not for a weight, and the crossing was never finished.',
    { kind: 'span', after: 0, span: 'crumbling' },
  ),
  ledger(
    'span-2-sound',
    'Toward the lamp-houses',
    'A mason',
    'The lamp-houses are across the water, the foreman says, and the water is on the near side. We counted the arches twice and got two numbers. The span is laid to the number that was paid for, which is the one written here.',
    { kind: 'span', after: 1, span: 'sound' },
  ),
  ledger(
    'span-2-crumbling',
    'The square with the fountain',
    'A mason',
    'A short span to a square where the fountain runs. None of us has been to the square. We have been paid for the water, and the water arrives at the foot of the last pier every morning, cold and without a source.',
    { kind: 'span', after: 1, span: 'crumbling' },
  ),
  ledger(
    'span-3-sound',
    'The bell-tower',
    'A mason',
    'Long span to a bell-tower with no bell in it. We set the last pier on a Tuesday and on the Wednesday the tower was standing at the end of the span, as if it had only been waiting for the stone. The ringers have not come down to complain.',
    { kind: 'span', after: 2, span: 'sound' },
  ),
  ledger(
    'span-3-crumbling',
    'Only the one pier',
    'A mason',
    'A crumbling span with one pier to spare, which is the minimum the wardens allow. It carries nothing a mason would sign for. We set it toward the Seam because the drawing asked us to, and the drawing has since asked us to stop.',
    { kind: 'span', after: 2, span: 'crumbling' },
  ),
  ledger(
    'span-4-sound',
    'The far side of the arch',
    'A mason',
    'Long span to the far side of the great arch. The keystone is the last stone we cut on this run and the first we would cut again. The span holds as long as someone is standing at the join, and no one has been able to tell us who is meant to stand there.',
    { kind: 'span', after: 3, span: 'sound' },
  ),
  ledger(
    'span-4-crumbling',
    'Toward the Seam',
    'A mason',
    'Short span with a pier to spare, laid toward the Seam as the drawing directs. It carries no load we could name. The last entry in this book is a measurement of the gap, to the width of one more street, and a note that the drawing will carry it the rest of the way.',
    { kind: 'span', after: 3, span: 'crumbling' },
  ),
  ledger(
    'watchpost',
    'The watchpost',
    'A warden',
    'The warden in the watchpost keeps a flask and a box of chalk. He says the spans are safe because he counts them every morning. He has not counted them since the join, and he says the count comes out the same whether he does or not.',
    { kind: 'watchpost' },
  ),
  ledger(
    'chief',
    'The keystone',
    'The Chief Warden',
    "The keystone is the arch's whole argument. Whoever takes it away should be ready to walk the rest of the way on foot. I have chalked my name on it. It is the only stone in the city that answers when it is pushed.",
    { kind: 'chief' },
  ),
  ledger(
    'heart',
    'The join',
    'The span guild',
    'The span guild abandoned the join, and its last entries run toward the Seam. The guild is gone from the rolls; the spans are not. Whoever comes after us should know that the stone was cut to meet something, and that the meeting was never recorded.',
    { kind: 'heart' },
  ),
];

Object.assign(BRIDGES_KIT, { hear: BRIDGES_HEARING });
