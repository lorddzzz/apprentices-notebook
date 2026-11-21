import { GEN_LIMITS } from '$data/drawing';
import {
  KEYSTONE_PIECE,
  PIER_PIECE,
  SPAN_PIECE,
  // biome-ignore lint/style/noRestrictedImports: the bridges' own piece ids (types only, cycle-free)
} from '../districts/bridges/types';
import { type Coord, key } from '../grid';
import type { BoardSpec } from '../notation';
import { pieceVoid } from '../pieces';
import { blocksShots, blocksUnits } from '../queries';
import type { Tile } from '../types';
import { at, coords } from './kits/seam';

/**
 * One reach rule for the generator, the paper kit and the bridge kits (CAL-5G): the party walks
 * on what the engine lets a unit stand on (`standableTile`), after every unsupported span has
 * fallen, and a foe counts as reached when it stands in that region or a bolt of at most
 * `GEN_LIMITS.castReach` tiles in a straight line can land on the region (any foe: the party casts
 * at what it cannot walk to).
 */

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;

const isPiece = (layout: BoardSpec, c: Coord, id: string): boolean =>
  at(layout, c)?.piece?.id === id;
const isNet = (layout: BoardSpec, c: Coord): boolean =>
  isPiece(layout, c, SPAN_PIECE) ||
  isPiece(layout, c, PIER_PIECE) ||
  isPiece(layout, c, KEYSTONE_PIECE);

/**
 * Span tiles in a network (spans, piers and keystones, 4-connected) that holds no pier or keystone:
 * the tiles the collapse would drop at the first dusk (the district's support model, P2).
 */
export function unsupportedSpans(layout: BoardSpec): Coord[] {
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const start of coords(layout)) {
    if (!isNet(layout, start) || seen.has(key(start))) continue;
    const group: Coord[] = [];
    const queue = [start];
    seen.add(key(start));
    for (let c = queue.pop(); c; c = queue.pop()) {
      group.push(c);
      for (const d of DIRS) {
        const n = { x: c.x + d.x, y: c.y + d.y };
        if (isNet(layout, n) && !seen.has(key(n))) {
          seen.add(key(n));
          queue.push(n);
        }
      }
    }
    if (group.every((c) => isPiece(layout, c, SPAN_PIECE))) out.push(...group);
  }
  return out;
}

/** The keys of the tiles the collapse's first step drops (empty on a board with no spans). */
export const fallenSpans = (layout: BoardSpec): Set<string> =>
  new Set(unsupportedSpans(layout).map(key));

/** The engine's own footing (`standableTile`) on a tile of a layout. */
const footing = (t: Tile): boolean =>
  !blocksUnits(t) && !t.terrain.drop && t.terrain.water === null && !pieceVoid(t);

/** A tile a walker can stand on once `gone` has fallen. */
export function standsAfter(layout: BoardSpec, c: Coord, gone: ReadonlySet<string>): boolean {
  const t = at(layout, c);
  return t !== undefined && !gone.has(key(c)) && footing(t);
}

/** Tiles the party can walk to from its first start point on foot (units ignored), as `key`s. */
export function footRegion(
  layout: BoardSpec,
  gone: ReadonlySet<string> = fallenSpans(layout),
): Set<string> {
  const start = layout.starts[0];
  if (!start || !standsAfter(layout, start, gone)) return new Set();
  const seen = new Set([key(start)]);
  const queue = [start];
  for (let c = queue.pop(); c; c = queue.pop()) {
    for (const d of DIRS) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      if (!seen.has(key(n)) && standsAfter(layout, n, gone)) {
        seen.add(key(n));
        queue.push(n);
      }
    }
  }
  return seen;
}

/** The bolt's reach: a tile in line with one of the region, nothing standing up between. */
export function castReach(layout: BoardSpec, region: ReadonlySet<string>, c: Coord): boolean {
  for (const d of DIRS) {
    for (let i = 1; i <= GEN_LIMITS.castReach; i++) {
      const n = { x: c.x + d.x * i, y: c.y + d.y * i };
      const t = at(layout, n);
      if (t === undefined) break;
      if (region.has(key(n))) return true;
      if (blocksShots(t)) break;
    }
  }
  return false;
}

/** A foe stands in the region, or the party can cast at it: any foe within `castReach` of the region in a line. */
export function foeReached(
  layout: BoardSpec,
  region: ReadonlySet<string>,
  unit: { def: string; at: Coord },
): boolean {
  return region.has(key(unit.at)) || castReach(layout, region, unit.at);
}

/** Whether every start is joined to the first on foot, and the points and foes the party cannot reach. */
export function partyReach(layout: BoardSpec): { startsJoined: boolean; unreached: Coord[] } {
  const region = footRegion(layout);
  const lost = layout.starts.filter((c) => !region.has(key(c)));
  const foes = layout.units.filter((u) => u.kind === 'enemy' && !foeReached(layout, region, u));
  return {
    startsJoined: layout.starts.length > 0 && lost.length === 0,
    unreached: [...lost, ...foes.map((u) => u.at)],
  };
}
