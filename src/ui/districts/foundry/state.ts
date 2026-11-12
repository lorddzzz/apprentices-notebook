import { isTone, type Tone } from '$data/districts/foundry';
import type { BattleState, Coord } from '$engine';
import { toneOfPiece } from '$engine/districts/foundry/pieces';
import { isHumming } from '$engine/districts/foundry/ring';
import { calledNote, tuneOf } from '$engine/districts/foundry/tune';
import {
  BELL_PIECE,
  BELLS_RULE_ID,
  GREAT_BELL_PIECE,
  type GreatBellData,
  parseBells,
  TUNE_RULE_ID,
} from '$engine/districts/foundry/types';
import type { BoardView } from '../../../app/view';

/** The foundry's board readers (BF-17): pure functions of a view or a battle, no drawing. */

const at = (width: number, i: number): Coord => ({ x: i % width, y: Math.floor(i / width) });

/** The tone a bell on this view tile hangs as (a great bell by its `hang`), or null. */
export const viewTone = (id: string, data: unknown): Tone | null => toneOfPiece(id, data);

/**
 * Fills a fresh view's bells from the rule state: a bell whose tone has rung this round reads
 * `hum: true` in its piece data, which `BellPiece` draws as a ring and a dimmed pattern (P14).
 */
export function liveFoundry(s: BattleState, v: BoardView): BoardView {
  const humming = parseBells(s.rules?.[BELLS_RULE_ID]).humming;
  if (humming.length === 0) return v;
  for (const t of v.tiles) {
    if (!t.piece) continue;
    const tone = viewTone(t.piece.id, t.piece.data);
    if (!tone || !humming.includes(tone)) continue;
    t.piece = { ...t.piece, data: { ...(t.piece.data as object), hum: true } };
  }
  return v;
}

/** Every bell (and great bell) tile on a battle, in reading order, with its tone and the cloud on it. */
export interface BellSpot {
  at: Coord;
  tone: Tone;
  great: boolean;
  allied: boolean;
  muffled: boolean;
  humming: boolean;
}

export function bellSpots(s: BattleState): BellSpot[] {
  const out: BellSpot[] = [];
  s.tiles.forEach((t, i) => {
    if (!t.piece || (t.piece.id !== BELL_PIECE && t.piece.id !== GREAT_BELL_PIECE)) return;
    const tone = toneOfPiece(t.piece.id, t.piece.data);
    if (!tone) return;
    const great = t.piece.id === GREAT_BELL_PIECE;
    out.push({
      at: at(s.width, i),
      tone,
      great,
      allied: great && (t.piece.data as GreatBellData).allied === true,
      muffled: t.state?.id === 'cloud',
      humming: isHumming(s, tone),
    });
  });
  return out;
}

/** The tone of a Ringer's telegraph label (`ring:mid`), or null. */
export const toneOfLabel = (label: string): Tone | null => {
  const t = label.split(':')[1];
  return isTone(t) ? t : null;
};

/** A Clapper's tone from its id, the same ordinal rule as the engine (`clapper-2` is mid). */
export const clapperToneOfId = (id: string): Tone => {
  const n = Number(/-(\d+)$/.exec(id)?.[1] ?? 1);
  return (['low', 'mid', 'high'] as const)[(Math.max(1, n) - 1) % 3] ?? 'low';
};

/** What the tune banner says (BF-18): the four notes, the one called now, and the rounds to the Peal. */
export interface TuneLine {
  notes: readonly Tone[];
  /** 0-based index of the note called this round. */
  at: number;
  called: Tone;
  /** Rounds until the Great Peal rings, counting this one (1 = it rings this round, after the fourth note). */
  roundsToPeal: number;
  peal: boolean;
  /** Notes he was made to restart on. */
  answered: number;
}

/** The tune as the banner shows it, or null while no tune plays (not the heart, or the Carillonneur is gone). */
export function tuneLine(s: BattleState): TuneLine | null {
  if (!(TUNE_RULE_ID in (s.rules ?? {}))) return null;
  if (!s.units.some((u) => u.kind === 'enemy' && u.def === 'carillonneur' && u.hp > 0)) return null;
  const t = tuneOf(s);
  return {
    notes: t.tune,
    at: t.at,
    called: calledNote(t),
    roundsToPeal: t.tune.length - t.at,
    peal: t.at === t.tune.length - 1,
    answered: t.answered,
  };
}
