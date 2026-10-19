import {
  type InventionDef,
  isInvention,
  type Lean,
  METHODS,
  type Role,
  RUNES,
  type RuneRef,
  type SourceRuneId,
  TUNING,
} from '$data';
import { argIssue, cellsWithArgs, glyphCost, rotateDirLocal } from './glyph';
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
  AuraRef,
  AuraTouch,
  CellKey,
  CompiledLattice,
  FiredCell,
  GlyphDef,
  GlyphId,
  GlyphLibrary,
  InventionLibrary,
  Lattice,
  LatticeIssue,
  LatticeShape,
  PathCell,
  Placed,
  PlacedGlyph,
  PlacedRune,
  Spell,
  Step,
} from './types';
import { isGlyph } from './types';

// ── Roles ───────────────────────────────────────────────

/** A rune's role, or an invention's (its method's, design §6.2). null: an unknown invention. */
export function roleOf(ref: RuneRef, inventions: InventionLibrary = {}): Role | null {
  if (!isInvention(ref)) return RUNES[ref].role;
  const def = inventions[ref];
  return def ? METHODS[def.method].makes : null;
}

/** The household's inventions by id. */
export const libraryOf = (defs: readonly InventionDef[]): InventionLibrary =>
  Object.fromEntries(defs.map((d) => [d.id, d]));

/** Whether a lattice cell's rune carries an arrow (sources and Bend; inventions never do). */
export const hasArrow = (ref: RuneRef): boolean => !isInvention(ref) && RUNES[ref].arrow;

/** The display name of a rune or an invention. */
export function nameOf(ref: RuneRef, inventions: InventionLibrary = {}): string {
  if (!isInvention(ref)) return RUNES[ref].name;
  return inventions[ref]?.name ?? ref.slice(4);
}

const isSourceRef = (r: RuneRef): r is SourceRuneId =>
  !isInvention(r) && RUNES[r].role === 'source';

/** The steps directly below a step, in order (Fork: left first). */
export function stepChildren(st: Step): Step[] {
  switch (st.role) {
    case 'fork':
      return [st.left, st.right].filter((x): x is Step => x !== null);
    case 'seal':
      return st.rest ? [st.rest] : [];
    case 'split':
      return [...st.branches];
    default:
      return st.next ? [st.next] : [];
  }
}

/** Every step of a tree, depth-first, parents before children (Fork: left branch first). */
export function stepsOf(first: Step | null): Step[] {
  if (!first) return [];
  return [first, ...stepChildren(first).flatMap(stepsOf)];
}

// ── Lattice access ──────────────────────────────────────

export function isSocket(shape: LatticeShape, at: Coord): boolean {
  if (at.x < 0 || at.y < 0 || at.x >= shape.width || at.y >= shape.height) return false;
  return !shape.holes.some((h) => sameCoord(h, at));
}

export function socketAt(l: Lattice, at: Coord): Placed | null {
  return l.runes.find((r) => sameCoord(r.at, at)) ?? null;
}

// ── Ink (P33) ───────────────────────────────────────────

/**
 * Ink one rune costs on the page: its role's cost, 1 less when the apprentice is trained in its
 * school (min 1). An invention costs its parts plus its method; a solvent adds nothing.
 */
export function inkOf(
  ref: RuneRef,
  inventions: InventionLibrary = {},
  lean: Lean | null = null,
): number {
  if (isInvention(ref)) {
    const def = inventions[ref];
    if (!def) return 1;
    const parts = def.parts.reduce((sum, p) => sum + inkOf(p, inventions, lean), 0);
    return parts + METHODS[def.method].ink;
  }
  const r = RUNES[ref];
  const base = TUNING.inkCost[r.role];
  return lean && lean.trained === r.school ? Math.max(1, base - 1) : base;
}

// ── Compiler ────────────────────────────────────────────

/**
 * One coordinate space the flow walks in: the outer lattice, or a Glyph's rotated local frame.
 * The same rune rules run in both; only lookup, adjacency, labelling and "what is past the edge"
 * differ.
 */
