import { type DraftDef, type LootTableId, RUNE_IDS, RUNES, type RuneId } from '$data';
import {
  type Coord,
  DIRS,
  type Dir,
  draftInside,
  draftTest,
  type GlyphInside,
  key,
  revisionCanvas,
  sameCoord,
  trayIssue,
} from '$engine';

/**
 * Folio test helpers (BL-14, folios plan §2.3): small edits to an inside, a soundness check for a
 * folio and its intended solutions, and every single edit the tray allows.
 */

export type Tweak = (i: GlyphInside) => GlyphInside;
type Cells = GlyphInside['cells'];

export const at = (x: number, y: number): Coord => ({ x, y });
const here = (c: { at: Coord }, where: [number, number]) =>
  c.at.x === where[0] && c.at.y === where[1];

/** Moves the rune at `from` to `to` (local cells; the entry is (0,0)). */
export const moveCell =
  (from: [number, number], to: [number, number]): Tweak =>
  (i) => ({
    ...i,
    cells: i.cells.map((c) => (here(c, from) ? { ...c, at: at(...to) } : c)),
  });

/** Changes the rune or arrow at `where`. */
export const patchCell =
  (where: [number, number], patch: { rune?: RuneId; dir?: Dir }): Tweak =>
  (i) => ({
    ...i,
    cells: i.cells.map((c) => (here(c, where) ? { ...c, ...patch } : c)),
  });

/** Places a rune on an empty cell. */
export const place =
  (where: [number, number], rune: RuneId, dir?: Dir): Tweak =>
  (i) => ({
    ...i,
    cells: [...i.cells, dir ? { at: at(...where), rune, dir } : { at: at(...where), rune }],
  });

/** Lifts the rune at `where`. */
export const lift =
  (where: [number, number]): Tweak =>
  (i) => ({ ...i, cells: i.cells.filter((c) => !here(c, where)) });

/** Applies tweaks in order. */
export const both =
  (...tweaks: Tweak[]): Tweak =>
  (i) =>
    tweaks.reduce((acc, t) => t(acc), i);

/** The 2026-10-16 one-page fixes, which must no longer mend a folio (plan F15). */
export const OLD_FIXES: Record<string, Tweak> = {
  lamplighter: patchCell([1, 0], { dir: 'down' }),
  collection: both(patchCell([1, 0], { rune: 'ink' }), patchCell([2, 0], { rune: 'onInked' })),
  'wet-work': moveCell([2, 1], [1, 1]),
  'left-hand-first': both(
    patchCell([1, -1], { rune: 'oil' }),
    patchCell([1, 1], { rune: 'spark' }),
  ),
  'foundry-bell': both(moveCell([1, -1], [0, -1]), patchCell([3, 0], { dir: 'down' })),
};

/** Pages per folio by depth, and the final shape's rune count (plan F14). */
export const FOLIO_SIZE: Record<LootTableId, { pages: number; runes: [number, number] }> = {
  shallow: { pages: 2, runes: [5, 7] },
  deep: { pages: 3, runes: [8, 10] },
  heart: { pages: 4, runes: [10, 12] },
};

/** The inside after the tests of pages 0..`page` all pass? */
export const passesUpTo = (d: DraftDef, page: number, inside: GlyphInside): boolean =>
  d.pages.slice(0, page + 1).every((p) => draftTest(d, p.test, inside).passed);

/**
 * Everything wrong with a folio and its intended solutions (one inside per page), or [] when it is
 * sound: the start fails page 1; each solution fits its tray and passes its tests and every earlier
 * one, but not the next page's; the final shape uses no decoy and every other scrap; sizes per F14.
 */
