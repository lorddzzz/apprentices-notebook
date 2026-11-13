import { DEFAULT_PENCIL, type PencilConfig } from '$data/districts/cartographers/types';
import type { DistrictEvent, Json, PieceDef, PieceId, RuleId } from '../types';

/**
 * The Cartographers' engine contracts (CG-W0; cartographers-plan §2, §4): the paper pieces, the
 * guild's hand and its state, the foes' ids, the events and the salt. Plain JSON throughout (saved
 * and cloned as is). Stubs: no piece is registered, the rule has no step and no foe has an AI
 * until CG-1..CG-7, so the district changes nothing in a battle.
 *
 * Handoff invariants (the packs after this build on them; `tests/districts/cartographers/` pins them):
 * - P1  Three paper states, as board pieces. `{pencil}` is standable and holds states, jars and
 *       units; once planned it carries a *fate* (`ink` | `rub`) and a *due* round. Inked paper is
 *       an ordinary tile (the piece is removed). `{blank}` is no tile: never standable, holds
 *       nothing, blocks shots like the board edge. Fixed fates (`{pencil:rub@2}`) are legal
 *       authored data for the threshold, the Lab and scenarios. `{outline:<foe>}` is pencil carrying
 *       a foe (P6). The `circle`'s art key is here; the object is RV's (the Registrar, CG-7).
 * - P2  Blank paper is a void that erases. Walking and foe paths never enter it; a push, slide,
 *       pull or swap that would carry a unit onto it stops the unit there and erases it
 *       (`removeFromRoom(..., 'erased')`, DK-6), exactly as the bridges' fall. Draw onto blank
 *       fails like the edge (line `draw:blank`).
 * - P3  The guild's hand is a district-scoped `late` rule (DK-3), after fire and snuff: it
 *       resolves the pencil due this round (ink or rub; units on rubbed tiles erased), inks due
 *       outlines, then plans the next round. The plan shown during the player's turn is exactly
 *       what happens at its end. It draws from `deriveSeed(battle seed, HAND_SALT + round)`, a
 *       stream apart from foe rolls. `HAND_SALT` is 8100, outside EN's 7000-7999 range (which
 *       also holds the heart frames' 7100-7150; the cartographers' frame takes 7160 in CG-10).
 *       The pencil piece itself is piece-scoped, so a Lab or Bench pencil with a fixed fate
 *       resolves without the district.
 */

// ── Pieces (P1, P6) ─────────────────────────────────────
/**
 * The pencil piece's own rule (see `guildHand.ts`): `scope: 'piece'`, so a pencil on any board
 * brings it. It resolves fixed-fate pencil at its due round and does nothing where the district's
 * rule is listed (that one resolves and plans). The one rule `isRuleActive` cannot make from a
 * single `scope: 'district'` entry, which a trip lists on its own but a pencil cannot bring.
 */
export const PENCIL_RULE_ID: RuleId = 'cartographers:pencil';
export const PENCIL_PIECE: PieceId = 'cartographers:pencil';
export const BLANK_PIECE: PieceId = 'cartographers:blank';
export const OUTLINE_PIECE: PieceId = 'cartographers:outline';
/** The Registrar's circle (P10): an art key only, its object is a rival trick's (RV P10, CG-7). */
export const CIRCLE_ART = 'cartographers:circle';

/** What the hand will do to a pencil tile when it falls due. */
export type Fate = 'ink' | 'rub';
export const FATES: readonly Fate[] = ['ink', 'rub'];
export const isFate = (v: unknown): v is Fate => FATES.includes(v as Fate);

/**
 * `{pencil}`, `{pencil:ink}`, `{pencil:rub@2}`: a bare pencil is unplanned (`fate` and `due` null);
 * a planned one names its fate and the round whose end resolves it (CG-1 writes the notation).
 */
export type PencilData = { fate: Fate | null; due: number | null };
/** `{blank}`: no data; the empty object keeps the piece's saved shape `Json`. */
export type BlankData = Readonly<Record<string, never>>;
/**
 * `{outline:<foe>}`: pencil carrying a foe def id; it inks at its `due` round end (null until
 * planned) and waits a round while a unit stands on it (P6, CG-4).
 */
export type OutlineData = { foe: string; due: number | null };

const stub = { solid: 'none' } as const;

/**
 * Standable pencil, holds states, jars and units (solid `none`). Its notation and the piece-scoped
 * rule that resolves a fixed fate on a Lab board come with `pieces.ts` (CG-1).
 */
