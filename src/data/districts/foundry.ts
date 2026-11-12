import type { KitId } from '$engine/districts/types';
import type { RecruitPages, RecruitPlacement } from '../recruits';
import type { EncounterVariant, LootEntry, LootTableDef, RuneId, SolventId } from '../types';
import type {
  BonusObjective,
  DistrictData,
  KitRoomDef,
  PaperDef,
  PaperId,
  TokenEntry,
} from './index';

/**
 * The bell foundry's data (BF-0; foundry-plan §2, §4; district-bell-foundry.md). Ids, board tokens,
 * the tone and lock vocabularies and the tuning block. Every number is *tune by playing*; nothing
 * reads them yet. The district stays `gate: 'drawing'` with no rooms until BF-22.
 */

// ── Tones (P1, P14) ─────────────────────────────────────
/** A bell's tone, shown by colour, pattern, silhouette and 1–3 pips (P14). Low to high is the retune order. */
export const TONES = ['low', 'mid', 'high'] as const;
export type Tone = (typeof TONES)[number];
export const isTone = (v: unknown): v is Tone => TONES.includes(v as Tone);
/** P4: a Brass kind retunes up one tone and wraps (low, mid, high, low). */
export const retunedTone = (tone: Tone): Tone =>
  TONES[(TONES.indexOf(tone) + 1) % TONES.length] as Tone;

// ── Great bells (P6, P7) ────────────────────────────────
/** A note is the room a great bell hangs in: 1 to 4 (the four rooms, the four notes). */
export type Note = 1 | 2 | 3 | 4;
export const NOTES: readonly Note[] = [1, 2, 3, 4];
export const isNote = (v: unknown): v is Note => NOTES.includes(v as Note);
/** P6: the lock each room's great bell wears (a scripted solve exists for each). */
export const LOCKS = ['reach', 'match', 'unison', 'chord'] as const;
export type Lock = (typeof LOCKS)[number];
export const LOCK_OF_NOTE: Readonly<Record<Note, Lock>> = {
  1: 'reach',
  2: 'match',
  3: 'unison',
  4: 'chord',
};
/** The tone a rung great bell rings in the heart unless its data says otherwise (P7). */
export const DEFAULT_HANG: Readonly<Record<Note, Tone>> = {
  1: 'low',
  2: 'mid',
  3: 'high',
  4: 'low',
};

// ── Foes (P12) ──────────────────────────────────────────
/**
 * The ringers' staff (BF-6, BF-7): plain words like the other districts'. The Carillonneur is not
 * here: he is a rival (BF-9, `data/rivals/carillonneur.ts`), his token `V` claimed in `RIVAL_TOKENS`.
 */
export const FOUNDRY_FOE_IDS = ['ringer', 'detuner', 'clapper'] as const;
export type FoundryFoeId = (typeof FOUNDRY_FOE_IDS)[number];

/** Board tokens: the letters still free after the other districts and rivals (checked in BF-0). */
export const FOUNDRY_FOE_TOKENS: Readonly<Record<FoundryFoeId, string>> = {
  ringer: 'Z',
  detuner: 'X',
  clapper: 'Q',
};

/** Piece names inside braces: `{bell:low}`, `{rope:mid}`, `{hook}`, `{greatBell:1}` (P1). */
export const FOUNDRY_PIECE_TOKENS = ['bell', 'rope', 'hook', 'greatBell'] as const;
export type FoundryPieceToken = (typeof FOUNDRY_PIECE_TOKENS)[number];

export const FOUNDRY_TOKENS: readonly TokenEntry[] = [
  ...FOUNDRY_FOE_IDS.map(
    (id): TokenEntry => ({
      token: FOUNDRY_FOE_TOKENS[id],
      kind: 'foe',
      id,
      district: 'foundry',
    }),
  ),
  ...FOUNDRY_PIECE_TOKENS.map(
    (id): TokenEntry => ({ token: id, kind: 'piece', id: `foundry:${id}`, district: 'foundry' }),
  ),
];

