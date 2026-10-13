import {
  type AuraRuneId,
  type MaterialId,
  type MaterialRuneId,
  RUNE_IDS,
  RUNES,
  type RuneId,
  type SourceRuneId,
  type TriggerRuneId,
  TUNING,
} from '$data';
import { glyphCost, rotateDirLocal } from './glyph';
import {
  byReadingOrder,
  type Coord,
  type Dir,
  key,
  neighbors4,
  opposite,
  sameCoord,
  step,
  turnLeft,
  turnRight,
} from './grid';
import type {
  AuraTouch,
  CellKey,
  CompiledLattice,
  FiredCell,
  GlyphDef,
  GlyphLibrary,
  Lattice,
  LatticeIssue,
  LatticeShape,
  PathCell,
  Placed,
  PlacedGlyph,
  PlacedRune,
  Spell,
  SpellNode,
} from './types';
import { isGlyph } from './types';

// ── Rune kinds ──────────────────────────────────────────

const isSource = (r: RuneId): r is SourceRuneId => RUNES[r].family === 'source';
const isMaterial = (r: RuneId): r is MaterialRuneId => RUNES[r].family === 'material';
const isTrigger = (r: RuneId): r is TriggerRuneId => RUNES[r].family === 'trigger';

// ── Lattice access ──────────────────────────────────────

export function isSocket(shape: LatticeShape, at: Coord): boolean {
  if (at.x < 0 || at.y < 0 || at.x >= shape.width || at.y >= shape.height) return false;
  return !shape.holes.some((h) => sameCoord(h, at));
}

export function socketAt(l: Lattice, at: Coord): Placed | null {
  return l.runes.find((r) => sameCoord(r.at, at)) ?? null;
}

// ── Compiler ────────────────────────────────────────────

/**
 * One coordinate space the flow walks in: the outer lattice, or a Glyph's rotated local frame.
 * The same rune rules run in both; only lookup, adjacency, labelling and "what is past the edge"
 * differ.
 */
interface Frame {
  runeAt(at: Coord): PlacedRune | null;
  /** Orthogonal neighbours of `at` holding `rune` in this frame. */
  around(at: Coord, rune: RuneId): number;
  visited: Set<CellKey>;
  path: PathCell[];
  /** Fields that locate a node: the cell itself, or `at` = socket + `inner` = local cell. */
  where(at: Coord): { at: Coord; inner?: Coord };
  /** Outer Amplify bonus every Source and Material in this frame receives (0 outside a Glyph). */
  bonus: number;
  /** A direction in this frame as seen on the outer lattice. */
  outward(d: Dir): Dir;
  /** Flow stepped onto a cell holding no rune of this frame. */
  beyond(at: Coord, dir: Dir, via: readonly Coord[], pierced: boolean): SpellNode[];
  /** The cell as proof records it. */
  fired(at: Coord, placed: PlacedRune): FiredCell;
  /** Every cell entered, for `Spell.cells`. */
  cells: FiredCell[];
}

const cellMap = (def: GlyphDef): Map<CellKey, PlacedRune> =>
  new Map(def.cells.map((c) => [key(c.at), c]));

