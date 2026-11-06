import type { BattleState } from '$engine';
import {
  COLLAPSE_RULE_ID,
  KEYSTONE_PIECE,
  PIER_PIECE,
  parseBridges,
  SPAN_PIECE,
  tileKey,
} from '$engine/districts/bridges/types';
import type { DistrictEvent } from '$engine/districts/types';
import type { BoardView, TileView } from './view';

/**
 * The bridges on a board view (BR-14). The engine keeps the live stone in the collapse rule's
 * state and DERIVES the cracked set; the board view has neither, so a bridge piece's view data
 * carries `{ stone, max, cracked }` (keystone: `hp`), refreshed from the state and after each
 * projected event. `cracked` here is the same flood fill as `cracksOf`, on the view's own tiles
 * (a test holds the two equal).
 */

/** What a span or keystone piece's view data holds. */
export interface BridgeArt {
  stone: number;
  max: number;
  cracked: boolean;
  /** The keystone draws as a different stone; it is never cracked (it falls to fog or stands). */
  keystone?: boolean;
}

const isBridgePiece = (id: string): boolean =>
  id === SPAN_PIECE || id === PIER_PIECE || id === KEYSTONE_PIECE;

export const hasBridges = (v: Pick<BoardView, 'tiles'>): boolean =>
  v.tiles.some((t) => t.piece && isBridgePiece(t.piece.id));

/** A bridge piece's art data, read forgivingly from a piece view's data. */
export function bridgeArtOf(data: unknown): BridgeArt {
  const d = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
  const num = (k: string, or: number) => (typeof d[k] === 'number' ? (d[k] as number) : or);
  const stone = num('stone', num('hp', 1));
  return {
    stone,
    max: Math.max(stone, num('max', stone)),
    cracked: d.cracked === true,
    ...(d.keystone === true ? { keystone: true } : {}),
  };
}

/** Sets `data` on a tile's bridge piece (the view's tiles are its own copies). */
function setData(t: TileView, data: BridgeArt): void {
  if (t.piece) t.piece = { ...t.piece, data: { ...data } };
}

/** The tiles' cracked flags from the pieces' stone: broken or cut off from every pier and live keystone. */
export function markCracks(v: BoardView): void {
  const { width, height, tiles } = v;
  const at = (x: number, y: number): TileView | undefined =>
    x < 0 || y < 0 || x >= width || y >= height ? undefined : tiles[y * width + x];
  const id = (t: TileView | undefined) => t?.piece?.id;
  const stoneOf = (t: TileView) => bridgeArtOf(t.piece?.data).stone;
  const inNet = (t: TileView | undefined): boolean => {
    if (!t) return false;
    if (id(t) === SPAN_PIECE) return stoneOf(t) > 0;
    if (id(t) === PIER_PIECE) return true;
    return id(t) === KEYSTONE_PIECE && stoneOf(t) > 0;
  };
  const held = new Set<number>();
  const queue: number[] = [];
  tiles.forEach((t, i) => {
    if (id(t) === PIER_PIECE || (id(t) === KEYSTONE_PIECE && stoneOf(t) > 0)) {
      held.add(i);
      queue.push(i);
    }
  });
  while (queue.length) {
    const i = queue.pop() as number;
    const x = i % width;
    const y = Math.floor(i / width);
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ] as const) {
      const n = at(nx, ny);
      const j = ny * width + nx;
      if (n && !held.has(j) && inNet(n)) {
        held.add(j);
        queue.push(j);
      }
    }
  }
  tiles.forEach((t, i) => {
    if (id(t) !== SPAN_PIECE) return;
    const a = bridgeArtOf(t.piece?.data);
    setData(t, { ...a, cracked: !held.has(i) });
  });
}

/** Fills a fresh view's bridge pieces from the battle's rule state, then marks the cracks. */
export function liveBridges(s: BattleState, v: BoardView): BoardView {
  if (!hasBridges(v)) return v;
  const own = parseBridges(s.rules?.[COLLAPSE_RULE_ID]);
  v.tiles.forEach((t, i) => {
    if (!t.piece) return;
    if (t.piece.id !== SPAN_PIECE && t.piece.id !== KEYSTONE_PIECE) return;
    const a = bridgeArtOf(t.piece.data);
    const live = own.stone[tileKey(i % v.width, Math.floor(i / v.width))];
    setData(t, {
      stone: live ?? a.stone,
      max: a.max,
      cracked: false,
      ...(t.piece.id === KEYSTONE_PIECE ? { keystone: true } : {}),
    });
  });
  markCracks(v);
  return v;
}

/** The tiles of the cracked set in a view, in reading order. */
export function crackedTiles(v: BoardView): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  v.tiles.forEach((t, i) => {
    if (t.piece?.id === SPAN_PIECE && bridgeArtOf(t.piece.data).cracked)
      out.push({ x: i % v.width, y: Math.floor(i / v.width) });
  });
  return out;
}

/** A bridge event's change to the view: stone worn or mended, a pier laid, tiles fallen to fog. */
export function projectBridge(v: BoardView, e: DistrictEvent): void {
  const tileAt = (c: { x: number; y: number } | undefined): TileView | undefined =>
    c && c.x >= 0 && c.y >= 0 && c.x < v.width && c.y < v.height
      ? v.tiles[c.y * v.width + c.x]
      : undefined;
  const d = (typeof e.data === 'object' && e.data !== null ? e.data : {}) as Record<
    string,
    unknown
  >;
  switch (e.type) {
    case 'bridges:stoneWorn': {
      const t = tileAt(e.at);
      if (!t?.piece || typeof d.to !== 'number') break;
      setData(t, { ...bridgeArtOf(t.piece.data), stone: d.to });
      markCracks(v);
      break;
    }
    case 'bridges:mended': {
      const t = tileAt(e.at);
      if (!t || typeof d.stone !== 'number') break;
      t.drop = false;
      t.piece = { id: SPAN_PIECE, art: SPAN_PIECE, label: 'span', data: {} };
      setData(t, { stone: d.stone, max: Math.max(d.stone, 1), cracked: false });
      markCracks(v);
      break;
    }
    case 'bridges:pierLaid': {
      const t = tileAt(e.at);
      if (!t?.piece) break;
      t.piece = { ...t.piece, id: PIER_PIECE, art: PIER_PIECE, label: 'pier', data: null };
      markCracks(v);
      break;
    }
    case 'bridges:collapse': {
      const tiles = Array.isArray(d.tiles) ? (d.tiles as { x: number; y: number }[]) : [];
      for (const c of tiles) {
        const t = tileAt(c);
        if (!t) continue;
        t.piece = null;
        t.drop = true;
        // The engine clears whatever was set into a falling tile (a Lay'd layer, BR-17).
        t.state = null;
        t.jar = null; // so does a jar sealed there (and, unseen, heat)
        t.rounds = 0;
        t.hits = 0;
      }
      markCracks(v);
      break;
    }
    default:
      break;
  }
}
