import type { EncounterVariant } from '../types';
import type { BonusObjective, DistrictData, KitRoomDef, TokenEntry } from './index';

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

export const FOUNDRY_ROOMS_12: readonly KitRoomDef[] = [
  foundryRoom(
    'foundry-stair',
    'The belfry stair',
    1,
    FOUNDRY_1,
    'shallow',
    greatBellBonus('Ring the great bell across the drop: a bolt reaches it.'),
  ),
  foundryRoom(
    'foundry-gallery',
    "The ringers' gallery",
    2,
    FOUNDRY_2,
    'shallow',
    greatBellBonus('Ring the great bell: only a ring of its own tone reaches it.'),
  ),
];
