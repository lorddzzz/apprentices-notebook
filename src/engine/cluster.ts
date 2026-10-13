import { IDIOMS, type IdiomStep, RUNES, type RuneId, TUNING } from '$data';
import { rotateDirLocal, rotateLocal } from './glyph';
import { byReadingOrder, type Coord, DIRS, type Dir, key, sameCoord, step } from './grid';
import { compileLattice } from './lattice';
import type { CellKey, GlyphDef, GlyphLibrary, Lattice, PlacedRune, Spell } from './types';
import { isGlyph } from './types';

/** Clusters (design research-and-mastery §4.1): prefix-closed subtrees of a spell's flow tree. */

export interface Cluster {
  root: Coord; // the entry cell (a Source for a Spell cluster)
  cells: readonly Coord[]; // flow cells incl. root, 3..8, walk order
  auras: readonly Coord[]; // auras touching the cells (travel with it, plan P3)
  kind: 'spell' | 'payload';
}

/** A cell as the canonical form and proof masks see it (a `FiredCell` fits). */
export interface CanonCell {
  at: Coord;
  rune: string | null;
  glyph?: string;
  dir?: Dir;
}

// ── Rotation helpers (quarter turns clockwise) ──────────

const turnCoord = (c: Coord, turns: number): Coord => {
  let out = { x: c.x + 0, y: c.y + 0 };
  for (let i = 0; i < turns; i++) out = { x: 0 - out.y, y: out.x };
  return out;
};
export const turnDir = (d: Dir, turns: number): Dir => DIRS[(DIRS.indexOf(d) + turns) % 4] as Dir;

/** What a cell must equal for a mask to contain it: rune (or Glyph) and arrow. */
export const cellToken = (c: CanonCell): string =>
  `${c.glyph !== undefined ? `G:${c.glyph}` : (c.rune ?? '_')}${c.dir ? `:${c.dir}` : ''}`;

/** Canonical form: invariant under rotation and translation, not mirroring; arrows rotate with cells. */
export function canonical(cells: readonly CanonCell[]): string {
  let best = '';
  for (let t = 0; t < 4; t++) {
    const turned = cells.map((c) => ({
      at: turnCoord(c.at, t),
      token: cellToken(c.dir ? { ...c, dir: turnDir(c.dir, t) } : c),
    }));
    const minX = Math.min(...turned.map((c) => c.at.x));
    const minY = Math.min(...turned.map((c) => c.at.y));
    const text = turned
      .map((c) => ({ x: c.at.x - minX, y: c.at.y - minY, token: c.token }))
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((c) => `${c.x},${c.y}=${c.token}`)
      .join(';');
    if (best === '' || text < best) best = text;
  }
  return best;
}

// ── Flow trees ──────────────────────────────────────────

interface FlowCell {
  at: Coord;
  rune: RuneId | null; // null: a Glyph socket
  dir?: Dir;
  parent: number;
  children: number[];
}

const isShape = (r: RuneId | null): boolean => r !== null && RUNES[r].family === 'shape';

/** The cells a spell's flow touches on the way to a node, as a tree in walk order (root first). */
function flowTree(spell: Spell, placedAt: ReadonlyMap<CellKey, PlacedRune | 'glyph'>): FlowCell[] {
  const cells: FlowCell[] = [];
  const index = new Map<CellKey, number>();
  const add = (at: Coord, parent: number): number => {
    const known = index.get(key(at));
    if (known !== undefined) return known;
    const p = placedAt.get(key(at));
    const rune = p && p !== 'glyph' ? p.rune : null;
    const cell: FlowCell = { at: { ...at }, rune, parent, children: [] };
    if (p && p !== 'glyph' && p.dir) cell.dir = p.dir;
    cells.push(cell);
    index.set(key(at), cells.length - 1);
    cells[parent]?.children.push(cells.length - 1);
    return cells.length - 1;
  };
  const walk = (nodes: Spell['nodes'], parent: number): void => {
    for (const node of nodes) {
      let cur = parent;
      for (const c of [...(node.via ?? []), node.at]) cur = add(c, cur);
      walk(node.next, cur);
    }
  };
  add(spell.at, -1);
  walk(spell.nodes, 0);
  return cells;
}

function placedMap(l: Lattice): Map<CellKey, PlacedRune | 'glyph'> {
  return new Map(l.runes.map((r) => [key(r.at), isGlyph(r) ? 'glyph' : r]));
}