interface Frame {
  runeAt(at: Coord): PlacedRune | null;
  /** Auras orthogonally next to `at` (inside a Glyph: its own, then the ones touching its socket). */
  aurasAround(at: Coord): AuraRef[];
  visited: Set<CellKey>;
  path: PathCell[];
  /** Fields that locate a step: the cell itself, or `at` = socket + `inner` = local cell. */
  where(at: Coord): { at: Coord; inner?: Coord; glyph?: GlyphId };
  /** A direction in this frame as seen on the outer lattice. */
  outward(d: Dir): Dir;
  /** Flow stepped onto a cell holding no rune of this frame. */
  beyond(at: Coord, dir: Dir, via: readonly Coord[]): Step | null;
  /** The cell as proof records it. */
  fired(at: Coord, placed: PlacedRune): FiredCell;
  /** Every cell entered, for `Spell.cells`. */
  cells: FiredCell[];
}

const cellMap = (
  def: GlyphDef,
  args: PlacedGlyph['args'],
  inventions: InventionLibrary,
): Map<CellKey, PlacedRune> =>
  new Map(cellsWithArgs(def, args, inventions).map((c) => [key(c.at), c]));

/**
 * Compiles `l` into spells (plan §2.3): from each Source the flow walks the page, each Action or
 * Kind becoming a step, Fork a two-sided step (left walked first, it claims shared cells), Bend
 * turning the walk without a step, Seep/Lay/Toll and triggers wrapping the rest, a Seal putting
 * the rest in a jar. Auras and Sources insulate. `glyphs` resolves Glyph sockets (a Glyph not in
 * it insulates); `inventions` gives inventions their role; `lean` prices the ink.
 */
