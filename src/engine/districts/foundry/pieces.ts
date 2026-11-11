import { isTone, TONES, type Tone } from '$data/districts/foundry';
import type { Coord } from '../../grid';

import type { BattleState, Unit } from '../../types';
import {
  BELL_PIECE,
  type BellData,
  GREAT_BELL_PIECE,
  type GreatBellData,
  type RopeData,
} from './types';

// No engine-query imports here: this file loads while the kit is built (import cycle).
const coordOf = (s: BattleState, i: number): Coord => ({
  x: i % s.width,
  y: Math.floor(i / s.width),
});

/** One member of a tone: a bell, a hung great bell, or a unit that rings as one (the Clapper, BF-6). */
export type ToneMember =
  | { kind: 'bell' | 'greatBell'; at: Coord }
  | { kind: 'unit'; at: Coord; unit: string };

/**
 * The tone a unit rings as while it stands, or null. BF-6 supplies the Clapper's reader; until then
 * no unit has one. Kept a parameter so the grouping stays pure and testable with a stub.
 */
export type UnitToneReader = (u: Unit) => Tone | null;
export const NO_UNIT_TONES: UnitToneReader = () => null;

/**
 * BF-6: a Clapper rings the tone of its ordinal among the room's Clappers (`clapper-1` low,
 * `clapper-2` mid, `clapper-3` high, then around): stable while it lives or dies, so a unit needs
 * no data field. Any other unit has none.
 */
export const clapperTone: UnitToneReader = (u) => {
  if (u.kind !== 'enemy' || u.def !== 'clapper') return null;
  const n = Number(/-(\d+)$/.exec(u.id)?.[1] ?? 1);
  return TONES[(Math.max(1, n) - 1) % TONES.length] ?? null;
};

/** The tone a bell piece hangs as (a great bell hangs as its `hang`); null for any other piece. */
export function toneOfPiece(id: string, data: unknown): Tone | null {
  const tone =
    id === BELL_PIECE
      ? (data as BellData | null)?.tone
      : id === GREAT_BELL_PIECE
        ? (data as GreatBellData | null)?.hang
        : undefined;
  return isTone(tone) ? tone : null;
}

/** The tone a rope's Ringer rings. */
export const ropeTone = (data: unknown): Tone => {
  const tone = (data as RopeData | null)?.tone;
  return isTone(tone) ? tone : 'low';
};

/**
 * Every member of every tone, in reading order (bells first, then standing units by id). Allied
 * great bells are not members of the foes' tones: they hang apart (P8).
 */
export function toneGroups(
  s: BattleState,
  unitTone: UnitToneReader = NO_UNIT_TONES,
): Record<Tone, ToneMember[]> {
  const groups: Record<Tone, ToneMember[]> = { low: [], mid: [], high: [] };
  s.tiles.forEach((t, i) => {
    if (!t.piece) return;
    const tone = toneOfPiece(t.piece.id, t.piece.data);
    if (!tone) return;
    if (t.piece.id === GREAT_BELL_PIECE && (t.piece.data as GreatBellData).allied) return;
    groups[tone].push({
      kind: t.piece.id === BELL_PIECE ? 'bell' : 'greatBell',
      at: coordOf(s, i),
    });
  });
  for (const u of s.units) {
    if (u.hp <= 0 || u.out) continue;
    const tone = unitTone(u);
    if (tone) groups[tone].push({ kind: 'unit', at: { ...u.pos }, unit: u.id });
  }
  return groups;
}

/** The tones present on the board (at least one member), low to high. */
export const tonesPresent = (g: Record<Tone, ToneMember[]>): Tone[] =>
  TONES.filter((t) => g[t].length > 0);
