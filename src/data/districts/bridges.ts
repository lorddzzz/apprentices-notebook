import type { RecruitPages, RecruitPlacement } from '../recruits';
import type { EncounterVariant } from '../types';
import {
  BRIDGE_TABLE_IDS,
  BRIDGE_TOKENS,
  BRIDGE_TUNING,
  type BridgeTableId,
  type SpanKind,
} from './bridges/types';
import { WARDENS_PASS } from './canals';
import type { DistrictData, KitRoomDef } from './index';

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
  edge: 'drop', // bridge rooms only (P10); the Seam and canals keep their walls
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

// ── BR-7: the span choice (bridges-plan P1, P10, P11) ──

/** P11: the loot table a room offers from, by the span it was reached over (room 1 has none: sound). */
export const tableForSpan = (kind: SpanKind): BridgeTableId => `bridges:${kind}`;

/** Picks per room, 0-based (placeholder, like the bathhouses'; *tune by playing*). */
export const BRIDGE_PICKS: readonly number[] = [1, 1, 1, 2, 2];

/**
 * P10: the layout indices of room `next` that belong to a span kind. Rooms 1–3 hold sound layouts
 * first, then the crumbling ones; the heart (room 4) has one of each.
 */
export function spanVariantPool(next: number, kind: SpanKind): readonly number[] {
  const n = next >= BRIDGE_TUNING.rooms ? BRIDGE_TUNING.layouts.heart : BRIDGE_TUNING.layouts.mid;
  const first = kind === 'sound' ? 0 : n.sound;
  return Array.from({ length: n[kind] }, (_, i) => first + i);
}

/** P18: the mason's-ledger line on a span card, after room `after` (0-based). */
export const spanLedger = (after: number, kind: SpanKind): BridgeLedgerLine | undefined =>
  BRIDGES_LEDGER.find((l) => l.at.kind === 'span' && l.at.after === after && l.at.span === kind);

// ── BR-9: rooms 1 and 2 (bridges-plan P10, P12) ──
/**
 * Boards are authored compactly and expanded to board notation: `.` span, `#` pier, `_` fog, `P` a
 * start point (on a span), `j` Warden, `y` Gargoyle, `J` Mason (each on a span). Sound boards carry
 * `{span}` (2 stone); crumbling ones `{span:1}` (1 stone). Piers never wear, so crumbling boards
 * have one. Rules of thumb (*tune by playing*): every `P` is in the bottom rows, three or more
 * tiles from any foe; every board has a neck the party can cut and a pier-held floor to stand on.
 */
const BRIDGE_FOE_CELLS = new Set(['j', 'y', 'J']);
function bridgeBoard(rows: readonly string[], kind: SpanKind): string {
  const stone = kind === 'sound' ? '{span}' : '{span:1}';
  return rows
    .map((row) =>
      row
        .split(' ')
        .map((c) => {
          if (c === '_') return '_';
          if (c === '#') return '{pier}';
          if (c === '.') return stone;
          if (c === 'P' || BRIDGE_FOE_CELLS.has(c)) return c + stone;
          throw new Error(`bridge board: unknown cell "${c}"`);
        })
        .join(' '),
    )
    .join('\n');
}
const variant = (name: string, kind: SpanKind, rows: readonly string[]): EncounterVariant => ({
  name,
  layout: bridgeBoard(rows, kind),
});

/** Room 1: three sound boards, 6x9 to 7x9, a Warden with a Mason or a Gargoyle (no choice before it). */
const BRIDGE_1: readonly EncounterVariant[] = [
  variant('The first arch', 'sound', [
    '_ _ j . _ _',
    '_ . . . . _',
    '_ _ _ . _ _',
    '. . . . . _',
    '. # . . . .',
    '. . . J . .',
    '_ . . . . _',
    'P . P . # _',
    '. P . P . P',
  ]),
  variant('The long stair', 'sound', [
    '. . y . . _',
    '. . . . . _',
    '_ _ . _ _ _',
    '_ . . . _ _',
    '. . # . . _',
    '. . . . j .',
    '_ . . . . _',
    'P . P . . _',
    '. P . # P .',
  ]),
  variant('The broken run', 'sound', [
    '_ _ . . . _ _',
    '_ . . j . . _',
    '_ . . . . . _',
    '_ _ _ . _ _ _',
    '. . . . . . .',
    '. # . J . # .',
    '_ . . . . . _',
    'P . P . P . .',
    '. . . P . . .',
  ]),
];