// ── Tuning (P3, P6, P8, P9, P12; design §1) ─────────────
export interface FoundryFoeStats {
  hp: number;
  move: number;
  /** Stands on its rope and never walks (the Ringer). */
  anchored: boolean;
  /** Damage when it walks into something (the Clapper). */
  bump: number;
}

export const FOUNDRY_TUNING = {
  /** P7: four rooms and the heart; four great bells, four notes. */
  rooms: 4,
  /** P1: a ringing bell's pulse on each of its 4 neighbours: damage then a push away from the bell. */
  pulseDamage: 1,
  pulsePush: 1,
  /** P3: a tone rings at most once per round; it then hums until round end. */
  ringsPerToneRound: 1,
  /** P8: an allied (hung) great bell pulses foes only, bigger than a plain bell. */
  alliedPulseDamage: 2,
  alliedPulsePush: 1,
  /** P9: the tune is four notes, no tone more than twice. */
  tuneLength: 4,
  maxPerToneInTune: 2,
  /** P12: tones per room (rooms 1–2 two, 3–4 and the heart three) and layouts per depth. */
  tonesInRoom: { 1: 2, 2: 2, 3: 3, 4: 3, heart: 3 },
  layoutsPerDepth: 3,
  minStarts: 4,
  /** P12: foe numbers as placeholders; the Carillonneur is about 14 HP. */
  foes: {
    ringer: { hp: 4, move: 0, anchored: true, bump: 0 },
    detuner: { hp: 3, move: 2, anchored: false, bump: 0 },
    clapper: { hp: 5, move: 1, anchored: false, bump: 1 },
  } as Readonly<Record<FoundryFoeId, FoundryFoeStats>>,
  /** P10: the Carillonneur's body (his kit and trick are `RIVALS`'); he never walks. */
  carillonneur: { hp: 14, move: 0 },
} as const;

/**
 * The foundry's kit data (district-bell-foundry.md, Hearing): a conducted Spark reaching
 * three units in the Seam. The old Conduct trigger (any conduct burst, anywhere) is gone. The
 * rumour of six trips stays. BF-0: still drawing and roomless, the staff's tokens claimed.
 */
export const FOUNDRY_KIT: DistrictData = {
  id: 'foundry',
  name: 'The bell foundry',
  guild: 'The founders',
  edge: 'wall',
  rooms: [],
  tokens: FOUNDRY_TOKENS,
  gate: { kind: 'drawing' },
  line: 'one bang, heard three tiles away',
  barred: 'The page is still being drawn.',
  lean: { lean: 'brass', text: 'Brass' },
  map: { x: 25, y: 22, label: 'above' },
  hear: [
    {
      kind: 'conducted',
      atLeast: 3,
      district: 'seam',
      voice: 'owner',
      text: 'A note that carries. The owner inks in the foundry.',
    },
    { kind: 'trips', atLeast: 6, voice: 'rumour' },
  ],
};

// ── Rooms 1–4 (BF-10, BF-11; foundry-plan P6, P11, P12, P22, P23) ──────────
/**
 * The four rooms before the heart, three layouts each, at least four `P` apiece. Sizes and foes are
 * P12's: 1 the belfry stair 5x7 (two tones, Ringer, Clapper), 2 the ringers' gallery 6x7 (two tones,
 * two Ringers, Clapper), 3 the tuning hall 5x9 (three tones, Detuner, Clapper, Ringer), 4 the
 * clockwork loft 6x8 (three tones, two Detuners, Ringer, Clapper). Each hides one great bell whose
 * lock is its note's (P6), solvable with the starting seven plus Brass; the Clapper's tone is its
 * order among the room's Clappers, so every room's lone Clapper is low (P22). Not yet in
 * `FOUNDRY_KIT.rooms`: the heart (BF-12) and loot (BF-13) come first, BF-22 merges them. Loot
 * tables are the Seam's until BF-13 writes `foundryShallow` and `foundryDeep`.
 */
