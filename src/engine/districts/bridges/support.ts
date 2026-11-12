import { BRIDGE_TUNING } from '$data/districts/bridges/types';
import type { Coord } from '../../grid';
import { coordOf, isPlate } from '../../queries';
import type { BattleState } from '../../types';
import { componentsOf } from '../api';
import type { BoardEdit } from '../types';
import {
  type BridgesState,
  COLLAPSE_RULE_ID,
  KEYSTONE_PIECE,
  type KeystoneData,
  PIER_PIECE,
  parseBridges,
  SPAN_PIECE,
  type SpanData,
  tileKey,
} from './types';

/**
 * The support model (P2). Network = unbroken span tiles + piers + a standing keystone, 4-connected.
 * A span tile is supported when its component holds a pier or keystone. Cracked = every span tile
 * that is broken (stone 0) or unsupported. Derived on every ask, never stored.
 */

const pieceAt = (s: BattleState, at: Coord) => s.tiles[at.y * s.width + at.x]?.piece ?? null;

/** Room start: stone and keystone HP by key from the pieces, and every span tile as an original. */
export function scanBridges(s: BattleState): BridgesState {
  const out: BridgesState = { stone: {}, originals: [], cuts: {} };
  s.tiles.forEach((t, i) => {
    const p = t.piece;
    if (!p) return;
    const at = coordOf(s, i);
    const k = tileKey(at.x, at.y);
    if (p.id === SPAN_PIECE) {
      out.stone[k] = (p.data as SpanData | null)?.stone ?? BRIDGE_TUNING.stone.sound;
      out.originals.push(k);
    } else if (p.id === KEYSTONE_PIECE) {
      out.stone[k] = (p.data as KeystoneData | null)?.hp ?? BRIDGE_TUNING.keystoneHp;
    }
  });
  return out;
}

/** Cheap: does this fight carry the collapse rule or any span piece? Others skip the scan. */
function carriesBridges(s: BattleState): boolean {
  if (s.rules && Object.hasOwn(s.rules, COLLAPSE_RULE_ID)) return true;
  return s.tiles.some((t) => t.piece?.id === SPAN_PIECE);
}

/** The rule's state if the fight carries it, else read from the pieces' own data. */
function liveState(s: BattleState): BridgesState {
  const own = s.rules?.[COLLAPSE_RULE_ID];
  return own === undefined ? scanBridges(s) : parseBridges(own);
}

const isSpanTile = (s: BattleState, at: Coord): boolean => pieceAt(s, at)?.id === SPAN_PIECE;
const stoneAt = (own: BridgesState, at: Coord): number => own.stone[tileKey(at.x, at.y)] ?? 1;

/**
 * Footing tiles that hold the network up: piers, a keystone with HP left, and (`lay-cap-footing`) a
 * span tile whose set plate stands: the Lay hook in `wear.ts` marked the span (`data.footing`), and
 * the plate has to still be there.
 */
function isFooting(s: BattleState, own: BridgesState, at: Coord): boolean {
  const piece = pieceAt(s, at);
  if (piece?.id === SPAN_PIECE) {
    const tile = s.tiles[at.y * s.width + at.x];
    const footing = (piece.data as { footing?: true } | null)?.footing === true;
    return footing && tile !== undefined && tile.state?.set === true && isPlate(tile);
  }
  return piece?.id === PIER_PIECE || (piece?.id === KEYSTONE_PIECE && stoneAt(own, at) > 0);
}

/** Span tiles in a component that holds a footing, in reading order. */
export function supportedTiles(s: BattleState, own: BridgesState = liveState(s)): Coord[] {
  const groups = componentsOf(s, (at) =>
    isSpanTile(s, at) ? stoneAt(own, at) > 0 : isFooting(s, own, at),
  );
  return groups
    .filter((g) => g.some((c) => isFooting(s, own, c)))
    .flat()
    .filter((c) => isSpanTile(s, c));
}

/** Every span tile that is broken or cut off from every pier, in reading order. */
export function cracksOf(s: BattleState, own?: BridgesState): Coord[] {
  if (!own && !carriesBridges(s)) return [];
  own ??= liveState(s);
  const held = new Set(supportedTiles(s, own).map((c) => tileKey(c.x, c.y)));
  const out: Coord[] = [];
  s.tiles.forEach((_, i) => {
    const at = coordOf(s, i);
    if (isSpanTile(s, at) && !held.has(tileKey(at.x, at.y))) out.push(at);
  });
  return out;
}

/**
 * P2: a bridge room's span fill: `{span}` on every standable floor tile without a piece (piers
 * and fog stay as authored). Rooms apply these as `boardEdits` from `roomSetup` once they exist.
 */
export function spanFillEdits(s: BattleState): BoardEdit[] {
  const edits: BoardEdit[] = [];
  s.tiles.forEach((t, i) => {
    if (t.piece || t.terrain.drop) return;
    edits.push({
      at: coordOf(s, i),
      piece: { id: SPAN_PIECE, data: { stone: BRIDGE_TUNING.stone.sound } },
    });
  });
  return edits;
}