/** Compiles `l`; `glyphs` resolves Glyph sockets (default none: a Glyph then insulates). */
export function compileLattice(
  l: Lattice,
  affinity: readonly MaterialId[],
  glyphs: GlyphLibrary = {},
): CompiledLattice {
  const byKey = new Map<CellKey, PlacedRune>();
  const glyphAt = new Map<CellKey, PlacedGlyph>();
  for (const r of l.runes) {
    if (isGlyph(r)) glyphAt.set(key(r.at), r);
    else byKey.set(key(r.at), r);
  }
  const runeAt = (at: Coord): PlacedRune | null =>
    isSocket(l.shape, at) ? (byKey.get(key(at)) ?? null) : null;
  const glyphIn = (at: Coord): PlacedGlyph | null =>
    isSocket(l.shape, at) ? (glyphAt.get(key(at)) ?? null) : null;
  const countAround = (at: Coord, rune: RuneId): number =>
    neighbors4(at).filter((n) => runeAt(n)?.rune === rune).length;

  const spells: Spell[] = [];
  const reached = new Set<CellKey>();
  const touches = new Map<string, AuraTouch>();

  const touch = (aura: AuraRuneId, to: Coord): void => {
    for (const n of neighbors4(to)) {
      if (runeAt(n)?.rune !== aura) continue;
      touches.set(`${key(n)}>${key(to)}`, { aura, from: n, to });
    }
  };

  function walkIn(
    f: Frame,
    cell: Coord,
    dir: Dir,
    via: readonly Coord[] = [],
    behindPierce = false,
  ): SpellNode[] {
    const placed = f.runeAt(cell);
    if (!placed) return f.beyond(cell, dir, via, behindPierce);
    if (f.visited.has(key(cell))) return [];
    const def = RUNES[placed.rune];
    if (def.family === 'aura' || def.family === 'source') return []; // insulators
    f.visited.add(key(cell));
    f.path.push({ ...f.where(cell), rune: placed.rune, dir: f.outward(dir) });
    f.cells.push(f.fired(cell, placed));
    const pierced = behindPierce || placed.rune === 'pierce';
    const go = (d: Dir, v: readonly Coord[] = []): SpellNode[] =>
      walkIn(f, step(cell, d), d, v, pierced);
    const shaped = [...via, f.where(cell).at];

    if (placed.rune === 'pierce') return go(dir, shaped);
    if (placed.rune === 'bend') {
      const out = placed.dir ?? 'right';
      return out === opposite(dir) ? [] : go(out, shaped);
    }
    if (placed.rune === 'fork') {
      // Left must walk first: it claims shared cells before the right branch.
      const left = go(turnLeft(dir), shaped);
      const right = go(turnRight(dir), shaped);
      return [...left, ...right];
    }
    if (isMaterial(placed.rune)) {
      const amp = f.around(cell, 'amplify') + f.bonus;
      const bonus = affinity.includes(placed.rune) ? TUNING.affinityBonus : 0;
      return [
        {
          kind: 'material',
          rune: placed.rune,
          ...f.where(cell),
          via,
          amp,
          magnitude: def.base + amp + bonus,
          next: go(dir),
          ...(pierced ? { pierced: true as const } : {}),
        },
      ];
    }
    if (isTrigger(placed.rune)) {
      return [
        {
          kind: 'trigger',
          rune: placed.rune,
          ...f.where(cell),
          via,
          next: go(dir),
          ...(pierced ? { pierced: true as const } : {}),
        },
      ];
    }
    return [];
  }

  /** A Glyph's cells as a frame; leaving it continues the outer walk from the socket. */
  const innerFrame = (g: PlacedGlyph, def: GlyphDef, outer: Frame): Frame => {
    const local = cellMap(def);
    const around = (at: Coord, rune: RuneId): number =>
      neighbors4(at).filter((n) => local.get(key(n))?.rune === rune).length;
    return {
      runeAt: (at) => local.get(key(at)) ?? null,
      around,
      visited: new Set(),
      path: outer.path,
      where: (at) => ({ at: g.at, inner: at }),
      bonus: countAround(g.at, 'amplify'),
      outward: (d) => rotateDirLocal(d, g.dir),
      beyond: (_at, dir, via, pierced) => {
        const out = rotateDirLocal(dir, g.dir);
        return walkIn(outer, step(g.at, out), out, via, pierced);
      },
      fired: () => ({ at: g.at, rune: null, glyph: g.glyph, dir: g.dir }),
      cells: outer.cells,
    };
  };

  /** The outer frame for one spell: a payload Glyph is entered only along its own arrow (P4). */
  const outerFrame = (visited: Set<CellKey>, path: PathCell[], cells: FiredCell[]): Frame => {
    const frame: Frame = {
      runeAt,
      around: countAround,
      visited,
      path,
      where: (at) => ({ at }),
      bonus: 0,
      outward: (d) => d,
      fired: (at, placed) =>
        placed.dir ? { at, rune: placed.rune, dir: placed.dir } : { at, rune: placed.rune },
      cells,
      beyond: (at, dir, via, pierced) => {
        const g = glyphIn(at);
        const def = g ? glyphs[g.glyph] : undefined;
        if (!g || !def || def.kind !== 'payload' || dir !== g.dir) return [];
        if (visited.has(key(at)) || !cellMap(def).has(key(def.entry))) return [];
        visited.add(key(at));
        return walkIn(innerFrame(g, def, frame), def.entry, 'right', via, pierced);
      },
    };
    return frame;
  };

  /** Plain Sources and Spell Glyph sockets, in reading order of their socket. */
  const origins: { at: Coord; glyph: PlacedGlyph | null }[] = [];
  for (const r of byKey.values()) if (isSource(r.rune)) origins.push({ at: r.at, glyph: null });
  for (const g of glyphAt.values()) {
    if (isSocket(l.shape, g.at) && glyphs[g.glyph]?.kind === 'spell') {
      origins.push({ at: g.at, glyph: g });
    }
  }
  origins.sort((a, b) => byReadingOrder(a.at, b.at));

  for (const origin of origins) {
    const path: PathCell[] = [];
    const outer = outerFrame(new Set([key(origin.at)]), path, []);
    const spell = origin.glyph
      ? glyphSpell(origin.glyph, outer)
      : plainSpell(byKey.get(key(origin.at)), outer);
    if (!spell) continue;
    spells.push(spell);
    touch('echo', origin.at);
    touch('thrift', origin.at);
    for (const cell of path) {
      reached.add(key(cell.at));
      // Amplify only matters on the source and on material cells; a socket stands for its inner ones.
      if (isSource(cell.rune) || isMaterial(cell.rune)) touch('amplify', cell.at);
    }
  }

  /** Pierce only means something to a line spell; on Splash and Ward it does nothing. */
  function pierceOf(source: SourceRuneId, path: readonly PathCell[]): { pierce?: true } {
    const line = source === 'bolt' || source === 'quill';
    return line && path.some((p) => p.rune === 'pierce') ? { pierce: true } : {};
  }

  function plainSpell(src: PlacedRune | undefined, outer: Frame): Spell | null {
    if (!src || !isSource(src.rune)) return null;
    const sourceRune = src.rune;
    const srcDir = src.dir ?? 'right';
    outer.path.push({ at: src.at, rune: sourceRune, dir: srcDir });
    outer.cells.push(outer.fired(src.at, src));
    const nodes = walkIn(outer, step(src.at, srcDir), srcDir);
    const amp = countAround(src.at, 'amplify');
    return {
      key: key(src.at),
      at: src.at,
      source: sourceRune,
      amp,
      magnitude: RUNES[sourceRune].base + amp,
      echo: countAround(src.at, 'echo') > 0,
      charges: RUNES[sourceRune].charges + countAround(src.at, 'thrift'),
      nodes,
      path: outer.path,
      cells: outer.cells,
      ...pierceOf(sourceRune, outer.path),
    };
  }

  function glyphSpell(g: PlacedGlyph, outer: Frame): Spell | null {
    const def = glyphs[g.glyph];
    const src = def ? cellMap(def).get(key(def.entry)) : undefined;
    if (!def || !src || !isSource(src.rune)) return null;
    const sourceRune = src.rune;
    const inner = innerFrame(g, def, outer);
    inner.visited.add(key(def.entry));
    outer.path.push({ ...inner.where(def.entry), rune: sourceRune, dir: g.dir });
    outer.cells.push(inner.fired(def.entry, src));
    const nodes = walkIn(inner, step(def.entry, 'right'), 'right');
    const amp = inner.around(def.entry, 'amplify') + inner.bonus;
    return {
      key: key(g.at),
      at: g.at,
      source: sourceRune,
      amp,
      magnitude: RUNES[sourceRune].base + amp,
      echo: inner.around(def.entry, 'echo') > 0 || countAround(g.at, 'echo') > 0,
      charges:
        RUNES[sourceRune].charges + inner.around(def.entry, 'thrift') + countAround(g.at, 'thrift'),
      nodes,
      path: outer.path,
      cells: outer.cells,
      glyph: g.glyph,
      ...pierceOf(sourceRune, outer.path),
    };
  }

  return { spells, reached: [...reached], auraTouches: [...touches.values()] };
}