const BELL = { low: '{bell:low}', mid: '{bell:mid}', high: '{bell:high}' } as const;
const ROPE = { low: 'Z{rope:low}', mid: 'Z{rope:mid}', high: 'Z{rope:high}' } as const;
const GREAT = (note: Note): string => `{greatBell:${note}}`;
const L = BELL.low;
const M = BELL.mid;
const H = BELL.high;
const MUFFLED_M = `~${M}`;
const board = (...rows: readonly string[]): string => rows.join('\n');

/** The ringers' ledger's entry ids, one per fight: rooms 1 to 4, then the heart (`FOUNDRY_LEDGERS`). */
const LEDGER_IDS = [
  'foundry:ledger-1',
  'foundry:ledger-2',
  'foundry:ledger-3',
  'foundry:ledger-4',
  'foundry:ledger-5',
] as const satisfies readonly PaperId[];

/** P7: a room's bonus is its great bell rung and the room won (the hint is the lock's; P23 for Unison). */
const greatBellBonus = (text: string): BonusObjective => ({
  goal: { piece: 'foundry:greatBell', state: 'rung' },
  text,
  reward: { kind: 'state', tag: 'peal' },
});

function foundryRoom(
  id: string,
  title: string,
  depth: number,
  variants: readonly EncounterVariant[],
  loot: KitRoomDef['loot'],
  bonus: BonusObjective,
  lore: PaperId,
): KitRoomDef {
  return {
    id,
    title,
    depth,
    layout: variants[0]?.layout ?? '',
    variants,
    loot,
    picks: 1,
    heart: false,
    bonus,
    lore,
  };
}

/** Room 1, 5x7, Reach: the great bell hangs across drop tiles, out of any apprentice's walking reach. */
const FOUNDRY_1: readonly EncounterVariant[] = [
  {
    name: 'The first flight',
    layout: board(
      `${GREAT(1)} _ _ . ${ROPE.mid}`,
      '_ . . . .',
      `. ${M} . . ${M}`,
      '. . . Q .',
      `. . ${L} . .`,
      '. P . . .',
      'P . P . P',
    ),
  },
  {
    name: 'The landing',
    layout: board(
      `${ROPE.mid} . . _ ${GREAT(1)}`,
      '. . . . _',
      `${M} . . . _`,
      '. Q . . .',
      `. . ${L} ${M} .`,
      '. . . . .',
      'P . P P P',
    ),
  },
  {
    name: 'The stairwell',
    layout: board(
      `. _ ${GREAT(1)} _ .`,
      `. . _ . ${ROPE.mid}`,
      `${M} . _ . .`,
      '. . . Q .',
      `. ${L} . . ${M}`,
      '. . . . .',
      'P P P . P',
    ),
  },
];

/**
 * Room 2, 6x7, Match: the great bell hangs as mid. Every mid bell is muffled and both Ringers pull
 * low ropes, so nothing rings mid unless the party retunes a low bell (Brass) and strikes it.
 */
const FOUNDRY_2: readonly EncounterVariant[] = [
  {
    name: 'The gallery rail',
    layout: board(
      `. . . . . ${GREAT(2)}`,
      `${ROPE.low} . . ${MUFFLED_M} . .`,
      '. . . . . .',
      `. ${L} . Q . ${L}`,
      `. . . . . ${ROPE.low}`,
      '. P . . . .',
      'P . P . P .',
    ),
  },
  {
    name: 'The rope loft',
    layout: board(
      `${GREAT(2)} . . . . .`,
      `. . ${MUFFLED_M} . ${ROPE.low} .`,
      `${ROPE.low} . . . . .`,
      `. ${L} . Q . .`,
      `. . . . ${L} .`,
      'P . . . . .',
      '. P . P . P',
    ),
  },
  {
    name: 'The sounding floor',
    layout: board(
      `. . . ${GREAT(2)} . .`,
      `${MUFFLED_M} . . . . ${ROPE.low}`,
      '. . . . . .',
      `. . ${L} . Q .`,
      `${ROPE.low} . . . . ${L}`,
      '. . . . . .',
      '. P P . P P',
    ),
  },
];