export function compileLattice(
  l: Lattice,
  glyphs: GlyphLibrary = {},
  inventions: InventionLibrary = {},
  lean: Lean | null = null,
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
  const role = (r: RuneRef): Role | null => roleOf(r, inventions);
  const aurasNear = (look: (c: Coord) => PlacedRune | null, at: Coord): AuraRef[] =>
    neighbors4(at).flatMap((n) => {
      const p = look(n);
      return p && role(p.rune) === 'aura' ? [p.rune as AuraRef] : [];
    });

  const spells: Spell[] = [];
  const reached = new Set<CellKey>();
  const touches = new Map<string, AuraTouch>();

  const touch = (to: Coord): void => {
    for (const n of neighbors4(to)) {
      const p = runeAt(n);
      if (!p || role(p.rune) !== 'aura') continue;
      touches.set(`${key(n)}>${key(to)}`, { aura: p.rune as AuraRef, from: n, to });
    }
  };

  function walkIn(
    f: Frame,
    cell: Coord,
    dir: Dir,
    via: readonly Coord[] = [],
    viaInner: readonly Coord[] = [],
  ): Step | null {
    const placed = f.runeAt(cell);
    if (!placed) return f.beyond(cell, dir, via);
    if (f.visited.has(key(cell))) return null;
    const r = role(placed.rune);
    if (r === null || r === 'aura' || r === 'source') return null; // insulators
    f.visited.add(key(cell));
    f.path.push({ ...f.where(cell), rune: placed.rune, dir: f.outward(dir) });
    f.cells.push(f.fired(cell, placed));
    const where = f.where(cell);
    const base = {
      ...where,
      ...(via.length > 0 ? { via } : {}),
      ...(where.inner && viaInner.length > 0 ? { viaInner } : {}),
    };
    const go = (d: Dir): Step | null => walkIn(f, step(cell, d), d);

    if (placed.rune === 'bend') {
      const out = placed.dir ?? 'right';
      if (out === opposite(dir)) return null;
      // Inside a Glyph, the local shape cells too (`viaInner`); crossing a frame starts afresh.
      const shapedInner = where.inner ? [...viaInner, where.inner] : [];
      return walkIn(f, step(cell, out), out, [...via, where.at], shapedInner);
    }
    if (placed.rune === 'fork') {
      // Left must walk first: it claims shared cells before the right branch.
      const left = go(turnLeft(dir));
      const right = go(turnRight(dir));
      return { ...base, role: 'fork', left, right };
    }
    if (placed.rune === 'seep' || placed.rune === 'lay' || placed.rune === 'toll') {
      return { ...base, role: 'shape', rune: placed.rune, next: go(dir) };
    }
    if (placed.rune === 'tally' || placed.rune === 'brink' || placed.rune === 'unison') {
      return { ...base, role: 'trigger', rune: placed.rune, next: go(dir) };
    }
    if (placed.rune === 'jar' || placed.rune === 'fuse') {
      return { ...base, role: 'seal', rune: placed.rune, rest: go(dir) };
    }
    if (r === 'action' || r === 'kind') {
      return { ...base, role: r, rune: placed.rune, auras: f.aurasAround(cell), next: go(dir) };
    }
    return null;
  }

  /** A Glyph's cells as a frame; leaving it continues the outer walk from the socket. */
  const innerFrame = (g: PlacedGlyph, def: GlyphDef, outer: Frame): Frame => {
    const local = cellMap(def, g.args, inventions);
    const localAt = (at: Coord): PlacedRune | null => local.get(key(at)) ?? null;
    // M27: the extra exit rides on the first time the walk leaves the Glyph.
    let extraSpent = def.extraExit === null;
    return {
      runeAt: localAt,
      aurasAround: (at) => [...aurasNear(localAt, at), ...aurasNear(runeAt, g.at)],
      visited: new Set(),
      path: outer.path,
      where: (at) => ({ at: g.at, inner: at, glyph: def.id }),
      outward: (d) => rotateDirLocal(d, g.dir),
      beyond: (_at, dir, via) => {
        const out = rotateDirLocal(dir, g.dir);
        const main = walkIn(outer, step(g.at, out), out, via);
        if (extraSpent || def.extraExit === null) return main;
        extraSpent = true;
        const sideDir = rotateDirLocal(def.extraExit, g.dir);
        const side = walkIn(outer, step(g.at, sideDir), sideDir, via);
        if (!main || !side) return main ?? side;
        return { at: g.at, role: 'split', branches: [main, side] };
      },
      fired: () => ({ at: g.at, rune: null, glyph: g.glyph, dir: g.dir }),
      cells: outer.cells,
    };
  };

  /** The outer frame for one spell: a payload Glyph is entered only along its own arrow (P4). */
  const outerFrame = (visited: Set<CellKey>, path: PathCell[], cells: FiredCell[]): Frame => {
    const frame: Frame = {
      runeAt,
      aurasAround: (at) => aurasNear(runeAt, at),
      visited,
      path,
      where: (at) => ({ at }),
      outward: (d) => d,
      fired: (at, placed) =>
        placed.dir ? { at, rune: placed.rune, dir: placed.dir } : { at, rune: placed.rune },
      cells,
      beyond: (at, dir, via) => {
        const g = glyphIn(at);
        const def = g ? glyphs[g.glyph] : undefined;
        if (!g || !def || def.kind !== 'payload' || dir !== g.dir) return null;
        if (visited.has(key(at)) || !cellMap(def, undefined, inventions).has(key(def.entry)))
          return null;
        visited.add(key(at));
        return walkIn(innerFrame(g, def, frame), def.entry, 'right', via);
      },
    };
    return frame;
  };

  /** What the spell costs on the page: each cell it walked once (a Glyph socket as the Glyph), plus touching auras. */
  function spellInk(path: readonly PathCell[], auraCells: readonly Coord[]): number {
    const seen = new Set<CellKey>();
    let ink = 0;
    for (const p of path) {
      if (seen.has(key(p.at))) continue;
      seen.add(key(p.at));
      const g = glyphIn(p.at);
      ink += g ? placedInk(g, glyphs, l, inventions, lean) : inkOf(p.rune, inventions, lean);
    }
    for (const a of auraCells) {
      const p = runeAt(a);
      if (p && !seen.has(key(a))) {
        seen.add(key(a));
        ink += inkOf(p.rune, inventions, lean);
      }
    }
    return ink;
  }

  /** Plain Sources and Spell Glyph sockets, in reading order of their socket. */
  const origins: { at: Coord; glyph: PlacedGlyph | null }[] = [];
  for (const r of byKey.values()) if (isSourceRef(r.rune)) origins.push({ at: r.at, glyph: null });
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
    const before = touches.size;
    for (const cell of path) {
      reached.add(key(cell.at));
      touch(cell.at);
    }
    const auraCells = [...touches.values()].slice(before).map((t) => t.from);
    spells.push({ ...spell, ink: spellInk(path, auraCells) });
  }

  function plainSpell(src: PlacedRune | undefined, outer: Frame): Spell | null {
    if (!src || !isSourceRef(src.rune)) return null;
    const sourceRune = src.rune;
    const srcDir = src.dir ?? 'right';
    outer.path.push({ at: src.at, rune: sourceRune, dir: srcDir });
    outer.cells.push(outer.fired(src.at, src));
    const first = walkIn(outer, step(src.at, srcDir), srcDir);
    return {
      key: key(src.at),
      at: src.at,
      source: sourceRune,
      sourceAuras: outer.aurasAround(src.at),
      first,
      charges: RUNES[sourceRune].charges,
      path: outer.path,
      ink: 0,
      cells: outer.cells,
    };
  }

  function glyphSpell(g: PlacedGlyph, outer: Frame): Spell | null {
    const def = glyphs[g.glyph];
    const src = def ? cellMap(def, undefined, inventions).get(key(def.entry)) : undefined;
    if (!def || !src || !isSourceRef(src.rune)) return null;
    const sourceRune = src.rune;
    const inner = innerFrame(g, def, outer);
    inner.visited.add(key(def.entry));
    outer.path.push({ ...inner.where(def.entry), rune: sourceRune, dir: g.dir });
    outer.cells.push(inner.fired(def.entry, src));
    const first = walkIn(inner, step(def.entry, 'right'), 'right');
    return {
      key: key(g.at),
      at: g.at,
      source: sourceRune,
      sourceAuras: inner.aurasAround(def.entry),
      first,
      charges: RUNES[sourceRune].charges,
      path: outer.path,
      ink: 0,
      cells: outer.cells,
      glyph: g.glyph,
    };
  }

  return { spells, reached: [...reached], auraTouches: [...touches.values()] };
}

