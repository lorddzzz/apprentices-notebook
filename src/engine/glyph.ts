import { RUNES, type RuneId, TUNING } from '$data';
import type { Cluster } from './cluster';
import { type Coord, DIRS, type Dir, key, sameCoord } from './grid';
import { compileLattice } from './lattice';
import type {
  CellKey,
  GlyphArg,
  GlyphDef,
  GlyphLibrary,
  Lattice,
  Placed,
  PlacedGlyph,
  PlacedRune,
} from './types';
import { isGlyph } from './types';

/** Glyphs (design research-and-mastery §4.4): cost, local-frame rotation and the Fair Copy collapse. */

/**
 * Ink for a Glyph before outer auras and before its Economy discount: max(1, Σ inner − floor(cells / 3)).
 * Ink is per family, so an argument costs what its default does (M23).
 */
export function baseGlyphCost(g: GlyphDef): number {
  const inner = g.cells.reduce((sum, c) => sum + TUNING.inkCost[RUNES[c.rune].family], 0);
  return Math.max(1, inner - Math.floor(g.cells.length / 3));
}

/** Ink for a placed Glyph before outer auras: the base cost less its Economy discount, at least 1. */
export function glyphCost(g: GlyphDef): number {
  const base = baseGlyphCost(g);
  return Math.max(1, base - (g.discount ?? 0));
}

/** The families an open cell can have; a Source or an Aura never takes an argument (M21). */
const PARAM_FAMILIES: readonly string[] = ['material', 'trigger', 'shape'];

/** Whether a default rune could be left open (Material, Trigger or Shape). */
export const canBeOpen = (rune: RuneId): boolean => PARAM_FAMILIES.includes(RUNES[rune].family);

/**
 * What is wrong with an argument for `def`'s cell `at`, or null when it is fine: the cell has to
 * exist, be one of the Glyph's open cells, and the rune has to be of the default's family (M21).
 */
export function argIssue(def: GlyphDef, at: CellKey, arg: GlyphArg): string | null {
  const cell = def.cells.find((c) => key(c.at) === at);
  if (!cell) return `has no cell ${at}`;
  if (!def.params.includes(at)) return `cell ${at} is not open`;
  if (!canBeOpen(cell.rune)) return `cell ${at} cannot take an argument`;
  const family = RUNES[cell.rune].family;
  if (RUNES[arg.rune].family !== family) {
    return `${RUNES[arg.rune].name} is not a ${family} rune, cell ${at} takes one`;
  }
  return null;
}

/**
 * The Glyph's cells as one placement sees them: each open cell holds its argument in place of the
 * default, an arrow argument starting at the default's arrow (or right). A bad or missing argument
 * leaves the default, so the compiler never throws on a stale save (M21).
 */
export function cellsWithArgs(
  def: GlyphDef,
  args?: Readonly<Record<CellKey, GlyphArg>>,
): readonly PlacedRune[] {
  if (!args) return def.cells;
  return def.cells.map((cell) => {
    const k = key(cell.at);
    const arg = args[k];
    if (!arg || argIssue(def, k, arg) !== null) return cell;
    if (!RUNES[arg.rune].arrow) return { at: cell.at, rune: arg.rune };
    return { at: cell.at, rune: arg.rune, dir: arg.dir ?? cell.dir ?? 'right' };
  });
}

/**
 * The runes a placed Glyph uses from the collection: its inner runes, an argument in place of an
 * open cell's default (M23).
 */
export function glyphRunes(def: GlyphDef, args?: Readonly<Record<CellKey, GlyphArg>>): RuneId[] {
  return cellsWithArgs(def, args).map((c) => c.rune);
}

/**
 * The Glyph with `local` as its one open cell, or none (the Fair Copy sheet, M22). Throws when the
 * cell can't be open (no rune there, or a Source or Aura).
 */
export function withOpenCell(def: GlyphDef, local: Coord | null): GlyphDef {
  if (local === null) return { ...def, params: [] };
  const cell = def.cells.find((c) => sameCoord(c.at, local));
  if (!cell) throw new Error(`No rune at ${key(local)} to leave open`);
  if (!canBeOpen(cell.rune)) {
    throw new Error(`${RUNES[cell.rune].name} at ${key(local)} can't be left open`);
  }
  return { ...def, params: [key(local)] };
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
    version: 1,
    params: [],
    extraExit: null,
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