/** Every prefix-closed subset of the tree below `root` that holds the root, 3..8 cells. */
function subtreesFrom(cells: readonly FlowCell[], root: number): number[][] {
  const order: number[] = [];
  const visit = (i: number): void => {
    order.push(i);
    for (const c of cells[i]?.children ?? []) visit(c);
  };
  visit(root);
  const out: number[][] = [];
  const rec = (at: number, chosen: number[], inside: Set<number>): void => {
    if (at === order.length) {
      if (chosen.length >= TUNING.glyphMinCells) out.push(chosen);
      return;
    }
    const i = order[at] as number;
    const cell = cells[i] as FlowCell;
    if (chosen.length < TUNING.glyphMaxCells && cell.rune !== null && inside.has(cell.parent)) {
      inside.add(i);
      rec(at + 1, [...chosen, i], inside);
      inside.delete(i);
    }
    rec(at + 1, chosen, inside);
  };
  const first = cells[root];
  if (first && first.rune !== null) rec(1, [root], new Set([root]));
  return out;
}

/** Auras that touch any of the cells, in touch order (from the compiled aura touches). */
function aurasTouching(
  touches: readonly { from: Coord; to: Coord }[],
  cells: readonly Coord[],
): Coord[] {
  const out: Coord[] = [];
  for (const t of touches) {
    if (cells.some((c) => sameCoord(c, t.to)) && !out.some((a) => sameCoord(a, t.from))) {
      out.push({ ...t.from });
    }
  }
  return out;
}

/**
 * Every cluster of every spell: any connected subtree that holds its own root, 3..8 flow cells,
 * with the auras touching it. The root is a Source (Spell) or any other flow cell (Payload).
 * Clusters that would hold a Glyph socket are skipped.
 */
export function clustersOf(l: Lattice, glyphs: GlyphLibrary = {}): Cluster[] {
  const compiled = compileLattice(l, [], glyphs);
  const placedAt = placedMap(l);
  const out: Cluster[] = [];
  for (const spell of compiled.spells) {
    const tree = flowTree(spell, placedAt);
    for (let r = 0; r < tree.length; r++) {
      const root = tree[r] as FlowCell;
      if (root.rune === null) continue;
      const kind = RUNES[root.rune].family === 'source' ? 'spell' : 'payload';
      for (const picked of subtreesFrom(tree, r)) {
        const cells = picked.map((i) => (tree[i] as FlowCell).at);
        out.push({
          root: { ...root.at },
          cells,
          auras: aurasTouching(compiled.auraTouches, cells),
          kind,
        });
      }
    }
  }
  return out;
}

/** Auras touching the cluster that also touch cells outside it: they block the Fair Copy (plan P3). */
export function blockingAuras(l: Lattice, cluster: Cluster, glyphs: GlyphLibrary = {}): Coord[] {
  const touches = compileLattice(l, [], glyphs).auraTouches;
  const inside = new Set<CellKey>(cluster.cells.map(key));
  const out: Coord[] = [];
  for (const t of touches) {
    if (!cluster.auras.some((a) => sameCoord(a, t.from))) continue;
    if (inside.has(key(t.to)) || out.some((a) => sameCoord(a, t.from))) continue;
    out.push({ ...t.from });
  }
  return out.sort(byReadingOrder);
}

/**
 * Cluster cells that another spell's flow also runs through (or enters at the root), with that
 * spell's source cell. The Fair Copy would silently cut such a spell, so it is refused.
 */
export function sharingSpells(
  l: Lattice,
  cluster: Cluster,
  glyphs: GlyphLibrary = {},
): { cell: Coord; source: Coord }[] {
  const placedAt = placedMap(l);
  const trees = compileLattice(l, [], glyphs).spells.map((spell) => ({
    spell,
    tree: flowTree(spell, placedAt),
  }));
  const holdsAll = (t: FlowCell[]): boolean =>
    cluster.cells.every((c) => t.some((x) => sameCoord(x.at, c)));
  const own =
    cluster.kind === 'spell'
      ? trees.find((t) => sameCoord(t.spell.at, cluster.root))
      : trees.find((t) => holdsAll(t.tree));
  const out: { cell: Coord; source: Coord }[] = [];
  for (const t of trees) {
    if (t === own) continue;
    const hit = cluster.cells.find((c) => t.tree.some((x) => sameCoord(x.at, c)));
    if (hit) out.push({ cell: { ...hit }, source: { ...t.spell.at } });
  }
  return out;
}

/** The cluster cells another spell's flow shares (see `sharingSpells`), in reading order. */
export function sharedCells(l: Lattice, cluster: Cluster, glyphs: GlyphLibrary = {}): Coord[] {
  const cells: Coord[] = [];
  for (const s of sharingSpells(l, cluster, glyphs)) {
    if (!cells.some((c) => sameCoord(c, s.cell))) cells.push(s.cell);
  }
  return cells.sort(byReadingOrder);
}

