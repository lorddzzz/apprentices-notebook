import { MEMBERS, type RuneRef, TUNING } from '$data';
import { argIssue, canBeOpen } from './glyph';
import {
  type Coord,
  type Dir,
  isLatticeCoord,
  key,
  latticeLabel as label,
  neighbors4,
  opposite,
  sameCoord,
  step,
  turnLeft,
  turnRight,
} from './grid';
import { compileLattice, hasArrow, nameOf, roleOf } from './lattice';
import { pageBounds } from './page';
import { emptyRecord, recordOf, rewardsOf, versionKey } from './profiler';
import { glyphLibrary, pageOf, validateLoadout } from './run';
import type {
  AuraTouch,
  CellKey,
  CompiledLattice,
  GlyphDef,
  GlyphId,
  GlyphInside,
  GlyphLibrary,
  GlyphRecord,
  Lattice,
  PathCell,
  PlacedRune,
  Profile,
  Spell,
} from './types';

/**
 * Versions and revisions (design research-and-mastery §4.8, plan M17–M20): editing a Glyph's
 * inside at home makes a new version with a fresh record; revert is free; open cells and the extra
 * exit are settings of the current version.
 *
 * Profile changes return a new profile and throw an Error with a readable reason when refused.
 */

/** Why an inside can't be saved (M18). Not `blocking` = a draft's test may still run (M34). */
export interface InsideIssue {
  kind:
    | 'entry'
    | 'kind'
    | 'source'
    | 'size'
    | 'stranded'
    | 'aura'
    | 'arrow'
    | 'coordinate'
    | 'overlap';
  at?: Coord; // local cell
  message: string;
  blocking: boolean;
}

/** The editor's canvas in local coordinates: the inside's bounding box plus a ring of 1, ≤ 7 × 7 (M18). */
export interface RevisionCanvas {
  origin: Coord; // top-left local cell
  width: number;
  height: number;
}

/** One version of a Glyph, with its record (the Versions list). */
export interface GlyphVersion {
  def: GlyphDef;
  record: GlyphRecord;
  current: boolean;
}

/** The sides an extra exit may take: never left, the way in (M26). */
const EXTRA_SIDES: readonly Dir[] = ['up', 'right', 'down'];

/** What a revision edits. */
export function insideOf(def: GlyphDef): GlyphInside {
  return { kind: def.kind, cells: def.cells, entry: def.entry };
}

const roleIn = (r: RuneRef) => roleOf(r);

/** Sparse bounds only: never allocates the rectangle or changes local coordinates. */
export function revisionCanvas(inside: GlyphInside): RevisionCanvas {
  return pageBounds(
    (function* () {
      yield inside.entry;
      for (const cell of inside.cells) yield cell.at;
    })(),
  );
}

const cellMapOf = (cells: readonly PlacedRune[]): Map<CellKey, PlacedRune> =>
  new Map(cells.map((c) => [key(c.at), c]));

