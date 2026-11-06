import {
  DEFAULT_HANG,
  FOUNDRY_TUNING,
  isNote,
  isTone,
  LOCK_OF_NOTE,
  type Lock,
  type Note,
  TONES,
  type Tone,
} from '$data/districts/foundry';
import type {
  DistrictEvent,
  Json,
  PieceDef,
  PieceId,
  RuleId,
  StruckBy,
  TripShapeId,
} from '../types';

/**
 * The foundry's engine contracts (BF-0; foundry-plan §2, §4): the four pieces, the two rules' state
 * and readers, the events, the trip state and its reader. Plain JSON throughout (saved and cloned as
 * is). The pieces have no triggers and both rules' steps are no-ops until BF-2..BF-9.
 *
 * Handoff invariants (names BF-2..BF-9 build on; `tests/districts/bf0-contracts.test.ts` pins them):
 * - P1  Bell, rope, hook and great bell are pieces, never brass: no brass net, Conduct or Surge reads
 *       them. A bell and a great bell are solid like a plate (`unitsAndShots`); a rope and a hook are
 *       open footing. A bell holds no state but its tone; a muffle is a cloud on its tile, never a
 *       field here. The Clapper (a unit) joins its tone while it stands (BF-6, not a piece field).
 * - P2  What strikes a bell is `StruckBy`: `damage`, `push`, `spark`, `shove`. Kinds, Guard, marks,
 *       Pull, Hop and Swap never do. BF-3 sets `onStruck` on the pieces; until then nothing answers
 *       (and `strikable` is false, so a Shove at a bell is not yet legal).
 * - P3  A tone rings at most once per round (`FOUNDRY_TUNING.ringsPerToneRound`); `BellsState.humming`
 *       holds the tones that have rung, cleared in `late` (order 90, after every other late rule).
 *       Each unit is pulsed at most once per ring.
 * - P4  Retune is Brass up one tone, wrapping (`retunedTone`); muffle is a Steam cloud on the bell.
 * - P5  Pulses are neutral and carry the striker's origin (the event's own `origin`, not a field).
 * - P6  A great bell's lock is fixed by its note (`LOCK_OF_NOTE`); it is rung when its data reads
 *       `rung: true` (the room `bonus` goal `{ piece: 'foundry:greatBell', state: 'rung' }`).
 * - P7  Trip state is `{ rung: { room, note }[] }`; `room` is the 0-based room, one entry per room.
 *       Returning home or a wipe discards it with the trip. An allied bell is a great bell with
 *       `allied: true` on a hook tile; `{hook:N}` names the note it hangs (bare `{hook}` = 0: by
 *       reading order among the room's hooks).
 * - P8  Allied great bells pulse foes only, damage and push from `FOUNDRY_TUNING.allied*`.
 *       `BellsState.struck` records who struck which bell this round (once per round, Unison).
 * - P9  The tune is `TuneState` on the district rule; a note is rung or answered, never both.
 */

// ── Pieces (P1) ─────────────────────────────────────────
export const BELL_PIECE: PieceId = 'foundry:bell';
export const ROPE_PIECE: PieceId = 'foundry:rope';
export const HOOK_PIECE: PieceId = 'foundry:hook';
export const GREAT_BELL_PIECE: PieceId = 'foundry:greatBell';
/** The bell rule (P3): slot `late`, brought by a bell or a great bell on the board. */
export const BELLS_RULE_ID: RuleId = 'foundry:bells';
/** The tune (P9): a district rule, listed by the heart's setup, never brought by a piece. */
export const TUNE_RULE_ID: RuleId = 'foundry:tune';

/** `{bell:low}`: a bell's tone; bare `{bell}` reads `low`. */
export type BellData = { tone: Tone };
/** `{rope:mid}`: the tone the Ringer on this rope rings; bare `{rope}` reads `low`. */
export type RopeData = { tone: Tone };
/** `{hook}`, `{hook:3}`: where an allied great bell hangs in the heart; 0 = by reading order (P7). */
export type HookData = { note: number };
/**
 * `{greatBell:2}`, `{greatBell:2:high}`, `{greatBell:2:allied}`, `{greatBell:2:rung}` (P6, P7, P8):
 * the note (the lock follows from it), the tone it hangs as, and two flags. Tone, `allied` and
 * `rung` parts may come in any order; the writer's order is note, tone (when not the default),
 * `allied`, `rung`.
 */
export type GreatBellData = { note: Note; hang: Tone; allied: boolean; rung: boolean };

export const lockOf = (d: GreatBellData): Lock => LOCK_OF_NOTE[d.note];

const NOTE_RE = /^[1-4]$/;
const parseTone = (s: string): Tone | null => (isTone(s) ? s : null);

export const BELL_DEF: PieceDef<BellData> = {
  id: BELL_PIECE,
  token: 'bell',
  solid: 'unitsAndShots',
  triggers: {},
  rules: [BELLS_RULE_ID],
  data: {
    init: { tone: 'low' },
    parse: (s) => {
      const tone = parseTone(s);
      return tone ? { tone } : null;
    },
    write: (d) => d.tone,
  },
  art: 'foundry:bell',
};

