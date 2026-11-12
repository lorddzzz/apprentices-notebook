import { BRIDGE_HEART } from '$data/districts/bridges';
import { type BoardSpec, parseBoard, parseCell } from '../../notation';
import { type Placement, placeFrame, placementsFrom } from '../frame';
import type { HeartSetup } from '../types';
import { COLLAPSE_RULE_ID, KEYSTONE_PIECE, PIER_PIECE, SPAN_PIECE } from './types';

/**
 * The bridges' heart frame (KIT-R3e; P7): the Chief Warden stands on the keystone (his placement
 * carries it), piers and fog settle by placement, and every other tile is a `{span}` as
 * `bridgeBoard` lays it. A fog cell that would leave a span cut off from every footing is dropped.
 */

const SALT = 7140;

let placements: Placement[] | null = null;
/** Read from the authored heart on first use: the notation parser is not ready at module load. */
function placementsOfHeart(): Placement[] {
  if (placements) return placements;
  const layout = BRIDGE_HEART.variants?.[0]?.layout;
  if (!layout) throw new Error('the bridges have no authored heart');
  const board = parseBoard(layout);
  // The spans are laid over every other tile afterwards; a span with a foe on it keeps its place.
  placements = placementsFrom(board).filter((p) => {
    const at = { x: 0, y: 0 };
    const cell = parseCell(p.token, at);
    return cell.unit !== null || cell.tile.piece?.id !== SPAN_PIECE;
  });
  return placements;
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Span tiles in a component of spans, piers and keystones that holds no pier or keystone. */
function crackedSpans(b: BoardSpec): number[] {
  const pieceId = (i: number) => b.tiles[i]?.piece?.id;
  const inNet = (i: number) =>
    pieceId(i) === SPAN_PIECE || pieceId(i) === PIER_PIECE || pieceId(i) === KEYSTONE_PIECE;
  const seen = new Set<number>();
  const out: number[] = [];
  for (let start = 0; start < b.tiles.length; start++) {
    if (seen.has(start) || !inNet(start)) continue;
    const group: number[] = [];
    const queue = [start];
    seen.add(start);
    for (let i = queue.pop(); i !== undefined; i = queue.pop()) {
      group.push(i);
      const x = i % b.width;
      const y = Math.floor(i / b.width);
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= b.width || ny >= b.height) continue;
        const n = ny * b.width + nx;
        if (!seen.has(n) && inNet(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    const held = group.some((i) => pieceId(i) !== SPAN_PIECE);
    if (!held) out.push(...group);
  }
  return out.sort((a, b) => a - b);
}

function layAndMend(b: BoardSpec): BoardSpec {
  const span = parseCell('{span}', { x: 0, y: 0 }).tile.piece;
  const lay = (i: number) => {
    const tile = b.tiles[i];
    if (tile && span) tile.piece = { ...span };
  };
  b.tiles.forEach((t, i) => {
    if (!t.piece && !t.terrain.drop) lay(i);
  });
  // Drop the first fog cell (reading order) beside a cut-off span, until none is cut off.
  for (let cracked = crackedSpans(b); cracked.length > 0; cracked = crackedSpans(b)) {
    const fog = b.tiles.findIndex((t, i) => {
      if (!t.terrain.drop) return false;
      const x = i % b.width;
      const y = Math.floor(i / b.width);
      return NEIGHBOURS.some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return (
          nx >= 0 && ny >= 0 && nx < b.width && ny < b.height && cracked.includes(ny * b.width + nx)
        );
      });
    });
    const tile = b.tiles[fog];
    if (!tile) break;
    tile.terrain.drop = false;
    lay(fog);
  }
  return b;
}

export const bridgesHeartFrame = (board: BoardSpec, seed: number): BoardSpec => {
  const framed = placeFrame(board, seed, SALT, placementsOfHeart());
  return layAndMend(framed);
};

export const BRIDGES_HEART: HeartSetup = {
  foe: 'chiefWarden',
  rules: [COLLAPSE_RULE_ID],
  frame: bridgesHeartFrame,
};
