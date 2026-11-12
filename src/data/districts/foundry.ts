import type { DistrictData, TokenEntry } from './index';

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