/**
 * Room 3, 5x9, Unison, the landmark hall (quiet and long: the foes keep to the far end). The great
 * bell hangs high in the middle of the hall with a clear line to it from three sides, so one, two or
 * three apprentices can each strike it in one turn from their own line.
 */
const FOUNDRY_3: readonly EncounterVariant[] = [
  {
    name: 'The long hall',
    layout: board(
      `X . . . ${ROPE.high}`,
      `. ${L} . ${H} .`,
      '. . Q . .',
      `. . ${GREAT(3)} . .`,
      '. . . . .',
      `. ${M} . . .`,
      'P . . . P',
      '. . P . .',
      '. P . . .',
    ),
  },
  {
    name: 'The quiet nave',
    layout: board(
      `. . ${ROPE.mid} . .`,
      `${H} . . . X`,
      `. Q . ${L} .`,
      '. . . . .',
      `. . . ${GREAT(3)} .`,
      `. ${M} . . .`,
      'P . . . P',
      '. . . P .',
      '. P . . .',
    ),
  },
  {
    name: 'The tuning floor',
    layout: board(
      `. . . ${H} .`,
      'X . . . .',
      `. ${M} . ${ROPE.low} .`,
      `. . Q . ${L}`,
      `. ${GREAT(3)} . . .`,
      '. . . . .',
      'P . . . .',
      '. P . . P',
      '. . . P .',
    ),
  },
];

/**
 * Room 4, 6x8, Chord: the great bell hangs low. Two low bells and the room's lone (low) Clapper
 * make the three other members of one low ring; a retuned bell would do for the Clapper.
 */
const FOUNDRY_4: readonly EncounterVariant[] = [
  {
    name: 'The clock floor',
    layout: board(
      `. . ${GREAT(4)} . . X`,
      'X . . . . .',
      `. ${L} . . ${H} .`,
      `. . . Q . ${ROPE.mid}`,
      `. ${M} . . ${L} .`,
      '. . . . . .',
      'P . . . . P',
      '. P . . P .',
    ),
  },
  {
    name: 'The escapement',
    layout: board(
      'X . . . . .',
      `. . . ${GREAT(4)} . .`,
      `. ${L} . . . X`,
      `. . . . ${L} .`,
      `${ROPE.mid} . Q . . ${H}`,
      `. . . . ${M} .`,
      '. P . P . .',
      'P . . . . P',
    ),
  },
  {
    name: 'The weights',
    layout: board(
      '. . . . . .',
      '. X . . . .',
      `${GREAT(4)} . . ${ROPE.mid} . .`,
      `. . ${L} . . X`,
      `. ${H} . . Q .`,
      '. . . . . .',
      `P . ${L} . . P`,
      '. P . . P .',
    ),
  },
];

export const FOUNDRY_ROOMS_34: readonly KitRoomDef[] = [
  foundryRoom(
    'foundry-hall',
    'The tuning hall',
    3,
    FOUNDRY_3,
    'deep',
    greatBellBonus(
      'Ring the great bell: two apprentices must strike it in one turn. Casts and Spark count; a Shove does not.',
    ),
    LEDGER_IDS[2],
  ),
  foundryRoom(
    'foundry-loft',
    'The clockwork loft',
    4,
    FOUNDRY_4,
    'deep',
    greatBellBonus('Ring the great bell: one ring of three other bells makes the chord.'),
    LEDGER_IDS[3],
  ),
];

// ── The heart (BF-12; foundry-plan P7, P12, P24) ────────
/**
 * The Great Bell, 7x9, three layouts, all three tones in each. The Carillonneur `V` hangs at the top
 * with a Ringer on a rope at each side of him and the staff below; four `{hook}` tiles are bare
 * (by reading order, P7): each rung note hangs an allied great bell there (`pealRoomSetup`). The
 * party starts along the bottom rows, no start point beside a bell, so the Peal's pulses reach
 * foes first. The frame (`foundry/heartFrame.ts`) reads the first layout.
 */