// ── Descriptions ────────────────────────────────────────

function describeStep(st: Step | null, inventions: InventionLibrary): string {
  if (!st) return '';
  const rest = (n: Step | null): string => {
    const text = describeStep(n, inventions);
    return text ? ` → ${text}` : '';
  };
  switch (st.role) {
    case 'action':
    case 'kind':
      return `${nameOf(st.rune, inventions)}${rest(st.next)}`;
    case 'trigger':
      return `if ${RUNES[st.rune].name}: ${describeStep(st.next, inventions) || '(nothing)'}`;
    case 'shape':
      return `${RUNES[st.rune].name}${rest(st.next)}`;
    case 'seal':
      return `${RUNES[st.rune].name}: [${describeStep(st.rest, inventions)}]`;
    case 'fork':
      return `[left: ${describeStep(st.left, inventions) || '—'} | right: ${describeStep(st.right, inventions) || '—'}]`;
    case 'split':
      return `[${st.branches.map((b) => describeStep(b, inventions)).join(' | ')}]`;
  }
}

export function describeSpell(s: Spell, inventions: InventionLibrary = {}): string {
  const chain = describeStep(s.first, inventions);
  return `${RUNES[s.source].name}${chain ? ` → ${chain}` : ''}`;
}

// ── Ink on the page ─────────────────────────────────────

