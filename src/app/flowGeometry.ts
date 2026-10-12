import type { AuraTouch, CellKey, CompiledLattice, Lattice, SpellKey } from '$engine';
import { type Coord, type Dir, key, opposite, step } from '$engine';

/** A one-step piece of a spell's flow: from the previous cell into `to`, travelling `dir`. */
export interface FlowSegment {
  spell: SpellKey;
  from: Coord;
  to: Coord;
  dir: Dir;
  /** Drawn strong: it belongs to the focused spell (or nothing is focused). */
  focused: boolean;
}

/** Works across forks: a branch's first cell links back to the fork cell via its entry direction. */
export function flowSegments(compiled: CompiledLattice, focus: SpellKey | null): FlowSegment[] {
  return compiled.spells.flatMap((spell) =>
    spell.path.slice(1).map((cell) => ({
      spell: spell.key,
      from: step(cell.at, opposite(cell.dir)),
      to: cell.at,
      dir: cell.dir,
      focused: focus === null || focus === spell.key,
    })),
  );
}

/** Cells of the focused spell's path (empty when nothing is focused). */
export function focusedCells(compiled: CompiledLattice, focus: SpellKey | null): Set<CellKey> {
  const spell = focus === null ? undefined : compiled.spells.find((s) => s.key === focus);
  return new Set(spell ? spell.path.map((c) => key(c.at)) : []);
}

/** Runes that currently do nothing: not on any flow path and not an aura touching something. */
export function idleCells(lattice: Lattice, compiled: CompiledLattice): Set<CellKey> {
  const live = new Set<CellKey>(compiled.reached);
  for (const t of compiled.auraTouches) live.add(key(t.from));
  return new Set(lattice.runes.map((r) => key(r.at)).filter((k) => !live.has(k)));
}

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const DIR_VEC: Record<Dir, Coord> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

/** Cell-centre to cell-centre, in cell units (a cell is 1 × 1), trimmed by `trim` at both ends. */
export function linkLine(from: Coord, to: Coord, trim: number): Line {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: from.x + 0.5 + ux * trim,
    y1: from.y + 0.5 + uy * trim,
    x2: to.x + 0.5 - ux * trim,
    y2: to.y + 0.5 - uy * trim,
  };
}

/** Triangle points ("x,y x,y x,y") centred on a trimmed segment's midpoint, pointing along `dir`. */
export function arrowHead(line: Line, dir: Dir, size = 0.09): string {
  const mx = (line.x1 + line.x2) / 2;
  const my = (line.y1 + line.y2) / 2;
  const d = DIR_VEC[dir];
  const px = -d.y;
  const py = d.x;
  const tip = { x: mx + d.x * size, y: my + d.y * size };
  const a = { x: mx - d.x * size + px * size, y: my - d.y * size + py * size };
  const b = { x: mx - d.x * size - px * size, y: my - d.y * size - py * size };
  return `${tip.x},${tip.y} ${a.x},${a.y} ${b.x},${b.y}`;
}

export function auraLinks(touches: readonly AuraTouch[]): { from: Coord; to: Coord }[] {
  return touches.map((t) => ({ from: t.from, to: t.to }));
}