// ── Descriptions ────────────────────────────────────────

function describeNode(node: SpellNode): string {
  if (node.kind === 'trigger') {
    const inner = describeNodes(node.next) || '(nothing)';
    if (node.rune === 'onInked') return `if inked: ${inner}`;
    if (node.rune === 'onIgnite') return `if it ignites, on the fire: ${inner}`;
    return `on kill, from each victim: ${inner}`;
  }
  const head =
    node.rune === 'spark'
      ? `Spark (${node.magnitude} damage)`
      : node.magnitude <= 1
        ? RUNES[node.rune].name
        : `${RUNES[node.rune].name} ${2 * node.magnitude - 1}×${2 * node.magnitude - 1}`;
  return node.next.length > 0 ? `${head} → ${describeNodes(node.next)}` : head;
}

function describeNodes(nodes: readonly SpellNode[]): string {
  if (nodes.length === 0) return '';
  if (nodes.length === 1 && nodes[0]) return describeNode(nodes[0]);
  return `[${nodes.map(describeNode).join(' | ')}]`;
}

function describeSource(s: Spell): string {
  switch (s.source) {
    case 'bolt':
      return `Bolt (${s.magnitude} damage${s.pierce ? ', pierces' : ''})`;
    case 'quill':
      return `Quill (${s.magnitude} damage, pools ink${s.pierce ? ', pierces' : ''})`;
    case 'splash':
      return `Splash (${s.magnitude} damage, 3×3)`;
    case 'ward':
      return `Ward (shield ${s.magnitude})`;
  }
}

export function describeSpell(s: Spell): string {
  const chain = s.nodes.length > 0 ? ` → ${describeNodes(s.nodes)}` : '';
  const echo = s.echo ? ' · echoes next turn at half strength' : '';
  return `${describeSource(s)}${chain}${echo}`;
}