export const ROPE_DEF: PieceDef<RopeData> = {
  id: ROPE_PIECE,
  token: 'rope',
  solid: 'none',
  triggers: {},
  data: {
    init: { tone: 'low' },
    parse: (s) => {
      const tone = parseTone(s);
      return tone ? { tone } : null;
    },
    write: (d) => d.tone,
  },
  art: 'foundry:rope',
};

export const HOOK_DEF: PieceDef<HookData> = {
  id: HOOK_PIECE,
  token: 'hook',
  solid: 'none',
  triggers: {},
  data: {
    init: { note: 0 },
    parse: (s) => (/^[1-4]$/.test(s) ? { note: Number(s) } : null),
    write: (d) => (d.note > 0 ? String(d.note) : ''),
  },
  art: 'foundry:hook',
};

export const GREAT_BELL_DEF: PieceDef<GreatBellData> = {
  id: GREAT_BELL_PIECE,
  token: 'greatBell',
  solid: 'unitsAndShots',
  triggers: {},
  rules: [BELLS_RULE_ID],
  data: {
    init: { note: 1, hang: DEFAULT_HANG[1], allied: false, rung: false },
    parse: (s) => {
      const [first, ...rest] = s.split(':');
      if (!first || !NOTE_RE.test(first)) return null;
      const note = Number(first) as Note;
      const d: GreatBellData = { note, hang: DEFAULT_HANG[note], allied: false, rung: false };
      for (const part of rest) {
        const tone = parseTone(part);
        if (tone) d.hang = tone;
        else if (part === 'allied') d.allied = true;
        else if (part === 'rung') d.rung = true;
        else return null;
      }
      return d;
    },
    write: (d) =>
      [
        String(d.note),
        ...(d.hang === DEFAULT_HANG[d.note] ? [] : [d.hang]),
        ...(d.allied ? ['allied'] : []),
        ...(d.rung ? ['rung'] : []),
      ].join(':'),
  },
  art: 'foundry:greatBell',
};

export const FOUNDRY_PIECES: readonly PieceDef[] = [
  BELL_DEF,
  ROPE_DEF,
  HOOK_DEF,
  GREAT_BELL_DEF,
] as readonly PieceDef[];

// ── Shared readers ──────────────────────────────────────
const rec = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const KEY = /^-?\d+,-?\d+$/;
/** A tile key, `"x,y"`. Plain strings so the state is JSON (no Coord keys). */
export type TileKey = `${number},${number}`;
export const tileKey = (x: number, y: number): TileKey => `${x},${y}`;
const tones = (v: unknown): Tone[] => {
  if (!Array.isArray(v)) return [];
  const seen = new Set<Tone>();
  for (const t of v) if (isTone(t)) seen.add(t);
  return TONES.filter((t) => seen.has(t));
};

// ── The bell rule's state (P3, P8) ──────────────────────
/**
 * `BattleState.rules['foundry:bells']`.
 * - `humming`: the tones that have rung this round, in tone order; cleared in `late` (P3).
 * - `struck`: tile key → the unit ids that struck that bell this round, in order; cleared in
 *   `late` (P8's once per round, P6's Unison).
 */
export type BellsState = { humming: Tone[]; struck: { [key: string]: string[] } };
export const initBells = (): BellsState => ({ humming: [], struck: {} });

/** The forgiving reader (kit convention): unknown tones, bad keys and non-strings are dropped. */
export function parseBells(raw: unknown): BellsState {
  const r = rec(raw);
  if (!r) return initBells();
  const struck: BellsState['struck'] = {};
  for (const [k, v] of Object.entries(rec(r.struck) ?? {})) {
    if (!KEY.test(k) || !Array.isArray(v)) continue;
    const ids = [...new Set(v.filter((x): x is string => typeof x === 'string'))];
    if (ids.length > 0) struck[k] = ids;
  }
  return { humming: tones(r.humming), struck };
}

// ── The tune (P9) ───────────────────────────────────────
/** Why a called note was answered (P9): the tone already hums, none of it can ring, or he cannot. */
export const ANSWER_REASONS = ['humming', 'nothingToRing', 'cannotRing'] as const;
export type AnswerReason = (typeof ANSWER_REASONS)[number];

/**
 * `BattleState.rules['foundry:tune']`. `tune` is the four tones in call order, `at` the index of
 * the note called next (0–3), `peals` the Great Peals rung (BF-9 seeds each new tune from the trip
 * seed and this count), `answered` how often the player answered a note (the restart count).
 */
export type TuneState = { tune: Tone[]; at: number; peals: number; answered: number };
export const initTune = (): TuneState => ({ tune: [], at: 0, peals: 0, answered: 0 });

