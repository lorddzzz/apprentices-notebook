import { type RuneRef, TUNING } from '$data';
import { disconnected, fairCopy, rotateDirLocal, rotateLocal } from './glyph';
import { byReadingOrder, type Coord, DIRS, type Dir, key, sameCoord, step } from './grid';
import { compileLattice, isSocket, roleOf, stepChildren } from './lattice';
import type { CellKey, GlyphDef, GlyphLibrary, Lattice, PlacedRune, Spell, Step } from './types';
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
  rune: RuneRef | null; // null: a Glyph socket
  dir?: Dir;
  parent: number;
  children: number[];
}

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
  add(spell.at, -1);
  const pending: { st: Step; parent: number }[] = spell.first
    ? [{ st: spell.first, parent: 0 }]
    : [];
  while (pending.length) {
    const job = pending.pop();
    if (!job) continue;
    let cur = job.parent;
    for (const c of [...(job.st.via ?? []), job.st.at]) cur = add(c, cur);
    const children = stepChildren(job.st);
    for (let i = children.length - 1; i >= 0; i--) {
      const st = children[i];
      if (st) pending.push({ st, parent: cur });
    }
  }
  return cells;
}

function placedMap(l: Lattice): Map<CellKey, PlacedRune | 'glyph'> {
  return new Map(l.runes.map((r) => [key(r.at), isGlyph(r) ? 'glyph' : r]));
}

