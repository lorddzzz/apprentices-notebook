import { IDIOMS, type MemberId, type RuneId, TUNING } from '$data';
import { type Cluster, cellToken, clustersOf, matchBranch, turnDir } from './cluster';
import type { EventLog } from './events';
import { type Coord, key, sameCoord } from './grid';
import { compileLattice } from './lattice';
import type { FiredCell, GlyphLibrary, Lattice, SpellNode } from './types';
import { isGlyph } from './types';

/** Proof (design research-and-mastery §4.2, plan P6/P7): cast masks from trace events. */

/** The meaningful player casts of `member` in a log, as fired-cell masks. */
export function masksFrom(events: EventLog, member: MemberId): FiredCell[][] {
  const out: FiredCell[][] = [];
  for (const e of events) {
    if (e.type === 'trace' && e.meaningful && e.caster.id === member) out.push(e.cells);
  }
  return out;
}

interface Offset {
  x: number;
  y: number;
  token: string;
}

/** The cluster's cells (rune + arrow) relative to its first cell, for each of 4 quarter turns. */
function rotations(l: Lattice, cluster: Cluster): Offset[][] {
  const cells = cluster.cells.flatMap((at) => {
    const r = l.runes.find((p) => sameCoord(p.at, at));
    return r && !isGlyph(r) ? [{ at, rune: r.rune, ...(r.dir ? { dir: r.dir } : {}) }] : [];
  });
  if (cells.length !== cluster.cells.length) return []; // a Glyph socket: never matched
  return [0, 1, 2, 3].map((t) => {
    const turned = cells.map((c) => {
      let p: Coord = { x: c.at.x + 0, y: c.at.y + 0 };
      for (let i = 0; i < t; i++) p = { x: 0 - p.y, y: p.x };
      return { p, token: cellToken(c.dir ? { ...c, dir: turnDir(c.dir, t) } : c) };
    });
    const [first] = turned;
    if (!first) return [];
    return turned.map((c) => ({ x: c.p.x - first.p.x, y: c.p.y - first.p.y, token: c.token }));
  });
}

type MaskIndex = Map<string, string>[];

const indexMasks = (masks: readonly FiredCell[][]): MaskIndex =>
  masks.map((m) => new Map(m.map((c) => [key(c.at), cellToken(c)])));

function inMask(rots: readonly Offset[][], mask: ReadonlyMap<string, string>): boolean {
  return rots.some((rot) => {
    const [anchor] = rot;
    if (!anchor) return false;
    for (const [k, token] of mask) {
      if (token !== anchor.token) continue;
      const [x, y] = k.split(',').map(Number) as [number, number];
      if (rot.every((o) => mask.get(`${x + o.x - anchor.x},${y + o.y - anchor.y}`) === o.token)) {
        return true;
      }
    }
    return false;
  });
}

function countIn(l: Lattice, cluster: Cluster, index: MaskIndex, stopAt = Infinity): number {
  const rots = rotations(l, cluster);
  let n = 0;
  for (const mask of index) {
    if (inMask(rots, mask)) n += 1;
    if (n >= stopAt) break;
  }
  return n;
}

/** How many masks contain some rotation and translation of the cluster. */
export function provenCount(l: Lattice, cluster: Cluster, masks: readonly FiredCell[][]): number {
  return countIn(l, cluster, indexMasks(masks));
}

/** The largest proven cluster (ties: first found) that contains the cell `at`, or null. */
export function maximalProven(
  l: Lattice,
  at: Coord,
  masks: readonly FiredCell[][],
  glyphs: GlyphLibrary = {},
): Cluster | null {
  const index = indexMasks(masks);
  const candidates = clustersOf(l, glyphs)
    .filter((c) => c.cells.some((x) => sameCoord(x, at)))
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.cells.length - a.c.cells.length || a.i - b.i);
  for (const { c } of candidates) {
    if (countIn(l, c, index, TUNING.provenCasts) >= TUNING.provenCasts) return c;
  }
  return null;
}

// ── Idioms ──────────────────────────────────────────────

/** Root-to-leaf branches of a spell's nodes with the source first (shapes are never nodes). */
function branchesOf(source: RuneId, nodes: readonly SpellNode[]): RuneId[][] {
  if (nodes.length === 0) return [[source]];
  return nodes.flatMap((n) => branchesOf(n.rune, n.next).map((b) => [source, ...b]));
}

/** Ids of the idioms the lattice's spells contain. */
export function matchIdioms(l: Lattice, glyphs: GlyphLibrary = {}): string[] {
  const found = new Set<string>();
  for (const spell of compileLattice(l, [], glyphs).spells) {
    for (const branch of branchesOf(spell.source, spell.nodes)) {
      for (const id of matchBranch(branch)) found.add(id);
    }
  }
  return IDIOMS.filter((i) => found.has(i.id)).map((i) => i.id);
}
