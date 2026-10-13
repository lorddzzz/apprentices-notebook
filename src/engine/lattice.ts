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
  Lattice,
  LatticeIssue,
  LatticeShape,
  PathCell,
  Placed,
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

/** Flow walk from every Source rune. Pure and static: no battle state is involved. */
export function compileLattice(l: Lattice, affinity: readonly MaterialId[]): CompiledLattice {
  const byKey = new Map<CellKey, PlacedRune>();
  // B1: a Glyph socket is an insulator for now, so it is left out of the rune map.
  for (const r of l.runes) if (!isGlyph(r)) byKey.set(key(r.at), r);
  const runeAt = (at: Coord): PlacedRune | null =>
    isSocket(l.shape, at) ? (byKey.get(key(at)) ?? null) : null;
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

  const sources = [...byKey.values()]
    .filter((r) => isSource(r.rune))
    .sort((a, b) => byReadingOrder(a.at, b.at));
  for (const src of sources) {
    const sourceRune = src.rune;
    if (!isSource(sourceRune)) continue;
    const srcDir = src.dir ?? 'right';
    const visited = new Set<CellKey>([key(src.at)]);
    const path: PathCell[] = [{ at: src.at, rune: sourceRune, dir: srcDir }];

    const walk = (cell: Coord, dir: Dir): SpellNode[] => {
      const placed = runeAt(cell);
      if (!placed || visited.has(key(cell))) return [];
      const def = RUNES[placed.rune];
      if (def.family === 'aura' || def.family === 'source') return []; // insulators
      visited.add(key(cell));
      path.push({ at: cell, rune: placed.rune, dir });

      if (placed.rune === 'bend') {
        const out = placed.dir ?? 'right';
        if (out === opposite(dir)) return [];
        return walk(step(cell, out), out);
      }
      if (placed.rune === 'fork') {
        // Left must walk first: it claims shared cells before the right branch.
        const left = walk(step(cell, turnLeft(dir)), turnLeft(dir));
        const right = walk(step(cell, turnRight(dir)), turnRight(dir));
        return [...left, ...right];
      }
      if (isMaterial(placed.rune)) {
        const amp = countAround(cell, 'amplify');
        const bonus = affinity.includes(placed.rune) ? TUNING.affinityBonus : 0;
        return [
          {
            kind: 'material',
            rune: placed.rune,
            at: cell,
            amp,
            magnitude: def.base + amp + bonus,
            next: walk(step(cell, dir), dir),
          },
        ];
      }
      if (isTrigger(placed.rune)) {
        return [{ kind: 'trigger', rune: placed.rune, at: cell, next: walk(step(cell, dir), dir) }];
      }
      return [];
    };

    const nodes = walk(step(src.at, srcDir), srcDir);
    const amp = countAround(src.at, 'amplify');
    spells.push({
      key: key(src.at),
      at: src.at,
      source: sourceRune,
      amp,
      magnitude: RUNES[sourceRune].base + amp,
      echo: countAround(src.at, 'echo') > 0,
      charges: RUNES[sourceRune].charges,
      nodes,
      path,
    });

    touch('echo', src.at);
    for (const cell of path) {
      reached.add(key(cell.at));
      // Amplify only matters on the source and on material cells.
      if (isSource(cell.rune) || isMaterial(cell.rune)) touch('amplify', cell.at);
    }
  }

  return { spells, reached: [...reached], auraTouches: [...touches.values()] };
}

// ── Descriptions ────────────────────────────────────────

function describeNode(node: SpellNode): string {
  if (node.kind === 'trigger') {
    const inner = describeNodes(node.next) || '(nothing)';
    return node.rune === 'onInked' ? `if inked: ${inner}` : `on kill, from each victim: ${inner}`;
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
      return `Bolt (${s.magnitude} damage)`;
    case 'quill':
      return `Quill (${s.magnitude} damage, pools ink)`;
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

/** B1: a Glyph counts 1 ink until glyph costs exist. */
export const placedInk = (p: Placed): number => (isGlyph(p) ? 1 : inkCost(p.rune));

export function inkUsed(l: Lattice): number {
  return l.runes.reduce((sum, r) => sum + placedInk(r), 0);
}

export function countRunes(ls: readonly Lattice[]): Record<RuneId, number> {
  const counts = Object.fromEntries(RUNE_IDS.map((id) => [id, 0])) as Record<RuneId, number>;
  for (const l of ls) for (const r of l.runes) if (!isGlyph(r)) counts[r.rune] += 1; // B2 counts Glyph contents
  return counts;
}

// ── Validation ──────────────────────────────────────────

/** Structural checks for one lattice. `capacity` null = unlimited (Lab). Ownership is checked in run.ts. */
export function validateLattice(l: Lattice, capacity: number | null): LatticeIssue[] {
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
  const used = inkUsed(l);
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
