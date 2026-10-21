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
  isLatticeCoord,
  key,
  neighbors4,
  opposite,
  sameCoord,
  step,
  turnLeft,
  turnRight,
} from './grid';
import type { ImportBudget } from './importPolicy';
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
  const out: Step[] = [];
  const pending = first ? [first] : [];
  while (pending.length) {
    const st = pending.pop();
    if (!st) continue;
    out.push(st);
    const children = stepChildren(st);
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child) pending.push(child);
    }
  }
  return out;
}

// ── Lattice access ──────────────────────────────────────

export function isSocket(shape: LatticeShape, at: Coord): boolean {
  if (!isLatticeCoord(at)) return false;
  if (shape.kind === 'growing') return true;
  if (at.x < 0 || at.y < 0 || at.x >= shape.width || at.y >= shape.height) return false;
  return !shape.holes.some((h) => sameCoord(h, at));
}

export function socketAt(l: Lattice, at: Coord): Placed | null {
  return l.runes.find((r) => sameCoord(r.at, at)) ?? null;
}

/** The first placement at a socket, matching socketAt without repeated page scans. */
function placementLookup(l: Lattice): (at: Coord) => Placed | null {
  const placed = new Map<CellKey, Placed>();
  for (const rune of l.runes) if (!placed.has(key(rune.at))) placed.set(key(rune.at), rune);
  return (at) => placed.get(key(at)) ?? null;
}

// ── Ink (P33) ───────────────────────────────────────────

/**
 * Ink one rune costs on the page: its role's cost, 1 less when the apprentice is trained in its
 * school (min 1). An invention costs its parts plus its method; a solvent adds nothing.
 */
export class InkCostOverflowError extends Error {
  constructor() {
    super('This wiring costs more ink than can be counted safely');
    this.name = 'InkCostOverflowError';
  }
}

export function addInk(a: number, b: number): number {
  const sum = a + b;
  if (!Number.isSafeInteger(sum) || sum < 0) throw new InkCostOverflowError();
  return sum;
}

export type InkPrice = (ref: RuneRef) => number;

/** One pricing operation shares its cache; repeated dependencies are paid each time, evaluated once. */
export function inkPricer(
  inventions: InventionLibrary = {},
  lean: Lean | null = null,
  budget?: ImportBudget,
): InkPrice {
  const costs = new Map<RuneRef, number>();
  return (ref) => {
    const active = new Set<RuneRef>();
    const pending = [{ ref, finish: false }];
    while (pending.length) {
      budget?.spend('work');
      const job = pending.pop();
      if (!job || costs.has(job.ref)) continue;
      if (!isInvention(job.ref)) {
        const rune = RUNES[job.ref];
        const base = TUNING.inkCost[rune.role];
        costs.set(job.ref, lean && lean.trained === rune.school ? Math.max(1, base - 1) : base);
        continue;
      }
      const def = inventions[job.ref];
      if (!def) {
        costs.set(job.ref, 1);
        continue;
      }
      if (job.finish) {
        let cost = METHODS[def.method].ink;
        for (const part of def.parts) {
          budget?.spend('work');
          cost = addInk(cost, costs.get(part) ?? 1);
        }
        costs.set(job.ref, cost);
        active.delete(job.ref);
        continue;
      }
      if (active.has(job.ref)) throw new Error('An invention cannot contain itself');
      active.add(job.ref);
      pending.push({ ref: job.ref, finish: true });
      for (let i = def.parts.length - 1; i >= 0; i--) {
        budget?.spend('work');
        const part = def.parts[i];
        if (part !== undefined) pending.push({ ref: part, finish: false });
      }
    }
    return costs.get(ref) ?? 1;
  };
}

export function inkOf(
  ref: RuneRef,
  inventions: InventionLibrary = {},
  lean: Lean | null = null,
): number {
  return inkPricer(inventions, lean)(ref);
}

// ── Compiler ────────────────────────────────────────────

/**
 * One coordinate space the flow walks in: the outer lattice, or a Glyph's rotated local frame.
 * The same rune rules run in both; only lookup, adjacency, labelling and "what is past the edge"
 * differ.
 */
interface Trail {
  at: Coord;
  previous: Trail | null;
  length: number;
}
const appendTrail = (previous: Trail | null, at: Coord): Trail => ({
  at,
  previous,
  length: (previous?.length ?? 0) + 1,
});
function trailCoords(trail: Trail): Coord[] {
  const out: Coord[] = Array(trail.length);
  let current: Trail | null = trail;
  for (let i = trail.length - 1; current; i--) {
    out[i] = current.at;
    current = current.previous;
  }
  return out;
}

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
  beyond(at: Coord, dir: Dir, via: Trail | null, assign: (st: Step | null) => void): void;
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
  return compile(l, glyphs, inventions, lean);
}

