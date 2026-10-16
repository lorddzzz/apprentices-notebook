import { RUNES, type RuneId, TUNING } from '$data';
import {
  baseGlyphCost,
  type Coord,
  type GlyphDef,
  type GlyphInside,
  type PlacedRune,
  revisionCanvas,
  sameCoord,
  turnRight,
} from '$engine';
import type { PaletteSlot, ShelfSlot, ShelfTool } from './study';

/**
 * The revision editor's reducer (plan M18, M19, M34): taps on the canvas turn into a new inside.
 * Pure: every function returns a new inside and says why when it refused. The issues themselves
 * (what is wrong with an inside) are the engine's `insideIssues`, shown live by the component.
 */
export interface Edit {
  inside: GlyphInside;
  /** Why nothing happened (or a note), or null. */
  message: string | null;
}

const kept = (inside: GlyphInside, message: string | null = null): Edit => ({ inside, message });

const copy = (c: PlacedRune): PlacedRune =>
  c.dir ? { at: { ...c.at }, rune: c.rune, dir: c.dir } : { at: { ...c.at }, rune: c.rune };

const withCells = (inside: GlyphInside, cells: PlacedRune[]): GlyphInside => ({
  kind: inside.kind,
  entry: { ...inside.entry },
  cells,
});

const cellAt = (inside: GlyphInside, at: Coord): PlacedRune | undefined =>
  inside.cells.find((c) => sameCoord(c.at, at));

/** How many of each rune the inside holds. */
export function usedRunes(inside: GlyphInside): Partial<Record<RuneId, number>> {
  const used: Partial<Record<RuneId, number>> = {};
  for (const c of inside.cells) used[c.rune] = (used[c.rune] ?? 0) + 1;
  return used;
}

/** The cells of the canvas the player may tap, row by row (M18). */
export function canvasCells(inside: GlyphInside): Coord[] {
  const { origin, width, height } = revisionCanvas(inside);
  return Array.from({ length: width * height }, (_, i) => ({
    x: origin.x + (i % width),
    y: origin.y + Math.floor(i / width),
  }));
}

/** The palette as shelf slots: `free` is what the inside may still add (null = no limit). */
export function paletteSlots(palette: readonly PaletteSlot[], inside: GlyphInside): ShelfSlot[] {
  const used = usedRunes(inside);
  return palette.map(({ rune, count }) => {
    const free = count === null ? null : Math.max(0, count - (used[rune] ?? 0));
    return {
      rune,
      known: true,
      owned: count,
      free,
      cost: TUNING.inkCost[RUNES[rune].family],
      usable: free !== 0,
      affordable: true,
      reason: free === 0 ? `No ${RUNES[rune].name} left` : null,
    };
  });
}

const ENTRY_STAYS = 'The entry stays where the flow comes in';

/** A Spell Glyph's entry is a Source with its arrow fixed; a Payload's entry may change its rune and arrow. */
const locked = (inside: GlyphInside, at: Coord): boolean =>
  inside.kind === 'spell' && sameCoord(at, inside.entry);

/** Lifts the rune at `at` (long-press, or the Erase tool). The entry can't be lifted. */
export function liftCell(inside: GlyphInside, at: Coord): Edit {
  const placed = cellAt(inside, at);
  if (!placed) return kept(inside);
  if (sameCoord(at, inside.entry)) return kept(inside, ENTRY_STAYS);
  return kept(withCells(inside, inside.cells.filter((c) => c !== placed).map(copy)));
}

/** Turns an arrow rune a quarter to the right; nothing for the rest. */
export function turnCell(inside: GlyphInside, at: Coord): Edit {
  const placed = cellAt(inside, at);
  if (!placed || !RUNES[placed.rune].arrow) return kept(inside);
  if (locked(inside, at)) return kept(inside, "The Source's arrow is fixed to the right");
  const cells = inside.cells.map((c) =>
    c === placed ? { at: { ...c.at }, rune: c.rune, dir: turnRight(c.dir ?? 'right') } : copy(c),
  );
  return kept(withCells(inside, cells));
}

/** Puts `rune` at `at`, replacing what stands there; refused when the palette has none left. */
export function placeRune(
  inside: GlyphInside,
  at: Coord,
  rune: RuneId,
  palette: readonly PaletteSlot[],
): Edit {
  const placed = cellAt(inside, at);
  if (locked(inside, at)) return kept(inside, ENTRY_STAYS);
  if (!canvasCells(inside).some((c) => sameCoord(c, at))) return kept(inside, 'Off the page');
  const slot = palette.find((s) => s.rune === rune);
  if (!slot) return kept(inside, `You don't hold ${RUNES[rune].name}`);
  const used = (usedRunes(inside)[rune] ?? 0) - (placed?.rune === rune ? 1 : 0);
  if (slot.count !== null && used >= slot.count) {
    return kept(inside, `No ${RUNES[rune].name} left`);
  }
  const dir = RUNES[rune].arrow ? (placed?.dir ?? 'right') : undefined;
  const next: PlacedRune = dir ? { at: { ...at }, rune, dir } : { at: { ...at }, rune };
  const cells = [...inside.cells.filter((c) => c !== placed).map(copy), next];
  return kept(withCells(inside, cells));
}

/**
 * One tap on a canvas cell with the held tool: Erase lifts; a rune is placed, or turned when the
 * same arrow rune is already there; with nothing held an arrow rune turns.
 */
export function tapCell(
  inside: GlyphInside,
  at: Coord,
  tool: ShelfTool,
  palette: readonly PaletteSlot[],
): Edit {
  if (tool.kind === 'erase') return liftCell(inside, at);
  const placed = cellAt(inside, at);
  if (tool.kind === 'rune' && placed?.rune !== tool.rune) {
    return placeRune(inside, at, tool.rune, palette);
  }
  return turnCell(inside, at);
}

const sameCell = (a: PlacedRune, b: PlacedRune): boolean =>
  sameCoord(a.at, b.at) && a.rune === b.rune && a.dir === b.dir;

/** Whether the two insides hold the same cells (Save needs a change). */
export function sameInside(a: GlyphInside, b: GlyphInside): boolean {
  return (
    a.cells.length === b.cells.length && a.cells.every((c) => b.cells.some((d) => sameCell(c, d)))
  );
}

/** The ink a Glyph with this inside costs a page, before any Economy discount (a revision starts without one). */
export function insideInk(inside: GlyphInside): number {
  const probe: GlyphDef = {
    id: '__inside',
    name: 'Inside',
    kind: inside.kind,
    cells: inside.cells,
    entry: inside.entry,
    exits: [],
    idiom: null,
    version: 1,
    params: [],
    extraExit: null,
  };
  return baseGlyphCost(probe);
}