/** The inside as a throwaway Glyph, so the real compiler can walk it. */
function probeDef(inside: GlyphInside): GlyphDef {
  return {
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
}

/**
 * The inside's flow when it stands alone, in local cells: the compiler's walk with each path
 * cell at its local coord (the probe socket faces right, so local directions read straight).
 * Aura touches follow the outer board's rules for sources and path cells.
 */
export function insideFlow(inside: GlyphInside): CompiledLattice {
  const def = probeDef(inside);
  const lib: GlyphLibrary = { [def.id]: def };
  const lattice: Lattice =
    inside.kind === 'spell'
      ? {
          shape: { width: 1, height: 1, holes: [] },
          runes: [{ at: { x: 0, y: 0 }, glyph: def.id, dir: 'right' }],
        }
      : {
          shape: { width: 2, height: 1, holes: [] },
          runes: [
            { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
            { at: { x: 1, y: 0 }, glyph: def.id, dir: 'right' },
          ],
        };
  const local = cellMapOf(inside.cells);
  const reached = new Set<CellKey>();
  const touches = new Map<string, AuraTouch>();
  const touch = (to: Coord): void => {
    for (const n of neighbors4(to)) {
      const c = local.get(key(n));
      if (!c || roleIn(c.rune) !== 'aura') continue;
      touches.set(`${key(n)}>${key(to)}`, { aura: c.rune as AuraTouch['aura'], from: n, to });
    }
  };
  const spells: Spell[] = [];
  for (const spell of compileLattice(lattice, lib).spells) {
    const path: PathCell[] = spell.path.flatMap((p) =>
      p.inner ? [{ at: p.inner, rune: p.rune, dir: p.dir }] : [],
    );
    for (const p of path) {
      reached.add(key(p.at));
      touch(p.at);
    }
    spells.push({ ...spell, key: key(inside.entry), at: inside.entry, path });
  }
  return { spells, reached: [...reached], auraTouches: [...touches.values()] };
}

/** Every rule of M18 the inside breaks. A stranded cell or a lone aura is the only non-blocking kind (M34). */
export function insideIssues(inside: GlyphInside): InsideIssue[] {
  const issues: InsideIssue[] = [];
  const add = (kind: InsideIssue['kind'], message: string, blocking: boolean, at?: Coord): void => {
    issues.push(at ? { kind, at: { ...at }, message, blocking } : { kind, message, blocking });
  };
  if (!isLatticeCoord(inside.entry) || inside.cells.some((c) => !isLatticeCoord(c.at))) {
    add('coordinate', 'Invalid lattice coordinate', true);
    return issues;
  }
  const spell = inside.kind === 'spell';
  const seen = new Set<CellKey>();
  for (const c of inside.cells) {
    if (seen.has(key(c.at))) add('overlap', `Two runes share ${label(c.at)}`, true, c.at);
    seen.add(key(c.at));
    const name = nameOf(c.rune);
    if (hasArrow(c.rune) !== (c.dir !== undefined)) {
      add(
        'arrow',
        hasArrow(c.rune) ? `${name} needs an arrow` : `${name} takes no arrow`,
        true,
        c.at,
      );
    }
  }

  // The entry is pinned at (0,0), flow entering rightward.
  const entry = inside.cells.find((c) => sameCoord(c.at, inside.entry));
  const pinned = sameCoord(inside.entry, { x: 0, y: 0 });
  if (!pinned)
    add('entry', 'The entry stays at the corner where the flow comes in', true, inside.entry);
  if (!entry) {
    add('entry', 'Nothing stands at the entry', true, inside.entry);
  } else {
    const family = roleIn(entry.rune);
    if (spell && family !== 'source')
      add('kind', 'A Spell Glyph starts with a Source', true, entry.at);
    if (!spell && (family === 'source' || family === 'aura')) {
      add(
        'kind',
        'A Payload starts with a rune that takes the flow, not a Source or an Aura',
        true,
        entry.at,
      );
    }
    if (spell && family === 'source' && entry.dir !== undefined && entry.dir !== 'right') {
      add('entry', "The Source's arrow is fixed to the right", true, entry.at);
    }
  }
  for (const c of inside.cells) {
    if (c === entry || roleIn(c.rune) !== 'source') continue;
    add(
      'source',
      spell ? 'A Spell Glyph holds only one Source' : 'A Payload holds no Source',
      true,
      c.at,
    );
  }

  const flow = new Set(inside.cells.filter((c) => roleIn(c.rune) !== 'aura').map((c) => key(c.at)));
  if (flow.size < TUNING.glyphMinCells || flow.size > TUNING.glyphMaxCells) {
    add(
      'size',
      `A Glyph holds ${TUNING.glyphMinCells} to ${TUNING.glyphMaxCells} flow cells, not ${flow.size}`,
      true,
    );
  }

  // Reach is only meaningful once the way in works.
  if (entry && pinned && issues.every((i) => i.kind !== 'kind' && i.kind !== 'entry')) {
    const reached = new Set(insideFlow(inside).reached);
    for (const c of inside.cells) {
      const family = roleIn(c.rune);
      if (family === 'source') continue;
      const name = nameOf(c.rune);
      if (family === 'aura') {
        const touches = [
          { x: c.at.x, y: c.at.y - 1 },
          { x: c.at.x + 1, y: c.at.y },
          { x: c.at.x, y: c.at.y + 1 },
          { x: c.at.x - 1, y: c.at.y },
        ].some((n) => reached.has(key(n)));
        if (!touches)
          add('aura', `${name} at ${label(c.at)} touches nothing the flow reaches`, false, c.at);
      } else if (!reached.has(key(c.at))) {
        add('stranded', `${name} at ${label(c.at)} is never reached`, false, c.at);
      }
    }
  }
  return issues;
}

/**
 * The inner walk once more, for the exits: the same rules as the compiler (Bend, Fork left first,
 * insulators) with nothing outside, so every step onto an empty cell is a way out.
 */
function walkInside(inside: GlyphInside): GlyphDef['exits'][number][] {
  const cells = cellMapOf(inside.cells);
  const exits: GlyphDef['exits'][number][] = [];
  const visited = new Set<CellKey>();
  const entry = cells.get(key(inside.entry));
  if (!entry) return exits;

  const pending: { at: Coord; dir: Dir; from: Coord }[] = [];
  if (inside.kind === 'spell') {
    if (roleIn(entry.rune) === 'source') {
      visited.add(key(inside.entry));
      pending.push({ at: step(inside.entry, 'right'), dir: 'right', from: inside.entry });
    }
  } else {
    pending.push({
      at: inside.entry,
      dir: 'right',
      from: { x: inside.entry.x - 1, y: inside.entry.y },
    });
  }
  const exitKeys = new Set<string>();
  while (pending.length) {
    const current = pending.pop();
    if (!current) continue;
    const { at, dir, from } = current;
    const placed = cells.get(key(at));
    if (!placed) {
      const exitKey = `${key(from)}:${dir}`;
      if (!exitKeys.has(exitKey)) {
        exitKeys.add(exitKey);
        exits.push({ from: { ...from }, dir });
      }
      continue;
    }
    const role = roleIn(placed.rune);
    if (visited.has(key(at)) || role === null || role === 'aura' || role === 'source') continue;
    visited.add(key(at));
    const go = (out: Dir): void => {
      pending.push({ at: step(at, out), dir: out, from: at });
    };
    if (placed.rune === 'bend') {
      const out = placed.dir ?? 'right';
      if (out !== opposite(dir)) go(out);
    } else if (placed.rune === 'fork') {
      go(turnRight(dir));
      go(turnLeft(dir));
    } else go(dir);
  }
  return exits;
}

/** The exits an inside has (recomputed on every revision, M18). Idioms are log patterns now (P7). */
export function innerMeta(inside: GlyphInside): {
  exits: GlyphDef['exits'];
  idiom: string | null;
} {
  return { exits: walkInside(inside), idiom: null };
}

// ── Versions ────────────────────────────────────────────

function currentOf(p: Profile, id: GlyphId): GlyphDef {
  const def = p.glyphs.find((g) => g.id === id);
  if (!def) throw new Error(`No Glyph ${id}`);
  return def;
}

/** The highest version number the Glyph (or an orphan record) ever had. */
function highestVersion(p: Profile, id: GlyphId): number {
  const fromRecords = Object.keys(p.glyphRecords)
    .filter((k) => k.startsWith(`${id}@`))
    .map((k) => Number(k.slice(id.length + 1)))
    .filter((n) => Number.isInteger(n));
  const defs = [...p.glyphs, ...p.glyphArchive].filter((g) => g.id === id).map((g) => g.version);
  return Math.max(0, ...defs, ...fromRecords);
}

const copyCell = (c: PlacedRune): PlacedRune =>
  c.dir ? { at: { ...c.at }, rune: c.rune, dir: c.dir } : { at: { ...c.at }, rune: c.rune };

/** Open cells that still stand on a rune of the same family; a second one is dropped (M20). */
function carriedParams(old: GlyphDef, cells: readonly PlacedRune[]): CellKey[] {
  const before = cellMapOf(old.cells);
  const after = cellMapOf(cells);
  return old.params
    .filter((k) => {
      const was = before.get(k);
      const now = after.get(k);
      if (!was || !now) return false;
      return roleIn(now.rune) === roleIn(was.rune) && canBeOpen(now.rune);
    })
    .slice(0, TUNING.paramSlots);
}

/** The next version of `cur` holding `inside`, settings carried over (M20). No checks. */
function nextDef(cur: GlyphDef, inside: GlyphInside, version: number): GlyphDef {
  const cells = inside.cells.map(copyCell);
  const meta = innerMeta(inside);
  const { discount: _discount, ...rest } = cur;
  const def: GlyphDef = {
    ...rest,
    cells,
    entry: { ...inside.entry },
    exits: meta.exits,
    idiom: meta.idiom,
    version,
    params: carriedParams(cur, cells),
    extraExit: null,
  };
  // Kept while its side is still free; inactive until the new version earns silver.
  const side = cur.extraExit;
  return { ...def, extraExit: side && extraExitSides(def).includes(side) ? side : null };
}

function revised(p: Profile, id: GlyphId, inside: GlyphInside): Profile {
  const cur = currentOf(p, id);
  const version = highestVersion(p, id) + 1;
  return {
    ...p,
    glyphs: p.glyphs.map((g) => (g.id === id ? nextDef(cur, inside, version) : g)),
    glyphArchive: [...p.glyphArchive, cur],
    glyphRecords: { ...p.glyphRecords, [versionKey(id, version)]: emptyRecord() },
  };
}

/** Saves `inside` as version max + 1 with a fresh record; the old one goes to the archive (M17, M20). */
export function reviseGlyph(p: Profile, id: GlyphId, inside: GlyphInside): Profile {
  const cur = currentOf(p, id);
  if (inside.kind !== cur.kind) throw new Error("A Glyph can't change its kind");
  const issue = insideIssues(inside)[0];
  if (issue) throw new Error(issue.message);
  return withoutStaleArgs(revised(p, id, inside), id);
}

/** Swaps the current version with archived `version`; both keep their records (M17). */
export function revertGlyph(p: Profile, id: GlyphId, version: number): Profile {
  const cur = currentOf(p, id);
  if (cur.version === version) throw new Error(`Version ${version} is already the current one`);
  const old = p.glyphArchive.find((g) => g.id === id && g.version === version);
  if (!old) throw new Error(`No version ${version} of ${cur.name}`);
  const next = {
    ...p,
    glyphs: p.glyphs.map((g) => (g.id === id ? old : g)),
    glyphArchive: p.glyphArchive.map((g) => (g === old ? cur : g)),
  };
  return withoutStaleArgs(next, id);
}

/**
 * Drops the arguments placed copies of `id` hold for cells the (effective) current version no
 * longer opens, or of the wrong family, so a revise or revert never leaves a page blocked by an
 * argument the player has no picker for.
 */
function withoutStaleArgs(p: Profile, id: GlyphId): Profile {
  const def = glyphLibrary(p)[id];
  if (!def) return p;
  const lattices = { ...p.lattices };
  for (const m of p.household.members) {
    lattices[m] = pageOf(p, m).map((r) => {
      if (!('glyph' in r) || r.glyph !== id || !r.args) return r;
      const rest = Object.fromEntries(
        Object.entries(r.args).filter(([k, arg]) => argIssue(def, k, arg) === null),
      );
      const { args: _old, ...bare } = r;
      return Object.keys(rest).length > 0 ? { ...bare, args: rest } : bare;
    });
  }
  return { ...p, lattices };
}

/** Every version of a Glyph, newest first. */
export function glyphVersions(p: Profile, id: GlyphId): GlyphVersion[] {
  const cur = p.glyphs.find((g) => g.id === id);
  if (!cur) return [];
  return [
    ...p.glyphArchive.filter((g) => g.id === id).map((def) => ({ def, current: false })),
    { def: cur, current: true },
  ]
    .sort((a, b) => b.def.version - a.def.version)
    .map(({ def, current }) => ({ def, record: recordOf(p, id, def.version), current }));
}

// ── Settings ────────────────────────────────────────────

/** Sets the current version's open cells (local keys), within the allowance (M20, M22). */
export function setOpenCells(p: Profile, id: GlyphId, cells: readonly CellKey[]): Profile {
  const cur = currentOf(p, id);
  const allowance = rewardsOf(recordOf(p, id, cur.version)).params;
  const open = [...new Set(cells)];
  const at = cellMapOf(cur.cells);
  for (const k of open) {
    const cell = at.get(k);
    if (!cell) throw new Error(`No rune at ${k} to open`);
    if (!canBeOpen(cell.rune)) throw new Error(`${nameOf(cell.rune)} can't be an open cell`);
  }
  if (open.length > allowance) {
    throw new Error(
      allowance === 1
        ? 'Only one open cell at this level'
        : `Only ${allowance} open cells at this level`,
    );
  }
  return { ...p, glyphs: p.glyphs.map((g) => (g.id === id ? { ...g, params: open } : g)) };
}

/** The local sides the extra exit may take: up, right or down, minus sides an exit uses (M26). */
export function extraExitSides(def: GlyphDef): Dir[] {
  return EXTRA_SIDES.filter((d) => !def.exits.some((e) => e.dir === d));
}

/** Sets (or clears) the extra exit's local side; refused below silver or on a taken side (M26). */
export function setExtraExit(p: Profile, id: GlyphId, dir: Dir | null): Profile {
  const cur = currentOf(p, id);
  if (dir !== null) {
    if (!EXTRA_SIDES.includes(dir)) throw new Error('The extra exit can go up, right or down');
    if (!rewardsOf(recordOf(p, id, cur.version)).extraExit) {
      throw new Error('The extra exit needs Reliability silver');
    }
    if (!extraExitSides(cur).includes(dir)) throw new Error(`An exit already leaves ${dir}`);
  }
  return { ...p, glyphs: p.glyphs.map((g) => (g.id === id ? { ...g, extraExit: dir } : g)) };
}

/** The pages that hold a Glyph and go over ink or past what is owned from `before` to `after`. */
function pageWarnings(before: Profile, after: Profile): string[] {
  const was = validateLoadout(before);
  const now = validateLoadout(after);
  const lines: string[] = [];
  for (const m of after.household.members) {
    const had = was[m] ?? [];
    const page = `the ${MEMBERS[m].name}'s page`;
    const issues = (now[m] ?? []).filter((i) => i.kind === 'ink' || i.kind === 'owned');
    if (issues.some((i) => i.kind === 'ink') && !had.some((i) => i.kind === 'ink')) {
      lines.push(`Pushes ${page} ink over`);
    }
    const owned = new Set(
      issues
        .filter(
          (i) =>
            i.kind === 'owned' &&
            i.rune &&
            !had.some((h) => h.kind === 'owned' && h.rune === i.rune),
        )
        .map((i) => nameOf(i.rune as RuneRef)),
    );
    if (owned.size > 0) lines.push(`Puts the ${[...owned].join(', ')} you don't know on ${page}`);
  }
  return lines;
}

/**
 * The warning the revision editor shows before saving (M19), e.g. "Pushes the Stoker's page ink
 * over", or null: the pages that hold this Glyph and would go over ink or past what is owned.
 */
export function revisionWarning(p: Profile, id: GlyphId, inside: GlyphInside): string | null {
  if (!p.glyphs.some((g) => g.id === id)) return null;
  const lines = pageWarnings(p, revised(p, id, inside));
  return lines.length > 0 ? lines.join('; ') : null;
}

const inkOff = (n: number) => `${n}-ink Economy discount`;

/**
 * The warning the revert confirm shows (BL-90): the Economy discount the swap loses or gains (the
 * records stay with their versions), then the pages that would go over ink or past what is owned.
 * Null when nothing changes or the revert would be refused.
 */
export function revertWarning(p: Profile, id: GlyphId, version: number): string | null {
  const cur = p.glyphs.find((g) => g.id === id);
  const old = p.glyphArchive.find((g) => g.id === id && g.version === version);
  if (!cur || !old || cur.version === version) return null;
  const was = rewardsOf(recordOf(p, id, cur.version)).discount;
  const now = rewardsOf(recordOf(p, id, version)).discount;
  const lines: string[] = [];
  if (now < was) {
    lines.push(
      now === 0
        ? `Loses the ${inkOff(was)}`
        : `The Economy discount drops from ${was} to ${now} ink`,
    );
  } else if (now > was) {
    lines.push(
      was === 0 ? `Gains a ${inkOff(now)}` : `The Economy discount rises from ${was} to ${now} ink`,
    );
  }
  lines.push(...pageWarnings(p, revertGlyph(p, id, version)));
  return lines.length > 0 ? lines.join('; ') : null;
}