/** Walk the same control flow without retaining expanded paths or steps before accepting input. */
export function assertCompilationWork(
  l: Lattice,
  glyphs: GlyphLibrary,
  inventions: InventionLibrary,
  budget: ImportBudget,
): void {
  compile(l, glyphs, inventions, null, budget);
}

function compile(
  l: Lattice,
  glyphs: GlyphLibrary,
  inventions: InventionLibrary,
  lean: Lean | null,
  budget?: ImportBudget,
): CompiledLattice {
  budget?.spend('work', l.runes.length);
  const shape = l.shape;
  const holes = new Set<CellKey>();
  if (shape.kind !== 'growing') {
    budget?.spend('work', shape.holes.length);
    for (const hole of shape.holes) holes.add(key(hole));
  }
  const socket = (at: Coord): boolean =>
    isLatticeCoord(at) &&
    (shape.kind === 'growing' ||
      (at.x >= 0 && at.y >= 0 && at.x < shape.width && at.y < shape.height && !holes.has(key(at))));
  const price = inkPricer(inventions, lean, budget);
  const lookup = placementLookup(l);
  const byKey = new Map<CellKey, PlacedRune>();
  const glyphAt = new Map<CellKey, PlacedGlyph>();
  for (const r of l.runes) {
    if (isGlyph(r)) glyphAt.set(key(r.at), r);
    else byKey.set(key(r.at), r);
  }
  const runeAt = (at: Coord): PlacedRune | null =>
    socket(at) ? (byKey.get(key(at)) ?? null) : null;
  const glyphIn = (at: Coord): PlacedGlyph | null =>
    socket(at) ? (glyphAt.get(key(at)) ?? null) : null;
  const mappedCells = (def: GlyphDef, args?: PlacedGlyph['args']) => {
    budget?.spend('work', def.cells.length);
    if (budget)
      for (const _arg of Object.keys(args ?? {}))
        budget.spend('work', def.cells.length + def.params.length);
    return cellMap(def, args, inventions);
  };
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
      const id = `${key(n)}>${key(to)}`;
      if (budget && !touches.has(id) && !priced.has(key(n))) {
        priced.add(key(n));
        price(p.rune);
      }
      touches.set(id, { aura: p.rune as AuraRef, from: n, to });
    }
  };

  let priced = new Set<CellKey>();
  const record = (f: Frame, at: Coord, placed: PlacedRune, dir: Dir): void => {
    if (!budget) {
      f.path.push({ ...f.where(at), rune: placed.rune, dir: f.outward(dir) });
      f.cells.push(f.fired(at, placed));
      return;
    }
    // Two retained entries, plus repeated body pricing at each Glyph socket per spell.
    budget.spend('work', 2);
    const outerAt = f.where(at).at;
    const g = glyphIn(outerAt);
    if (!priced.has(key(outerAt))) {
      priced.add(key(outerAt));
      const def = g ? glyphs[g.glyph] : undefined;
      if (def) {
        budget.spend('work', def.cells.length);
        for (const cell of def.cells) price(cell.rune);
      } else price(placed.rune);
    }
    touch(outerAt);
  };

  // Jobs replace the JavaScript call stack. Push right before left to preserve cell claiming.
  const pending: (() => void)[] = [];
  function queueWalk(
    f: Frame,
    cell: Coord,
    dir: Dir,
    assign: (st: Step | null) => void,
    via: Trail | null = null,
    viaInner: Trail | null = null,
  ): void {
    // In preflight, queued jobs still traverse every branch but never link retained step trees.
    if (budget) assign = () => {};
    pending.push(() => {
      budget?.spend('work');
      const placed = f.runeAt(cell);
      if (!placed) {
        f.beyond(cell, dir, via, assign);
        return;
      }
      if (f.visited.has(key(cell))) {
        assign(null);
        return;
      }
      const r = role(placed.rune);
      if (r === null || r === 'aura' || r === 'source') {
        assign(null);
        return;
      }
      f.visited.add(key(cell));
      record(f, cell, placed, dir);
      const where = f.where(cell);
      const go = (d: Dir, set: (st: Step | null) => void): void =>
        queueWalk(f, step(cell, d), d, set);
      if (placed.rune === 'bend') {
        const out = placed.dir ?? 'right';
        if (out === opposite(dir)) {
          assign(null);
          return;
        }
        queueWalk(
          f,
          step(cell, out),
          out,
          assign,
          appendTrail(via, where.at),
          where.inner ? appendTrail(viaInner, where.inner) : null,
        );
        return;
      }
      // Bends share linked trails while walking; real steps copy both coordinate trails.
      budget?.spend('work', (via?.length ?? 0) + (where.inner ? (viaInner?.length ?? 0) : 0));
      const base = {
        ...where,
        ...(!budget && via ? { via: trailCoords(via) } : {}),
        ...(!budget && where.inner && viaInner ? { viaInner: trailCoords(viaInner) } : {}),
      };
      if (placed.rune === 'fork') {
        const st: Step = { ...base, role: 'fork', left: null, right: null };
        assign(st);
        go(turnRight(dir), (child) => {
          st.right = child;
        });
        go(turnLeft(dir), (child) => {
          st.left = child;
        });
        return;
      }
      let st: Step;
      if (placed.rune === 'seep' || placed.rune === 'lay' || placed.rune === 'toll')
        st = { ...base, role: 'shape', rune: placed.rune, next: null };
      else if (placed.rune === 'tally' || placed.rune === 'brink' || placed.rune === 'unison')
        st = { ...base, role: 'trigger', rune: placed.rune, next: null };
      else if (placed.rune === 'jar' || placed.rune === 'fuse')
        st = { ...base, role: 'seal', rune: placed.rune, rest: null };
      else if (r === 'action' || r === 'kind')
        st = { ...base, role: r, rune: placed.rune, auras: f.aurasAround(cell), next: null };
      else {
        assign(null);
        return;
      }
      assign(st);
      if (st.role === 'seal') {
        const seal = st;
        go(dir, (child) => {
          seal.rest = child;
        });
      } else if ('next' in st) {
        const next = st;
        go(dir, (child) => {
          next.next = child;
        });
      }
    });
  }
  function walkIn(f: Frame, cell: Coord, dir: Dir): Step | null {
    let result: Step | null = null;
    queueWalk(f, cell, dir, (st) => {
      result = st;
    });
    while (pending.length) pending.pop()?.();
    return result;
  }

  /** A Glyph's cells as a frame; leaving it continues the outer walk from the socket. */
  const innerFrame = (g: PlacedGlyph, def: GlyphDef, outer: Frame): Frame => {
    const local = mappedCells(def, g.args);
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
      beyond: (_at, dir, via, assign) => {
        const out = rotateDirLocal(dir, g.dir);
        let main: Step | null = null;
        pending.push(() => {
          if (extraSpent || def.extraExit === null) {
            assign(main);
            return;
          }
          extraSpent = true;
          const sideDir = rotateDirLocal(def.extraExit, g.dir);
          let side: Step | null = null;
          pending.push(() => {
            assign(
              main && side ? { at: g.at, role: 'split', branches: [main, side] } : (main ?? side),
            );
          });
          queueWalk(
            outer,
            step(g.at, sideDir),
            sideDir,
            (st) => {
              side = st;
            },
            via,
          );
        });
        queueWalk(
          outer,
          step(g.at, out),
          out,
          (st) => {
            main = st;
          },
          via,
        );
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
      beyond: (at, dir, via, assign) => {
        const g = glyphIn(at);
        const def = g ? glyphs[g.glyph] : undefined;
        if (!g || !def || def.kind !== 'payload' || dir !== g.dir) {
          assign(null);
          return;
        }
        if (visited.has(key(at)) || !mappedCells(def).has(key(def.entry))) {
          assign(null);
          return;
        }
        visited.add(key(at));
        queueWalk(innerFrame(g, def, frame), def.entry, 'right', assign, via);
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
      ink = addInk(
        ink,
        g ? placedInk(g, glyphs, l, inventions, lean, price, lookup) : price(p.rune),
      );
    }
    for (const a of auraCells) {
      const p = runeAt(a);
      if (p && !seen.has(key(a))) {
        seen.add(key(a));
        ink = addInk(ink, price(p.rune));
      }
    }
    return ink;
  }

  /** Plain Sources and Spell Glyph sockets, in reading order of their socket. */
  const origins: { at: Coord; glyph: PlacedGlyph | null }[] = [];
  for (const r of byKey.values()) if (isSourceRef(r.rune)) origins.push({ at: r.at, glyph: null });
  for (const g of glyphAt.values()) {
    if (socket(g.at) && glyphs[g.glyph]?.kind === 'spell') {
      origins.push({ at: g.at, glyph: g });
    }
  }
  origins.sort((a, b) => byReadingOrder(a.at, b.at));

  for (const origin of origins) {
    priced = new Set();
    const path: PathCell[] = [];
    const outer = outerFrame(new Set([key(origin.at)]), path, []);
    const spell = origin.glyph
      ? glyphSpell(origin.glyph, outer)
      : plainSpell(byKey.get(key(origin.at)), outer);
    if (budget) {
      // The materializing pass snapshots the accumulated aura touches once per origin.
      budget.spend('work', touches.size);
      continue;
    }
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
    record(outer, src.at, src, srcDir);
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
    const src = def ? mappedCells(def).get(key(def.entry)) : undefined;
    if (!def || !src || !isSourceRef(src.rune)) return null;
    const sourceRune = src.rune;
    const inner = innerFrame(g, def, outer);
    inner.visited.add(key(def.entry));
    record(inner, def.entry, src, 'right');
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
  const pending: (Step | string | null)[] = [st];
  const text: string[] = [];
  while (pending.length) {
    const item = pending.pop();
    if (!item) continue;
    if (typeof item === 'string') {
      text.push(item);
      continue;
    }
    switch (item.role) {
      case 'action':
      case 'kind':
      case 'shape':
        text.push(nameOf(item.rune, inventions));
        if (item.next) pending.push(item.next, ' → ');
        break;
      case 'trigger':
        text.push(`if ${RUNES[item.rune].name}: `);
        pending.push(item.next ?? '(nothing)');
        break;
      case 'seal':
        text.push(`${RUNES[item.rune].name}: [`);
        pending.push(']', item.rest);
        break;
      case 'fork':
        text.push('[left: ');
        pending.push(']', item.right ?? '—', ' | right: ', item.left ?? '—');
        break;
      case 'split':
        text.push('[');
        pending.push(']');
        for (let i = item.branches.length - 1; i >= 0; i--) {
          pending.push(item.branches[i] ?? null);
          if (i > 0) pending.push(' | ');
        }
    }
  }
  return text.join('');
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
  price: InkPrice = inkPricer(inventions, lean),
  lookup?: (at: Coord) => Placed | null,
): number {
  if (!isGlyph(p)) return price(p.rune);
  const def = glyphs[p.glyph];
  const auras = l
    ? neighbors4(p.at).filter((n) => {
        const q = lookup ? lookup(n) : socketAt(l, n);
        return !!q && !isGlyph(q) && roleOf(q.rune, inventions) === 'aura';
      }).length
    : 0;
  return addInk(def ? glyphCost(def, inventions, lean, price) : 1, auras);
}

export function inkUsed(
  l: Lattice,
  glyphs: GlyphLibrary = {},
  inventions: InventionLibrary = {},
  lean: Lean | null = null,
): number {
  const price = inkPricer(inventions, lean);
  const lookup = placementLookup(l);
  return l.runes.reduce(
    (sum, r) => addInk(sum, placedInk(r, glyphs, l, inventions, lean, price, lookup)),
    0,
  );
}

// ── Validation ──────────────────────────────────────────

/** Structural checks for one lattice. `capacity` null = unlimited (Lab). Knowledge is checked in run.ts. */
export function validateLattice(
  l: Lattice,
  capacity: number | null,
  glyphs: GlyphLibrary = {},
  inventions: InventionLibrary = {},
  lean: Lean | null = null,
  budget?: ImportBudget,
): LatticeIssue[] {
  const issues: LatticeIssue[] = [];
  const seen = new Set<CellKey>();
  for (const r of l.runes) {
    budget?.spend('work');
    if (isGlyph(r)) {
      if (!isSocket(l.shape, r.at)) {
        issues.push({ kind: 'socket', at: r.at, message: `Glyph ${r.glyph} is not on a socket` });
      }
      if (seen.has(key(r.at))) {
        issues.push({ kind: 'overlap', at: r.at, message: `Glyph ${r.glyph} shares a socket` });
      }
      seen.add(key(r.at));
      const def = Object.hasOwn(glyphs, r.glyph) ? glyphs[r.glyph] : undefined;
      if (!def) {
        issues.push({
          kind: 'socket',
          at: r.at,
          message: `Glyph ${r.glyph} is not in the library`,
        });
      } else {
        // A supplied body is indexed/walked once per socket when this imported page compiles.
        budget?.spend('work', def.cells.length);
        for (const [cell, arg] of Object.entries(r.args ?? {})) {
          budget?.spend('work', def.cells.length + def.params.length);
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
  const used = capacity === null ? 0 : inkUsed(l, glyphs, inventions, lean);
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