const count = (v: unknown, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0;

export function parseTune(raw: unknown): TuneState {
  const r = rec(raw);
  if (!r) return initTune();
  const tune = Array.isArray(r.tune) ? r.tune.filter(isTone) : [];
  const whole = tune.length === FOUNDRY_TUNING.tuneLength;
  return {
    tune: whole ? tune : [],
    at: whole ? count(r.at, FOUNDRY_TUNING.tuneLength - 1) : 0,
    peals: count(r.peals, 99),
    answered: count(r.answered, 999),
  };
}

// ── Events (P2, P3, P4, P6, P9) ─────────────────────────
type Ev<T extends string, D extends { readonly [k: string]: Json }> = DistrictEvent & {
  type: `foundry:${T}`;
  data: D;
};
type At = { x: number; y: number };
/** What rang a tone: a strike, a Ringer, a Clapper, the called note, the Great Peal, a hung bell. */
export type RingCause = 'strike' | 'ringer' | 'clapper' | 'note' | 'peal' | 'hung';

/** A bell (or great bell, `tone` null) was struck from `by`; `at` is its tile (P2). */
export type BellStruckEvent = Ev<'bellStruck', { by: StruckBy; tone: Tone | null }>;
/** Every bell of `tone` rings, in strike order (P3). */
export type RingEvent = Ev<'ring', { tone: Tone; bells: At[]; cause: RingCause }>;
/** One ringing bell pulses its neighbours; the damage and pushes are their own events (P1, P5, P8). */
export type PulseEvent = Ev<'pulse', { tone: Tone; allied: boolean; units: string[] }>;
/** A tone starts humming (`on`) or stops at round end (P3). */
export type HumEvent = Ev<'hum', { tone: Tone; on: boolean }>;
/** A Brass kind retuned the bell at `at` (P4). */
export type RetunedEvent = Ev<'retuned', { from: Tone; to: Tone }>;
/** A muffled bell (a cloud on its tile) was struck and stayed silent (P4). */
export type MuffledEvent = Ev<'muffled', { tone: Tone }>;
/** A great bell was rung: its note, lock and hang tone (P6, P7). */
export type BellRungEvent = Ev<'bellRung', { note: Note; lock: Lock; hang: Tone }>;
/** The Carillonneur called note `index` of the tune: rung, or answered with its `reason` (P9). */
export type TuneNoteEvent = Ev<
  'tuneNote',
  { index: number; tone: Tone; answered: AnswerReason | null }
>;
/** The Great Peal: every bell not already humming rings (P9). */
export type GreatPealEvent = Ev<'greatPeal', { tones: Tone[] }>;

export type FoundryEvent =
  | BellStruckEvent
  | RingEvent
  | PulseEvent
  | HumEvent
  | RetunedEvent
  | MuffledEvent
  | BellRungEvent
  | TuneNoteEvent
  | GreatPealEvent;
export type FoundryEventType = FoundryEvent['type'];
export const FOUNDRY_EVENT_TYPES = [
  'foundry:bellStruck',
  'foundry:ring',
  'foundry:pulse',
  'foundry:hum',
  'foundry:retuned',
  'foundry:muffled',
  'foundry:bellRung',
  'foundry:tuneNote',
  'foundry:greatPeal',
] as const satisfies readonly FoundryEventType[];
/**
 * The ones that make a player's cast count toward proof (`MEANINGFUL` in resolve.ts keeps the same
 * list as strings: engine files cannot import this one there without a cycle). `hum`, `tuneNote`
 * and `greatPeal` are bookkeeping or the foe's, never a cast's doing.
 */
export const FOUNDRY_MEANINGFUL_TYPES = [
  'foundry:bellStruck',
  'foundry:ring',
  'foundry:pulse',
  'foundry:retuned',
  'foundry:muffled',
  'foundry:bellRung',
] as const satisfies readonly FoundryEventType[];

// ── Trip state (P7) ─────────────────────────────────────
/** One great bell rung: the 0-based room it hung in and its note (1–4). */
export type RungBell = { room: number; note: Note };
/** `Trip.kit.state`: the great bells rung so far, by room (they hang in the heart). */
export type FoundryTripState = { rung: RungBell[] };
export const FOUNDRY_SHAPE: TripShapeId = 'foundry:peal';
export const initFoundryState = (): FoundryTripState => ({ rung: [] });

/** The forgiving reader: bad entries are dropped, a room counts once (the first), sorted by room. */
export function parseFoundryState(raw: unknown): FoundryTripState {
  const list = rec(raw)?.rung;
  if (!Array.isArray(list)) return initFoundryState();
  const byRoom = new Map<number, RungBell>();
  for (const item of list) {
    const r = rec(item);
    const room = r?.room;
    const note = r?.note;
    if (!Number.isInteger(room) || (room as number) < 0 || (room as number) >= FOUNDRY_TUNING.rooms)
      continue;
    if (!isNote(note)) continue;
    if (!byRoom.has(room as number)) byRoom.set(room as number, { room: room as number, note });
  }
  return { rung: [...byRoom.values()].sort((a, b) => a.room - b.room) };
}
