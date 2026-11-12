import { ENEMIES, type EnemyId } from '$data';
import { type Coord, sameCoord } from '../grid';
import { type BoardSpec, parseCell, serializeBoard } from '../notation';
import { createRng, deriveSeed } from '../rng';
import { ROOM_LIMITS } from '../rooms';

/**
 * The heart frames' shared steps (KIT-R3b; P7), lifted unchanged from the ink quarter's exemplar.
 * A district lists its master's placements (`placementsFrom` reads them off its first authored
 * heart), and `placeFrame` puts them on any board of an allowed size, pure and seeded:
 *   1. a seeded mirror of the layout and a lean for the first placement;
 *   2. each placement lands on its spot, or on the nearest bare tile in reading order, so no size
 *      can lose a piece or stack two;
 *   3. start points are topped up on the bottom rows to `ROOM_LIMITS.minStarts`.
 */

export interface Placement {
  token: string;
  /** Preferred spot as a fraction of width and height (0 to 1), before mirroring. */
  at: { x: number; y: number };
}

const dist = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const cellIndex = (b: BoardSpec, c: Coord): number => c.y * b.width + c.x;

/** No unit, piece, start point, terrain flag or state: a tile a placement may take. */
export function bare(b: BoardSpec, c: Coord): boolean {
  const t = b.tiles[cellIndex(b, c)];
  if (!t) return false;
  const g = t.terrain;
  return (
    t.piece === null &&
    t.state === null &&
    g.water === null &&
    !g.drop &&
    !g.vent &&
    !g.grate &&
    !g.gate &&
    !g.lamp &&
    !b.units.some((u) => sameCoord(u.at, c)) &&
    !b.starts.some((s) => sameCoord(s, c))
  );
}

/** The bare tile nearest `want`, ties in reading order. Null only on a full board. */
export function settle(b: BoardSpec, want: Coord): Coord | null {
  let best: Coord | null = null;
  for (let y = 0; y < b.height; y++) {
    for (let x = 0; x < b.width; x++) {
      const c = { x, y };
      if (bare(b, c) && (!best || dist(c, want) < dist(best, want))) best = c;
    }
  }
  return best;
}

/** One cell as its notation token (unit, terrain, state, piece), read through the serializer. */
function tokenAt(source: BoardSpec, at: Coord): string {
  const tile = source.tiles[cellIndex(source, at)];
  if (!tile) return '.';
  const unit = source.units.find((u) => sameCoord(u.at, at));
  const one = serializeBoard({
    width: 1,
    height: 1,
    tiles: [tile],
    units: unit ? [{ ...unit, at: { x: 0, y: 0 } }] : [],
  });
  return one.trim() || '.';
}

/**
 * Every unit, piece and terrain cell of `source` that is neither plain nor a start point, as a
 * fraction of the board: the master first (the first boss, else the first unit), then the other
 * units, then pieces, then terrain, each group in reading order.
 */
export function placementsFrom(source: BoardSpec): Placement[] {
  const unitAt = (c: Coord) => source.units.find((u) => sameCoord(u.at, c));
  const cells: { c: Coord; group: number }[] = [];
  const master =
    source.units.find((u) => u.kind === 'enemy' && ENEMIES[u.def as EnemyId]?.boss) ??
    source.units[0];
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const c = { x, y };
      if (source.starts.some((s) => sameCoord(s, c))) continue;
      const tile = source.tiles[cellIndex(source, c)];
      if (!tile) continue;
      const g = tile.terrain;
      const unit = unitAt(c);
      const terrain =
        tile.state !== null || g.water !== null || g.drop || g.vent || g.grate || g.gate || g.lamp;
      if (!unit && !tile.piece && !terrain) continue;
      const group = unit === master ? 0 : unit ? 1 : tile.piece ? 2 : 3;
      cells.push({ c, group });
    }
  }
  cells.sort((a, b) => a.group - b.group);
  const wMax = Math.max(1, source.width - 1);
  const hMax = Math.max(1, source.height - 1);
  return cells.map(({ c }) => ({
    token: tokenAt(source, c),
    at: { x: c.x / wMax, y: c.y / hMax },
  }));
}

/** A structure stamped before the placements settle: it may edit the copy and read the mirror. */
export type Structure = (out: BoardSpec, mirror: boolean) => void;

export function placeFrame(
  board: BoardSpec,
  seed: number,
  salt: number,
  placements: readonly Placement[],
  structure?: Structure,
): BoardSpec {
  const rng = createRng(deriveSeed(seed, salt));
  const mirror = rng.int(0, 1) === 1;
  const lean = rng.int(-1, 1);
  const out: BoardSpec = {
    ...board,
    tiles: board.tiles.map((t) => ({ ...t, terrain: { ...t.terrain } })),
    units: [...board.units],
    starts: [...board.starts],
  };
  structure?.(out, mirror);
  placements.forEach((p, i) => {
    const fx = mirror ? 1 - p.at.x : p.at.x;
    const x = Math.round(fx * (out.width - 1)) + (i === 0 ? lean : 0);
    const want = {
      x: Math.min(out.width - 1, Math.max(0, x)),
      y: Math.round(p.at.y * (out.height - 1)),
    };
    const at = settle(out, want);
    if (!at) return;
    const cell = parseCell(p.token, at);
    if (cell.unit) out.units.push(cell.unit);
    out.tiles[cellIndex(out, at)] = { ...cell.tile, terrain: { ...cell.tile.terrain } };
  });
  out.units.sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  for (let y = out.height - 1; y >= 0 && out.starts.length < ROOM_LIMITS.minStarts; y--) {
    for (let x = 0; x < out.width && out.starts.length < ROOM_LIMITS.minStarts; x++) {
      if (bare(out, { x, y })) out.starts.push({ x, y });
    }
  }
  out.starts.sort((a, b) => a.y - b.y || a.x - b.x);
  return out;
}
