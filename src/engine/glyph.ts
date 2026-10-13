import { RUNES, TUNING } from '$data';
import type { Cluster } from './cluster';
import { type Coord, DIRS, type Dir, key, sameCoord } from './grid';
import { compileLattice } from './lattice';
import type {
  CellKey,
  GlyphDef,
  GlyphLibrary,
  Lattice,
  Placed,
  PlacedGlyph,
  PlacedRune,
} from './types';
import { isGlyph } from './types';

/** Glyphs (design research-and-mastery §4.4): cost, local-frame rotation and the Fair Copy collapse. */

/** Ink for a placed Glyph before outer auras: max(1, Σ inner − floor(cells / 3)). */
export function glyphCost(g: GlyphDef): number {
  const inner = g.cells.reduce((sum, c) => sum + TUNING.inkCost[RUNES[c.rune].family], 0);
  return Math.max(1, inner - Math.floor(g.cells.length / 3));
}

/** Quarter turns clockwise that take local 'right' to `dir`. */
const quarterTurns = (dir: Dir): number => (DIRS.indexOf(dir) + 3) % 4;

function turnCoord(c: Coord, turns: number): Coord {
  let out = { x: c.x + 0, y: c.y + 0 };
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) out = { x: 0 - out.y, y: out.x };
  return out;
}

/** A local offset rotated so the local 'right' points `dir`. */
export function rotateLocal(c: Coord, dir: Dir): Coord {
  return turnCoord(c, quarterTurns(dir));
}

/** A local direction as seen in a frame whose 'right' points `dir`. */
export function rotateDirLocal(d: Dir, dir: Dir): Dir {
  return DIRS[(DIRS.indexOf(d) + quarterTurns(dir)) % 4] as Dir;
}

/** Inverse of `rotateDirLocal`: an outer direction expressed in the Glyph's local frame. */
function unrotateDir(d: Dir, dir: Dir): Dir {
  return DIRS[(DIRS.indexOf(d) + 4 - quarterTurns(dir)) % 4] as Dir;
}

function entryDir(l: Lattice, root: Coord, glyphs: GlyphLibrary): Dir {
  const rooted = l.runes.find((r) => sameCoord(r.at, root));
  if (rooted && !isGlyph(rooted) && RUNES[rooted.rune].family === 'source') {
    return rooted.dir ?? 'right';
  }
  for (const spell of compileLattice(l, [], glyphs).spells) {
    const cell = spell.path.find((p) => p.inner === undefined && sameCoord(p.at, root));
    if (cell) return cell.dir;
  }
  return 'right';
}

/** Collapses the cluster into its entry socket holding `glyph` (plan P2). */
export function fairCopy(
  l: Lattice,
  cluster: Cluster,
  glyph: GlyphDef,
  glyphs: GlyphLibrary = {},
): Lattice {
  const gone = new Set<CellKey>([...cluster.cells, ...cluster.auras].map(key));
  const placed: PlacedGlyph = {
    at: { ...cluster.root },
    glyph: glyph.id,
    dir: entryDir(l, cluster.root, glyphs),
  };
  const runes: Placed[] = [...l.runes.filter((r) => !gone.has(key(r.at))), placed];
  runes.sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  return { shape: l.shape, runes };
}

/** The cluster as a throwaway Glyph, so `disconnected` can compile the collapsed lattice. */
function provisionalGlyph(l: Lattice, cluster: Cluster, glyphs: GlyphLibrary): GlyphDef {
  const dir = entryDir(l, cluster.root, glyphs);
  const members = new Set<CellKey>([...cluster.cells, ...cluster.auras].map(key));
  const cells: PlacedRune[] = [];
  for (const r of l.runes) {
    if (isGlyph(r) || !members.has(key(r.at))) continue;
    const offset = { x: r.at.x - cluster.root.x, y: r.at.y - cluster.root.y };
    const at = turnCoord(offset, -quarterTurns(dir));
    cells.push(r.dir ? { at, rune: r.rune, dir: unrotateDir(r.dir, dir) } : { at, rune: r.rune });
  }
  return {
    id: '__provisional',
    name: 'Provisional',
    kind: cluster.kind,
    cells,
    entry: { x: 0, y: 0 },
    exits: [],
    idiom: null,
  };
}

/** Runes outside the cluster that would no longer be reached after the collapse (plan P2). */
export function disconnected(l: Lattice, cluster: Cluster, glyphs: GlyphLibrary = {}): Coord[] {
  const glyph = provisionalGlyph(l, cluster, glyphs);
  const library: GlyphLibrary = { ...glyphs, [glyph.id]: glyph };
  const before = new Set(compileLattice(l, [], glyphs).reached);
  const after = new Set(compileLattice(fairCopy(l, cluster, glyph, glyphs), [], library).reached);
  const inside = new Set<CellKey>([...cluster.cells, ...cluster.auras].map(key));
  return l.runes
    .map((r) => r.at)
    .filter((at) => !inside.has(key(at)) && before.has(key(at)) && !after.has(key(at)));
}