const HOOK = '{hook}';
const FOUNDRY_HEART_VARIANTS: readonly EncounterVariant[] = [
  {
    name: 'The great bell',
    layout: board(
      `${HOOK} . . V . . ${HOOK}`,
      `. . ${ROPE.low} . ${ROPE.high} . .`,
      '. . . . . . .',
      `. ${M} . Q . ${L} .`,
      '. . . . . . .',
      `${HOOK} . . X . . ${HOOK}`,
      `. ${H} . . ${M} . .`,
      'P . P . . P .',
      '. P . . P . .',
    ),
  },
  {
    name: 'The clapper hall',
    layout: board(
      `${HOOK} . . . V . ${HOOK}`,
      `. . . ${ROPE.mid} . ${ROPE.high} .`,
      `. ${L} . . . . .`,
      `. . . . ${H} . .`,
      '. Q . . . . .',
      `${HOOK} . X . ${M} . ${HOOK}`,
      '. . . . . . .',
      'P . . P . . P',
      '. P . . . P .',
    ),
  },
  {
    name: 'The sounding yoke',
    layout: board(
      '. . . V . . .',
      `. . ${ROPE.high} . ${ROPE.low} . .`,
      `${HOOK} . . . . . ${HOOK}`,
      `. ${M} . . . ${H} .`,
      '. . Q . . . .',
      `${HOOK} . . . X . ${HOOK}`,
      `. . ${L} . . . .`,
      'P . . P . . P',
      '. P . . . P .',
    ),
  },
];

/** Room 5, the heart: the Seam's heart table until BF-22 swaps in `foundry:heart`; two picks. */
export const FOUNDRY_HEART: KitRoomDef = {
  id: 'foundry-heart',
  title: 'The Great Bell',
  depth: 5,
  layout: FOUNDRY_HEART_VARIANTS[0]?.layout ?? '',
  variants: FOUNDRY_HEART_VARIANTS,
  loot: 'heart',
  picks: 2,
  heart: true,
  lore: LEDGER_IDS[4],
};

export const FOUNDRY_ROOMS_12: readonly KitRoomDef[] = [
  foundryRoom(
    'foundry-stair',
    'The belfry stair',
    1,
    FOUNDRY_1,
    'shallow',
    greatBellBonus('Ring the great bell across the drop: a bolt reaches it.'),
    LEDGER_IDS[0],
  ),
  foundryRoom(
    'foundry-gallery',
    "The ringers' gallery",
    2,
    FOUNDRY_2,
    'shallow',
    greatBellBonus('Ring the great bell: only a ring of its own tone reaches it.'),
    LEDGER_IDS[1],
  ),
];

// ── Loot, the tuner and the text (BF-13; foundry-plan P11) ──
const rune = (r: RuneId, weight: number): LootEntry => ({
  spec: { kind: 'rune', rune: r },
  weight,
});
const solvent = (s: SolventId, weight: number): LootEntry => ({
  spec: { kind: 'solvent', solvent: s },
  weight,
});
const ink = (weight: number): LootEntry => ({ spec: { kind: 'ink' }, weight });
const vellum = (weight: number): LootEntry => ({ spec: { kind: 'vellum', amount: 1 }, weight });

export type FoundryTableId = KitId<'foundry'>;
export type FoundryLootTable = Omit<LootTableDef, 'id'> & { id: FoundryTableId };

/**
 * Rooms 1 and 2 teach the school (Toll, Coil, Unison) and the basics; rooms 3 and 4 add the solvents
 * (Rivet, Filings) and vellum; the heart pays the most. Only the district's own pages: the Seam's
 * stay the Seam's. Weights are *tune by playing*. These ids are not in `LootTableId`, so BF-22
 * registers the tables in `LOOT_TABLES` and swaps the rooms' placeholder `loot` for them.
 */