/** Room 2, sound: a Warden, a Gargoyle and a Mason on 6x9 to 7x9 boards. */
const BRIDGE_2_SOUND: readonly EncounterVariant[] = [
  variant('The long arcade', 'sound', [
    '_ . . y . . _',
    '_ . j . . . _',
    '_ _ . _ . _ _',
    '. . . . . . .',
    '. # . . . # .',
    '. . . J . . .',
    '_ . . . . . _',
    'P . P . P . P',
    '_ P . . . P _',
  ]),
  variant('The two arches', 'sound', [
    '. . _ _ . .',
    '. j . _ . .',
    '. # . _ # y',
    '. . . _ . .',
    '_ . . J . _',
    '_ _ . . _ _',
    '. . . . . .',
    'P . P . P .',
    '. P . . . P',
  ]),
];

/** Room 2, crumbling: 5x7 to 6x7 boards with a single pier, thin stone and two foes. */
const BRIDGE_2_CRUMBLING: readonly EncounterVariant[] = [
  variant('The loose span', 'crumbling', [
    '_ . y . . _',
    '. . . . . _',
    '. # _ . j .',
    '. . . . . .',
    '_ . _ . _ .',
    'P . P . . P',
    '. P . . P .',
  ]),
  variant('The hanging stair', 'crumbling', [
    '_ . j . _',
    '_ . . . _',
    '. . _ J .',
    '. # . . .',
    '. . _ . .',
    'P . P . P',
    '. P . P .',
  ]),
];

const bridgeRoom = (
  id: string,
  title: string,
  depth: number,
  variants: readonly EncounterVariant[],
): KitRoomDef => ({
  id,
  title,
  depth,
  layout: variants[0]?.layout ?? '',
  variants,
  // The room's own table; the offers follow the span it was crossed by (`bridgeOffersFor`).
  loot: tableForSpan('sound'),
  picks: BRIDGE_PICKS[depth - 1] ?? 1,
  heart: false,
});

/** Rooms 1 and 2. Variant order is the pools': sound first, then crumbling (`spanVariantPool`). */
export const BRIDGE_ROOMS_12: readonly KitRoomDef[] = [
  bridgeRoom('bridges-1', 'The first arch', 1, BRIDGE_1),
  bridgeRoom('bridges-2', 'The lamp-house span', 2, [...BRIDGE_2_SOUND, ...BRIDGE_2_CRUMBLING]),
];

/** P12: rooms (0-based) whose offers hold Hold's page while the household lacks it and no warden has joined. */
export const HOLD_GUARANTEE_ROOMS: readonly number[] = [0, 1];

// Not wired into `BRIDGES_KIT.rooms` yet: the district stays roomless and `drawing` until it opens (BR-18).

// ── BR-10: rooms 3 and 4, the watchpost, the warden's card, the pushed page (P12, P13) ──

/** Room 3, sound: 7x9 and 6x9 boards, three foes on the first, a Mason on the second. */
const BRIDGE_3_SOUND: readonly EncounterVariant[] = [
  variant('The gatehouse span', 'sound', [
    '_ . . y . . _',
    '_ . j . . . _',
    '_ _ . _ . _ _',
    '. . . # . . .',
    '. . . J . . .',
    '_ . . . . . _',
    '_ . . . . . _',
    'P . P . . P .',
    '. P . . P . .',
  ]),
  variant('The chalk walk', 'sound', [
    '. . y . . _',
    '. . . . . _',
    '_ . . j . _',
    '_ _ . _ _ _',
    '. . . . . _',
    '. # . J . .',
    '_ . . . . _',
    'P . P . . P',
    '. P . # P .',
  ]),
];