// ── Ink ─────────────────────────────────────────────────

export function inkCost(rune: RuneId): number {
  return TUNING.inkCost[RUNES[rune].family];
}

/**
 * Ink one socket costs. A Glyph is its `glyphCost` (1 if its id is unknown) plus 1 for every aura
 * rune orthogonally next to its socket, which needs `l`; without it only the Glyph itself counts.
 */
export function placedInk(p: Placed, glyphs: GlyphLibrary = {}, l?: Lattice): number {
  if (!isGlyph(p)) return inkCost(p.rune);
  const def = glyphs[p.glyph];
  const auras = l ? neighbors4(p.at).filter((n) => isAura(socketAt(l, n))).length : 0;
  return (def ? glyphCost(def) : 1) + auras;
}

const isAura = (p: Placed | null): boolean => !!p && !isGlyph(p) && RUNES[p.rune].family === 'aura';

export function inkUsed(l: Lattice, glyphs: GlyphLibrary = {}): number {
  return l.runes.reduce((sum, r) => sum + placedInk(r, glyphs, l), 0);
}

export function countRunes(ls: readonly Lattice[]): Record<RuneId, number> {
  const counts = Object.fromEntries(RUNE_IDS.map((id) => [id, 0])) as Record<RuneId, number>;
  for (const l of ls) for (const r of l.runes) if (!isGlyph(r)) counts[r.rune] += 1; // B2 counts Glyph contents
  return counts;
}

// ── Validation ──────────────────────────────────────────

/** Structural checks for one lattice. `capacity` null = unlimited (Lab). Ownership is checked in run.ts. */
export function validateLattice(
  l: Lattice,
  capacity: number | null,
  glyphs: GlyphLibrary = {},
): LatticeIssue[] {
  const issues: LatticeIssue[] = [];
  const seen = new Set<CellKey>();
  for (const r of l.runes) {
    if (isGlyph(r)) {
      if (!isSocket(l.shape, r.at)) {
        issues.push({ kind: 'socket', at: r.at, message: `Glyph ${r.glyph} is not on a socket` });
      }
      if (seen.has(key(r.at))) {
        issues.push({ kind: 'overlap', at: r.at, message: `Glyph ${r.glyph} shares a socket` });
      }
      seen.add(key(r.at));
      if (!glyphs[r.glyph]) {
        issues.push({
          kind: 'socket',
          at: r.at,
          message: `Glyph ${r.glyph} is not in the library`,
        });
      }
      continue;
    }
    const name = RUNES[r.rune].name;
    if (!isSocket(l.shape, r.at)) {
      issues.push({
        kind: 'socket',
        at: r.at,
        rune: r.rune,
        message: `${name} is not on a socket`,
      });
    }
    if (seen.has(key(r.at))) {
      issues.push({ kind: 'overlap', at: r.at, rune: r.rune, message: `${name} shares a socket` });
    }
    seen.add(key(r.at));
    if (RUNES[r.rune].arrow !== (r.dir !== undefined)) {
      issues.push({
        kind: 'arrow',
        at: r.at,
        rune: r.rune,
        message: RUNES[r.rune].arrow ? `${name} needs an arrow` : `${name} takes no arrow`,
      });
    }
  }
  const used = inkUsed(l, glyphs);
  if (capacity !== null && used > capacity) {
    issues.push({ kind: 'ink', message: `Needs ${used} ink, only ${capacity} available` });
  }
  return issues;
}

// ── Editing ─────────────────────────────────────────────

/** Returns a new lattice with `at` set to `rune` (or cleared when null). Throws if `at` is not a socket. */
export function setSocket(l: Lattice, at: Coord, rune: RuneId | null, dir?: Dir): Lattice {
  if (!isSocket(l.shape, at)) throw new Error(`No socket at ${key(at)}`);
  const rest = l.runes.filter((r) => !sameCoord(r.at, at));
  if (rune === null) return { shape: l.shape, runes: rest };
  const placed: PlacedRune = RUNES[rune].arrow
    ? { at: { ...at }, rune, dir: dir ?? 'right' }
    : { at: { ...at }, rune };
  const runes = [...rest, placed].sort((a, b) => byReadingOrder(a.at, b.at));
  return { shape: l.shape, runes };
}

/** Arrow runes turn a quarter clockwise (right → down → left → up); anything else is unchanged. */
export function rotateSocket(l: Lattice, at: Coord): Lattice {
  const placed = socketAt(l, at);
  if (!placed || isGlyph(placed) || !RUNES[placed.rune].arrow) return l;
  return setSocket(l, at, placed.rune, turnRight(placed.dir ?? 'right'));
}