export const foundryShallow: FoundryLootTable = {
  id: 'foundry:shallow',
  entries: [rune('toll', 3), rune('coil', 3), rune('unison', 2), ink(3)],
};
export const foundryDeep: FoundryLootTable = {
  id: 'foundry:deep',
  entries: [
    rune('toll', 2),
    rune('coil', 2),
    rune('unison', 2),
    solvent('rivet', 3),
    solvent('filings', 3),
    ink(2),
    vellum(1),
  ],
};
export const foundryHeart: FoundryLootTable = {
  id: 'foundry:heart',
  entries: [
    rune('toll', 2),
    rune('coil', 2),
    solvent('rivet', 3),
    solvent('filings', 3),
    ink(2),
    vellum(2),
  ],
};
export const FOUNDRY_LOOT_TABLES: Readonly<Record<FoundryTableId, FoundryLootTable>> = {
  'foundry:shallow': foundryShallow,
  'foundry:deep': foundryDeep,
  'foundry:heart': foundryHeart,
};

/** Rooms 1-2 offer from the shallow table, 3-4 the deep, the heart its own (0-based `room`). */
export const foundryTableFor = (room: number, length: number): FoundryTableId =>
  room >= length - 1 ? 'foundry:heart' : room < 2 ? 'foundry:shallow' : 'foundry:deep';
/** One pick a room, the heart two (as the other districts' hearts). */
export const foundryPicksFor = (room: number, length: number): number =>
  room >= length - 1 ? 2 : 1;

/**
 * P11: the tuner waits in room 3 (the tuning hall); Unison's page is guaranteed in room 2 while she
 * needs it. BF-22 merges this into `FOUNDRY_KIT` when the district opens (the integrity check wants
 * a placed recruit to name a real room), as BH-18 did for the bathhouses.
 */
export const TUNER_ROOM = 2;
export const UNISON_GUARANTEE_ROOM = 1;
export const FOUNDRY_RECRUIT_KIT: {
  recruit: readonly RecruitPlacement[];
  recruitPages: readonly RecruitPages[];
} = {
  recruit: [{ apprentice: 'tuner', room: TUNER_ROOM }],
  recruitPages: [{ for: 'tuner', runes: ['unison'], rooms: [UNISON_GUARANTEE_ROOM] }],
};

/** The ringers' ledger: one entry per fight (rooms 1-4, then the heart), found in that room. */
const entry = (n: number, room: number, title: string, text: string): PaperDef => ({
  id: `foundry:ledger-${n}`,
  district: 'foundry',
  title,
  hand: 'A ringer',
  text,
  group: "Ringers' ledger",
  found: room === 4 ? { kind: 'heart' } : { kind: 'room', room },
});
export const FOUNDRY_LEDGERS: readonly PaperDef[] = [
  entry(
    1,
    0,
    'The stair',
    'Rang the first bell for a week of mornings. The rope remembers the hand; the hand forgets the rest. The stair counts only the steps it was built with.',
  ),
  entry(
    2,
    1,
    'The gallery',
    'Two ringers to a gallery and one note between them. We tuned by ear until the ear gave out, then by the bell, which never does. Do not strike the mid bell when it is muffled; it holds a grudge.',
  ),
  entry(
    3,
    2,
    'The tuning hall',
    'A bell is never in tune, only near a note, and someone has to agree to be near it with it. The Tuner sits in the middle of the hall and will not ring until two hands answer together.',
  ),
  entry(
    4,
    3,
    'The loft',
    'The clockwork rings the chord by itself when three agree. We oiled the weights for years and never learned who set the rule. The Detuners say it was never a rule, only a habit with brass in it.',
  ),
  entry(
    5,
    4,
    "In the owner's hand",
    'Entered under a name you know, in a hand you know: your own, for the nights you rang the hours while studying the join. The Carillonneur has the tune by heart and has not once played it to the end.',
  ),
];

/** The owner's ink line for each room and the heart, by room id (the margin note on a won fight). */
export const FOUNDRY_INK: Readonly<Record<string, string>> = {
  'foundry-stair': 'One bell hangs nearer than it looks. Ring it from where it cannot be reached.',
  'foundry-gallery': 'Only a bell of its own tone will answer it. Make one if none will.',
  'foundry-hall': 'Two hands, one turn. A bell is rung by agreement.',
  'foundry-loft': 'Three bells and the fourth answers. Count the Clapper among them.',
  'foundry-heart': 'He plays the same four notes. Learn them and he has nothing left to say.',
};