export function checkFolio(d: DraftDef, solutions: readonly GlyphInside[]): string[] {
  const problems: string[] = [];
  const size = FOLIO_SIZE[d.depth];
  if (d.pages.length !== size.pages) {
    problems.push(`${d.id}: ${d.pages.length} pages, a ${d.depth} folio has ${size.pages}`);
  }
  if (solutions.length !== d.pages.length) {
    problems.push(`${d.id}: ${solutions.length} solutions for ${d.pages.length} pages`);
  }
  const start = draftInside(d);
  const firstTest = d.pages[0]?.test;
  if (firstTest && draftTest(d, firstTest, start).passed) {
    problems.push(`${d.id}: the owner's page already passes page 1`);
  }
  solutions.forEach((s, k) => {
    const tray = trayIssue(d, k, s);
    if (tray) problems.push(`${d.id} page ${k + 1}: ${tray}`);
    d.pages.slice(0, k + 1).forEach((p, j) => {
      if (!draftTest(d, p.test, s).passed) {
        problems.push(`${d.id} page ${k + 1}: its solution fails test ${j + 1}`);
      }
    });
    const next = d.pages[k + 1];
    if (next && draftTest(d, next.test, s).passed) {
      problems.push(`${d.id} page ${k + 1}: its solution already passes test ${k + 2}`);
    }
  });
  const last = solutions[solutions.length - 1];
  if (last) {
    const used = new Set<RuneId>(last.cells.map((c) => c.rune));
    for (const r of d.decoys)
      if (used.has(r)) problems.push(`${d.id}: the final shape uses the decoy ${r}`);
    const pageRunes = new Set<RuneId>(start.cells.map((c) => c.rune));
    for (const p of d.pages) {
      for (const r of Object.keys(p.scraps) as RuneId[]) {
        if (!d.decoys.includes(r) && !used.has(r) && !pageRunes.has(r)) {
          problems.push(`${d.id}: the scrap ${r} is never used (and isn't a decoy)`);
        }
      }
    }
    const n = last.cells.length;
    if (n < size.runes[0] || n > size.runes[1]) {
      problems.push(
        `${d.id}: the final shape has ${n} runes, a ${d.depth} folio wants ${size.runes.join('–')}`,
      );
    }
  }
  return problems;
}

const isEntry = (i: GlyphInside, c: Coord) => sameCoord(c, i.entry);

/**
 * Every inside one edit away within `tray`: a place on an empty canvas cell (each arrow for arrow
 * runes), a lift, or a turn. A Spell's entry stays locked; a Payload's entry may be lifted or turned.
 */
export function oneEditNeighbours(
  inside: GlyphInside,
  tray: Partial<Record<RuneId, number>>,
): GlyphInside[] {
  const out: GlyphInside[] = [];
  const used: Partial<Record<RuneId, number>> = {};
  for (const c of inside.cells) used[c.rune] = (used[c.rune] ?? 0) + 1;
  const free = RUNE_IDS.filter((r) => (tray[r] ?? 0) - (used[r] ?? 0) > 0);
  const canvas = revisionCanvas(inside);
  const taken = new Set(inside.cells.map((c) => key(c.at)));
  const locked = (c: Coord) => inside.kind === 'spell' && isEntry(inside, c);
  const withCells = (cells: Cells): GlyphInside => ({ ...inside, cells });
  for (let y = canvas.origin.y; y < canvas.origin.y + canvas.height; y += 1) {
    for (let x = canvas.origin.x; x < canvas.origin.x + canvas.width; x += 1) {
      if (taken.has(key({ x, y }))) continue;
      for (const r of free) {
        if (RUNES[r].family === 'source' && inside.kind === 'spell') continue;
        const dirs: (Dir | undefined)[] = RUNES[r].arrow ? [...DIRS] : [undefined];
        for (const dir of dirs) {
          const cell = dir ? { at: at(x, y), rune: r, dir } : { at: at(x, y), rune: r };
          out.push(withCells([...inside.cells, cell]));
        }
      }
    }
  }
  inside.cells.forEach((c, n) => {
    if (locked(c.at)) return;
    out.push(withCells(inside.cells.filter((_, m) => m !== n)));
    if (RUNES[c.rune].arrow) {
      for (const dir of DIRS) {
        if (dir === c.dir) continue;
        out.push(withCells(inside.cells.map((x, m) => (m === n ? { ...x, dir } : x))));
      }
    }
  });
  return out;
}