/** Every prefix-closed subset of the tree below `root` that holds the root, 3..8 cells. */
function subtreesFrom(cells: readonly FlowCell[], root: number): number[][] {
  const out: number[][] = [];
  const first = cells[root];
  if (!first || first.rune === null) return out;
  const pending = [{ chosen: [root], frontier: [...first.children] }];
  while (pending.length) {
    const job = pending.pop();
    if (!job) continue;
    if (!job.frontier.length || job.chosen.length === TUNING.glyphMaxCells) {
      if (job.chosen.length >= TUNING.glyphMinCells) out.push(job.chosen);
      continue;
    }
    const [i, ...rest] = job.frontier;
    if (i === undefined) continue;
    const cell = cells[i];
    // Excluding a parent prunes all its descendants in constant time.
    pending.push({ chosen: job.chosen, frontier: rest });
    if (cell && cell.rune !== null)
      pending.push({
        chosen: [...job.chosen, i],
        frontier: [...cell.children, ...rest],
      });
  }
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
 * Clusters that would hold a Glyph socket are skipped. Auras travel by orthogonal touch only,
 * whatever aura capstones the household wrote (FN P7), so a Glyph record never depends on them.
 */
export function clustersOf(l: Lattice, glyphs: GlyphLibrary = {}): Cluster[] {
  const compiled = compileLattice(l, glyphs);
  const placedAt = placedMap(l);
  const touching = new Map<CellKey, number[]>();
  compiled.auraTouches.forEach((t, i) => {
    const k = key(t.to);
    const indices = touching.get(k) ?? [];
    indices.push(i);
    touching.set(k, indices);
  });
  const out: Cluster[] = [];
  for (const spell of compiled.spells) {
    const tree = flowTree(spell, placedAt);
    for (let r = 0; r < tree.length; r++) {
      const root = tree[r] as FlowCell;
      if (root.rune === null) continue;
      const kind = roleOf(root.rune) === 'source' ? 'spell' : 'payload';
      for (const picked of subtreesFrom(tree, r)) {
        const cells = picked.map((i) => (tree[i] as FlowCell).at);
        out.push({
          root: { ...root.at },
          cells,
          auras: aurasTouching(
            cells
              .flatMap((c) => touching.get(key(c)) ?? [])
              .sort((a, b) => a - b)
              .flatMap((i) => compiled.auraTouches[i] ?? []),
            cells,
          ),
          kind,
        });
      }
    }
  }
  return out;
}

/** Auras touching the cluster that also touch cells outside it: they block the Fair Copy (plan P3). */
export function blockingAuras(l: Lattice, cluster: Cluster, glyphs: GlyphLibrary = {}): Coord[] {
  const touches = compileLattice(l, glyphs).auraTouches;
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
  const trees = compileLattice(l, glyphs).spells.map((spell) => ({
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

// ── Glyph definition ────────────────────────────────────

/** The direction flow travels when it enters the root: a Source's arrow, else the spell's path. */
function entryDirOf(l: Lattice, root: Coord, glyphs: GlyphLibrary): Dir {
  const rooted = l.runes.find((r) => sameCoord(r.at, root));
  if (rooted && !isGlyph(rooted) && roleOf(rooted.rune) === 'source') {
    return rooted.dir ?? 'right';
  }
  for (const spell of compileLattice(l, glyphs).spells) {
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
  for (const spell of compileLattice(l, glyphs).spells) {
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
    break;
  }
  return {
    id,
    name,
    kind: cluster.kind,
    cells,
    entry: { x: 0, y: 0 },
    exits,
    idiom: null,
    version: 1,
    params: [],
    extraExit: null,
  };
}

// ── Fair Copy tidy (plan seam-deepening S13) ─────────────

/** A step tree with its cells left out: what the flow does, not where it is on the page. */
export function stepShape(st: Step | null): unknown {
  if (!st) return null;
  // A flat prefix encoding keeps both traversal and JSON signatures independent of tree depth.
  const out: unknown[] = [];
  const pending: (Step | null)[] = [st];
  while (pending.length) {
    const item = pending.pop();
    if (!item) {
      out.push(null);
      continue;
    }
    switch (item.role) {
      case 'action':
      case 'kind':
        out.push([item.role, item.rune, item.auras]);
        pending.push(item.next);
        break;
      case 'shape':
      case 'trigger':
        out.push([item.role, item.rune]);
        pending.push(item.next);
        break;
      case 'seal':
        out.push([item.role, item.rune]);
        pending.push(item.rest);
        break;
      case 'fork':
        out.push(['fork']);
        pending.push(item.right, item.left);
        break;
      case 'split':
        out.push(['split', item.branches.length]);
        for (let i = item.branches.length - 1; i >= 0; i--) pending.push(item.branches[i] ?? null);
    }
  }
  return out;
}

/** What a spell does, with no coordinates: the cast cannot tell two lattices apart when these match. */
function behaviourOf(l: Lattice, glyphs: GlyphLibrary): { sig: string; reached: Set<CellKey> } {
  const compiled = compileLattice(l, glyphs);
  const spells = compiled.spells
    .map((s) => [key(s.at), s.source, s.charges, s.sourceAuras, stepShape(s.first)])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return { sig: JSON.stringify(spells), reached: new Set(compiled.reached) };
}

/**
 * Where the first rune the collapse strands should go: the socket's neighbour on the side flow
 * leaves the cluster (outer exit directions are the flat ones, whatever the Glyph's rotation),
 * as an offset from where that rune stands now. Null when no stranded rune hangs off the cluster.
 */
function tidyOffset(
  l: Lattice,
  cluster: Cluster,
  stranded: readonly Coord[],
  glyphs: GlyphLibrary,
): Coord | null {
  const placedAt = placedMap(l);
  const inCluster = (c: Coord): boolean => cluster.cells.some((x) => sameCoord(x, c));
  for (const spell of compileLattice(l, glyphs).spells) {
    const tree = flowTree(spell, placedAt);
    if (!cluster.cells.every((c) => tree.some((t) => sameCoord(t.at, c)))) continue;
    for (const cell of tree) {
      if (!stranded.some((s) => sameCoord(s, cell.at))) continue;
      const parent = tree[cell.parent];
      if (!parent || !inCluster(parent.at)) return null;
      const d = DIRS.find((x) => sameCoord(step(parent.at, x), cell.at));
      if (!d) return null;
      const exit = step(cluster.root, d);
      return { x: exit.x - cell.at.x, y: exit.y - cell.at.y };
    }
  }
  return null;
}

export interface Tidied {
  lattice: Lattice;
  /** Runes that slid up to the Glyph's way out (0: nothing moved). */
  slid: number;
}

/**
 * The collapsed lattice (the cluster folded into `glyph`), with the runes it would strand slid
 * up as one block so the first sits on the Glyph's exit cell. Nothing slides unless every target
 * is a socket that is empty after the collapse and the compiled spells still do exactly what the
 * flat ones did (the identity property); then the stranded runes stay where they were.
 */
export function tidyCollapse(
  l: Lattice,
  cluster: Cluster,
  glyph: GlyphDef,
  glyphs: GlyphLibrary = {},
): Tidied {
  const collapsed = fairCopy(l, cluster, glyph, glyphs);
  const stranded = disconnected(l, cluster, glyphs);
  if (stranded.length === 0) return { lattice: collapsed, slid: 0 };
  const off = tidyOffset(l, cluster, stranded, glyphs);
  if (!off) return { lattice: collapsed, slid: 0 };

  const moving = new Set<CellKey>(stranded.map(key));
  const staying = new Set<CellKey>(
    collapsed.runes.filter((r) => !moving.has(key(r.at))).map((r) => key(r.at)),
  );
  const runes = collapsed.runes.map((r) =>
    moving.has(key(r.at)) ? { ...r, at: { x: r.at.x + off.x, y: r.at.y + off.y } } : r,
  );
  const targets = runes.filter((r) => moving.has(key({ x: r.at.x - off.x, y: r.at.y - off.y })));
  if (targets.some((r) => !isSocket(l.shape, r.at) || staying.has(key(r.at)))) {
    return { lattice: collapsed, slid: 0 };
  }
  const tidy: Lattice = {
    shape: l.shape,
    runes: [...runes].sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x),
  };

  const library: GlyphLibrary = { ...glyphs, [glyph.id]: glyph };
  const before = behaviourOf(l, glyphs);
  const after = behaviourOf(tidy, library);
  if (before.sig !== after.sig || targets.some((r) => !after.reached.has(key(r.at)))) {
    return { lattice: collapsed, slid: 0 };
  }
  return { lattice: tidy, slid: targets.length };
}