// ── Idioms ──────────────────────────────────────────────

/** Ids of the idioms one branch (shapes already skipped, source first for spells) matches. */
export function matchBranch(branch: readonly RuneId[]): string[] {
  const fits = (r: RuneId, st: IdiomStep): boolean => {
    const def = RUNES[r];
    if (st.family !== undefined && def.family !== st.family) return false;
    return st.aspects === undefined || st.aspects.some((a) => def.aspects.includes(a));
  };
  // An ordered subsequence: a source-first idiom must start at the source; the rest may skip runes.
  return IDIOMS.filter((idiom) => {
    const [first] = idiom.steps;
    let from = 0;
    for (const [k, st] of idiom.steps.entries()) {
      if (k === 0 && first?.family === 'source') {
        const head = branch[0];
        if (head === undefined || !fits(head, st)) return false;
        from = 1;
        continue;
      }
      const hit = branch.findIndex((r, i) => i >= from && fits(r, st));
      if (hit < 0) return false;
      from = hit + 1;
    }
    return true;
  }).map((i) => i.id);
}

// ── Glyph definition ────────────────────────────────────

/** The direction flow travels when it enters the root: a Source's arrow, else the spell's path. */
function entryDirOf(l: Lattice, root: Coord, glyphs: GlyphLibrary): Dir {
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

/** The inverse quarter turn of `rotateLocal(_, d)`. */
const inverseOf = (d: Dir): Dir => (d === 'up' ? 'down' : d === 'down' ? 'up' : d);

/**
 * The cluster as a Glyph: cells (auras included) in a local frame where the entry direction is
 * 'right' and the root sits at (0,0); exits where flow leaves it, in walk order (plan P4).
 */
export function toGlyphDef(
  l: Lattice,
  cluster: Cluster,
  name: string,
  id: string,
  glyphs: GlyphLibrary = {},
): GlyphDef {
  const dir = entryDirOf(l, cluster.root, glyphs);
  const back = inverseOf(dir);
  const local = (at: Coord): Coord =>
    rotateLocal({ x: at.x - cluster.root.x, y: at.y - cluster.root.y }, back);
  const cells: PlacedRune[] = [];
  for (const at of [...cluster.cells, ...cluster.auras]) {
    const r = l.runes.find((p) => sameCoord(p.at, at));
    if (!r || isGlyph(r)) continue;
    cells.push(
      r.dir
        ? { at: local(at), rune: r.rune, dir: rotateDirLocal(r.dir, back) }
        : { at: local(at), rune: r.rune },
    );
  }
  const placedAt = placedMap(l);
  const inside = new Set<CellKey>(cluster.cells.map(key));
  const exits: GlyphDef['exits'][number][] = [];
  let idiom: string | null = null;
  for (const spell of compileLattice(l, [], glyphs).spells) {
    const tree = flowTree(spell, placedAt);
    const rootIdx = tree.findIndex((c) => sameCoord(c.at, cluster.root));
    if (rootIdx < 0 || !cluster.cells.every((c) => tree.some((t) => sameCoord(t.at, c)))) continue;
    for (const cell of tree) {
      if (!inside.has(key(cell.at))) continue;
      for (const ci of cell.children) {
        const child = tree[ci] as FlowCell;
        const d = DIRS.find((x) => sameCoord(step(cell.at, x), child.at));
        if (inside.has(key(child.at)) || !d) continue;
        exits.push({ from: local(cell.at), dir: rotateDirLocal(d, back) });
      }
    }
    idiom = firstIdiom(tree, rootIdx, inside);
    break;
  }
  return { id, name, kind: cluster.kind, cells, entry: { x: 0, y: 0 }, exits, idiom };
}

/** The first idiom some root-to-leaf branch of the cluster matches. */
function firstIdiom(tree: readonly FlowCell[], root: number, inside: ReadonlySet<CellKey>) {
  const branches: RuneId[][] = [];
  const walk = (i: number, so_far: RuneId[]): void => {
    const cell = tree[i] as FlowCell;
    const here = cell.rune !== null && !isShape(cell.rune) ? [...so_far, cell.rune] : so_far;
    const next = cell.children.filter((c) => inside.has(key((tree[c] as FlowCell).at)));
    if (next.length === 0) branches.push(here);
    for (const c of next) walk(c, here);
  };
  walk(root, []);
  const found = new Set(branches.flatMap(matchBranch));
  return IDIOMS.find((i) => found.has(i.id))?.id ?? null;
}