/** Room 3, crumbling: a Gargoyle and a Warden, or a Warden and a Mason, on thin stone. */
const BRIDGE_3_CRUMBLING: readonly EncounterVariant[] = [
  variant("The sentry's stair", 'crumbling', [
    '_ . y . _',
    '. . . . _',
    '. # . j .',
    '. . _ . .',
    '_ . . . _',
    'P . P . P',
    '. P . P .',
  ]),
  variant('The lantern ledge', 'crumbling', [
    '. . j . . _',
    '. . . . _ _',
    '_ . J . . .',
    '. . . # . .',
    '. . _ . . _',
    'P . P . . P',
    '. P . . P .',
  ]),
];

/** Room 4, sound: all three of the staff on 7x9 and 6x9 boards. */
const BRIDGE_4_SOUND: readonly EncounterVariant[] = [
  variant('The tall arcade', 'sound', [
    '_ . y . . . _',
    '_ . . j . . _',
    '_ _ . _ . _ _',
    '. . . . . . .',
    '. # . . . # .',
    '. . . J . . .',
    '_ . . . . . _',
    'P . P . P . P',
    '_ P . . . P _',
  ]),
  variant('The split span', 'sound', [
    '. . j . y .',
    '. . . . . .',
    '. # . _ . .',
    '. . . _ . .',
    '_ . . J . _',
    '_ _ . . _ _',
    '. . . # . .',
    'P . P . P .',
    '. P . . . P',
  ]),
];

/** Room 4, crumbling: the deepest thin boards before the heart. */
const BRIDGE_4_CRUMBLING: readonly EncounterVariant[] = [
  variant('The thin arch', 'crumbling', [
    '. . y . .',
    '. . . . .',
    '_ . # . j',
    '. . . . .',
    '_ . . . _',
    'P . P . P',
    '. P . P .',
  ]),
  variant('The last ledge', 'crumbling', [
    '. . J . . _',
    '_ . . . j .',
    '. . # . . .',
    '. . _ . _ .',
    'P . P . . P',
    '. P . . P .',
  ]),
];

/** Rooms 3 and 4. Variant order is the pools': sound first, then crumbling (`spanVariantPool`). */
export const BRIDGE_ROOMS_34: readonly KitRoomDef[] = [
  bridgeRoom('bridges-3', 'The watchpost', 3, [...BRIDGE_3_SOUND, ...BRIDGE_3_CRUMBLING]),
  bridgeRoom('bridges-4', 'The tollhouse span', 4, [...BRIDGE_4_SOUND, ...BRIDGE_4_CRUMBLING]),
];

/**
 * P13 (party.md section 2, RC's P8): the defector warden's card sits in the watchpost, room 3
 * (0-based 2), whichever layout and span kind the seed picks. RC shows it once Hold is owned or
 * picked this trip; her Hold line shares `HOLD_GUARANTEE_ROOMS`, the same card as the district's
 * own Hold guarantee, so the two never add up to two cards.
 */
export const WARDEN_PLACEMENT: readonly RecruitPlacement[] = [{ apprentice: 'warden', room: 2 }];
export const WARDEN_PAGES: readonly RecruitPages[] = [
  { for: 'warden', runes: ['hold'], rooms: HOLD_GUARANTEE_ROOMS },
];
/** What BR-18 merges into `BRIDGES_KIT` when the district opens (`recruit`, `recruitPages`). */
export const BRIDGE_RECRUIT_KIT = {
  recruit: WARDEN_PLACEMENT,
  recruitPages: WARDEN_PAGES,
} as const;
/** The watchpost's scene line and her card copy (the card itself shows the registry's blurb). */
export const WATCHPOST_SCENE =
  'A watchpost on the span: a flask, a box of chalk, a stool turned to face the way out. One warden has stopped counting.';
export const WARDEN_CARD = {
  title: 'Defector warden',
  blurb: 'She chalks the line for you, and her Hold takes a second unit beside the first.',
} as const;

/** P12: rooms (0-based) whose offers hold the *pushed* page for a household that owns Bind. */
export const PUSHED_PAGE_ROOMS: readonly number[] = [2, 3];
