import { RUNE_IDS, RUNES, type RuneId } from '$data';
import {
  canBeOpen,
  DIRS,
  type Dir,
  type GlyphArg,
  type GlyphDef,
  type GlyphInside,
  insideIssues,
  key,
  type PlacedRune,
  type Rng,
} from '$engine';

/** Helpers for the Glyph mastery fuzz (plan F1): random valid insides and same-family arguments. */

export function pickOf<T>(rng: Rng, xs: readonly T[]): T {
  return xs[rng.int(0, xs.length - 1)] as T;
}

const familyOf = (r: RuneId) => RUNES[r].family;

/** A same-family rune (other than `rune` unless `other` is false), owned at least once; null when there is none. */
export function sameFamily(
  rng: Rng,
  rune: RuneId,
  owned: (r: RuneId) => boolean,
  other = true,
): RuneId | null {
  const fam = familyOf(rune);
  const pool = RUNE_IDS.filter(
    (r) => familyOf(r) === fam && owned(r) && (!other || r !== rune) && fam !== 'source',
  );
  return pool.length > 0 ? pickOf(rng, pool) : null;
}

type Op = 'swap' | 'turn' | 'move';

/**
 * One random edit of the inside: swap a rune for one of its family, turn an arrow, or move a cell
 * one step. The result may still be invalid; the caller checks `insideIssues`.
 */
function editOnce(
  inside: GlyphInside,
  rng: Rng,
  owned: (r: RuneId) => boolean,
): GlyphInside | null {
  const cells: PlacedRune[] = inside.cells.map((c) => ({ ...c, at: { ...c.at } }));
  const isEntry = (c: PlacedRune) => c.at.x === inside.entry.x && c.at.y === inside.entry.y;
  const op = pickOf<Op>(rng, ['swap', 'swap', 'turn', 'move']);
  const i = rng.int(0, cells.length - 1);
  const cell = cells[i] as PlacedRune;
  if (op === 'swap') {
    const rune = sameFamily(rng, cell.rune, owned);
    if (!rune) return null;
    const dir = isEntry(cell) ? 'right' : (cell.dir ?? pickOf(rng, DIRS));
    cells[i] = RUNES[rune].arrow ? { at: cell.at, rune, dir } : { at: cell.at, rune };
  } else if (op === 'turn') {
    if (!RUNES[cell.rune].arrow || isEntry(cell)) return null;
    cells[i] = {
      ...cell,
      dir: pickOf(
        rng,
        DIRS.filter((d) => d !== cell.dir),
      ),
    };
  } else {
    if (isEntry(cell)) return null;
    const d = pickOf(rng, DIRS);
    const to = {
      x: cell.at.x + (d === 'right' ? 1 : d === 'left' ? -1 : 0),
      y: cell.at.y + (d === 'down' ? 1 : d === 'up' ? -1 : 0),
    };
    if (cells.some((c) => c.at.x === to.x && c.at.y === to.y)) return null;
    if (to.x === inside.entry.x && to.y === inside.entry.y) return null;
    cells[i] = { ...cell, at: to };
  }
  return { kind: inside.kind, cells, entry: { ...inside.entry } };
}

/** A random inside one to three edits from `inside` with no `insideIssues` at all, or null. */
export function randomValidInside(
  inside: GlyphInside,
  rng: Rng,
  owned: (r: RuneId) => boolean,
): GlyphInside | null {
  for (let attempt = 0; attempt < 8; attempt++) {
    let cur: GlyphInside | null = inside;
    const edits = rng.int(1, 3);
    for (let e = 0; e < edits && cur; e++) cur = editOnce(cur, rng, owned);
    if (cur && insideIssues(cur).length === 0) return cur;
  }
  return null;
}

/** An argument for one of the Glyph's cells: a same-family rune (the default's own too), arrows turned at random. */
export function randomArg(
  rng: Rng,
  def: GlyphDef,
  cellKey: string,
  owned: (r: RuneId) => boolean,
): GlyphArg | null {
  const cell = def.cells.find((c) => key(c.at) === cellKey);
  if (!cell || !canBeOpen(cell.rune)) return null;
  const rune = sameFamily(rng, cell.rune, owned, false);
  if (!rune) return null;
  return RUNES[rune].arrow ? { rune, dir: pickOf<Dir>(rng, DIRS) } : { rune };
}