export const PENCIL_DEF: PieceDef<PencilData> = {
  ...stub,
  id: PENCIL_PIECE,
  token: 'pencil',
  triggers: {},
  data: { init: { fate: null, due: null } },
  rules: [PENCIL_RULE_ID],
  art: 'cartographers:pencil',
};
/**
 * No tile at all (P2): blocks walks, foe paths and shots like the edge (`unitsAndShots`) and is a
 * void that erases (`pieceVoid`, `push.ts`). It holds nothing (`holds: 'none'`): no state, jar or mark lands on it.
 */
export const BLANK_DEF: PieceDef<BlankData> = {
  id: BLANK_PIECE,
  token: 'blank',
  solid: 'unitsAndShots',
  holds: 'none',
  void: 'erased',
  triggers: {},
  data: { init: {} },
  art: 'cartographers:blank',
};
/** A foe in pencil (P6): blocks units until it inks; behaviour is CG-4. */
export const OUTLINE_DEF: PieceDef<OutlineData> = {
  id: OUTLINE_PIECE,
  token: 'outline',
  solid: 'units',
  triggers: {},
  data: { init: { foe: '', due: null } },
  art: 'cartographers:outline',
};
/** The declared bases; `pieces.ts` registers them with their notation and triggers (CG-1, CG-4). */
export const CARTOGRAPHERS_PIECES: readonly PieceDef[] = [
  PENCIL_DEF,
  BLANK_DEF,
  OUTLINE_DEF,
] as readonly PieceDef[];

// ── The guild's hand (P3, P4) ───────────────────────────
export const GUILD_HAND_RULE_ID: RuleId = 'cartographers:guildHand';
/** The hand's stream: `deriveSeed(battle seed, HAND_SALT + round)`; outside EN's 7000-7999 (P3). */
export const HAND_SALT = 8100;
/**
 * `BattleState.rules['cartographers:guildHand']`: the room's pencil config as the room set it
 * (`PencilConfig`, JSON), the due round of the last plan drawn (0 = none yet) and the stream's
 * base `seed` (CG-2: the config's `seed`, else the battle's `rngState` when the rule is listed, as
 * a battle has no stable seed of its own), so a saved battle replays the same plan.
 */
export type GuildHandState = PencilConfig & { planned: number; seed?: number };
export const initGuildHand = (): GuildHandState => ({ ...DEFAULT_PENCIL, planned: 0 });

// ── The guild's hands: foe behaviour ids (P7–P9) ────────
export const SURVEYOR_BEHAVIOUR = 'cartographers:surveyor' as const;
export const ERASER_BEHAVIOUR = 'cartographers:eraser' as const;
export const TRACER_BEHAVIOUR = 'cartographers:tracer' as const;

// ── Events ──────────────────────────────────────────────
type Ev<T extends string, D extends { readonly [k: string]: Json }> = DistrictEvent & {
  type: `cartographers:${T}`;
  data: D;
};
type At = { x: number; y: number };
/** A pencil tile became real, permanent paper (the hand's ink); `at` is its tile. */
export type InkedEvent = Ev<'inked', { round: number }>;
/** A pencil tile was rubbed out at round end: the tile vanished and these units were erased. */
export type RubbedOutEvent = Ev<'rubbedOut', { round: number; units: string[] }>;
/** A pencil tile or outline was un-drawn early (Erase, the Eraser, Quicksilver's mirror). */
export type UndrawnEvent = Ev<
  'undrawn',
  { by: 'erase' | 'eraser' | 'quicksilver'; was: 'pencil' | 'outline'; units: string[] }
>;
/** An outline inked in: the foe `foe` now stands where it was drawn. */
export type DrawnInEvent = Ev<'drawnIn', { foe: string }>;
/** The Registrar circled a tile; `holder` is the unit id whose death lifts it. */
export type CircledEvent = Ev<'circled', { holder: string; units: string[] }>;
/** The Registrar's circle closed on a unit still standing in it: it is erased (`strike from the register`). */
export type StruckEvent = Ev<'struck', { units: string[]; tiles: At[] }>;

export type CartographersEvent =
  | InkedEvent
  | RubbedOutEvent
  | UndrawnEvent
  | DrawnInEvent
  | CircledEvent
  | StruckEvent;
export type CartographersEventType = CartographersEvent['type'];
export const CARTOGRAPHERS_EVENT_TYPES = [
  'cartographers:inked',
  'cartographers:rubbedOut',
  'cartographers:undrawn',
  'cartographers:drawnIn',
  'cartographers:circled',
  'cartographers:struck',
] as const satisfies readonly CartographersEventType[];