/**
 * Ink one socket costs. A Glyph is its `glyphCost` (1 if its id is unknown) plus 1 for every aura
 * rune orthogonally next to its socket, which needs `l`; without it only the Glyph itself counts.
 */
export function placedInk(
  p: Placed,
  glyphs: GlyphLibrary = {},
  l?: Lattice,
  inventions: InventionLibrary = {},
  lean: Lean | null = null,
): number {
  if (!isGlyph(p)) return inkOf(p.rune, inventions, lean);
  const def = glyphs[p.glyph];
  const auras = l
    ? neighbors4(p.at).filter((n) => {
        const q = socketAt(l, n);
        return !!q && !isGlyph(q) && roleOf(q.rune, inventions) === 'aura';
      }).length
    : 0;
  return (def ? glyphCost(def, inventions, lean) : 1) + auras;
}

export function inkUsed(
  l: Lattice,
  glyphs: GlyphLibrary = {},
  inventions: InventionLibrary = {},
  lean: Lean | null = null,
): number {
  return l.runes.reduce((sum, r) => sum + placedInk(r, glyphs, l, inventions, lean), 0);
}

// ── Validation ──────────────────────────────────────────

/** Structural checks for one lattice. `capacity` null = unlimited (Lab). Knowledge is checked in run.ts. */
export function validateLattice(
  l: Lattice,
  capacity: number | null,
  glyphs: GlyphLibrary = {},
  inventions: InventionLibrary = {},
  lean: Lean | null = null,
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
      const def = glyphs[r.glyph];
      if (!def) {
        issues.push({
          kind: 'socket',
          at: r.at,
          message: `Glyph ${r.glyph} is not in the library`,
        });
      } else {
        for (const [cell, arg] of Object.entries(r.args ?? {})) {
          const why = argIssue(def, cell, arg, inventions);
          if (why) {
            issues.push({ kind: 'arg', at: r.at, rune: arg.rune, message: `${def.name} ${why}` });
          }
        }
      }
      continue;
    }
    const name = nameOf(r.rune, inventions);
    if (isInvention(r.rune) && !inventions[r.rune]) {
      issues.push({ kind: 'owned', at: r.at, rune: r.rune, message: `${name} is not invented` });
    }
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
    if (hasArrow(r.rune) !== (r.dir !== undefined)) {
      issues.push({
        kind: 'arrow',
        at: r.at,
        rune: r.rune,
        message: hasArrow(r.rune) ? `${name} needs an arrow` : `${name} takes no arrow`,
      });
    }
  }
  const used = inkUsed(l, glyphs, inventions, lean);
  if (capacity !== null && used > capacity) {
    issues.push({ kind: 'ink', message: `Needs ${used} ink, only ${capacity} available` });
  }
  return issues;
}

// ── Editing ─────────────────────────────────────────────

/** Returns a new lattice with `at` set to `rune` (or cleared when null). Throws if `at` is not a socket. */
export function setSocket(l: Lattice, at: Coord, rune: RuneRef | null, dir?: Dir): Lattice {
  if (!isSocket(l.shape, at)) throw new Error(`No socket at ${key(at)}`);
  const rest = l.runes.filter((r) => !sameCoord(r.at, at));
  if (rune === null) return { shape: l.shape, runes: rest };
  const placed: PlacedRune = hasArrow(rune)
    ? { at: { ...at }, rune, dir: dir ?? 'right' }
    : { at: { ...at }, rune };
  const runes = [...rest, placed].sort((a, b) => byReadingOrder(a.at, b.at));
  return { shape: l.shape, runes };
}

/** Arrow runes turn a quarter clockwise (right → down → left → up); anything else is unchanged. */
export function rotateSocket(l: Lattice, at: Coord): Lattice {
  const placed = socketAt(l, at);
  if (!placed || isGlyph(placed) || !hasArrow(placed.rune)) return l;
  return setSocket(l, at, placed.rune, turnRight(placed.dir ?? 'right'));
}
