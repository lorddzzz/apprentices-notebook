import { IDIOMS, MEMBER_IDS, MEMBERS, type MemberId, RUNE_IDS, RUNES, type RuneId } from '$data';
import {
  argIssue,
  available,
  type CellKey,
  type Coord,
  canPlace,
  canPlaceGlyph,
  countRunes,
  type Dir,
  type GlyphArg,
  type GlyphDef,
  type GlyphId,
  type GlyphLibrary,
  glyphCost,
  glyphLibrary,
  glyphRunes,
  inkCost,
  inkUsed,
  isGlyph,
  isSocket,
  key,
  type Lattice,
  latticeOf,
  type Placed,
  type Profile,
  placedInk,
  recogniseIdioms,
  recordOf,
  rotateSocket,
  setMemberLattice,
  setOpenCells,
  setSocket,
  socketAt,
  type TierLevel,
  turnRight,
  validateLoadout,
} from '$engine';

/** What the player is holding: a rune or a Fair copy from the shelf, the eraser, or nothing. */
export type ShelfTool =
  | { kind: 'rune'; rune: RuneId }
  | { kind: 'glyph'; glyph: GlyphId }
  | { kind: 'erase' }
  | { kind: 'none' };

export type SocketDecision =
  | { kind: 'place'; rune: RuneId }
  | { kind: 'replace'; rune: RuneId }
  | { kind: 'placeGlyph'; glyph: GlyphId }
  | { kind: 'replaceGlyph'; glyph: GlyphId }
  | { kind: 'rotate' }
  | { kind: 'remove' }
  | { kind: 'inspect' }
  | { kind: 'ignore' }
  | { kind: 'reject'; reason: string };

/**
 * Everything a lattice edit needs. `capacity` null = unlimited ink (Lab);
 * `free(rune)` = copies still on the shelf, null = unlimited.
 */
export interface EditContext {
  lattice: Lattice;
  capacity: number | null;
  free: (rune: RuneId) => number | null;
  /** The profile's Fair copies (ink for Glyph sockets). Default: none. */
  glyphs?: GlyphLibrary;
}

export const NO_TOOL: ShelfTool = { kind: 'none' };

export function inkLeft(
  lattice: Lattice,
  capacity: number | null,
  glyphs: GlyphLibrary = {},
): number | null {
  return capacity === null ? null : capacity - inkUsed(lattice, glyphs);
}

/** Shelf counter for one collection: owned minus what every lattice already holds. null owned = Lab (∞). */
export function freeCounter(
  owned: Readonly<Record<RuneId, number>> | null,
  lattices: readonly Lattice[],
  glyphs: GlyphLibrary = {},
): (rune: RuneId) => number | null {
  if (owned === null) return () => null;
  const used = countRunes(lattices);
  // A placed Glyph holds its inner runes (plan P1).
  for (const l of lattices) {
    for (const r of l.runes) {
      const def = isGlyph(r) ? glyphs[r.glyph] : undefined;
      if (isGlyph(r) && def) for (const rune of glyphRunes(def, r.args)) used[rune] += 1;
    }
  }
  return (rune) => Math.max(0, owned[rune] - used[rune]);
}

function inkReject(rune: RuneId, left: number): SocketDecision {
  return {
    kind: 'reject',
    reason: `${RUNES[rune].name} needs ${inkCost(rune)} ink, ${Math.max(0, left)} left`,
  };
}

export function decideSocketTap(ctx: EditContext, at: Coord, tool: ShelfTool): SocketDecision {
  if (!isSocket(ctx.lattice.shape, at)) return { kind: 'ignore' };
  const placed = socketAt(ctx.lattice, at);
  const lib = ctx.glyphs ?? {};

  if (tool.kind === 'erase') return placed ? { kind: 'remove' } : { kind: 'ignore' };

  if (tool.kind === 'glyph') {
    if (placed && isGlyph(placed) && placed.glyph === tool.glyph) return { kind: 'rotate' };
    const refund = placed ? placedInk(placed, lib, ctx.lattice) : 0;
    const left = inkLeft(ctx.lattice, ctx.capacity, lib);
    const cost = glyphCost(lib[tool.glyph] ?? emptyGlyph);
    if (left !== null && cost > left + refund) {
      return {
        kind: 'reject',
        reason: `That Fair copy needs ${cost} ink, ${Math.max(0, left + refund)} left`,
      };
    }
    return placed
      ? { kind: 'replaceGlyph', glyph: tool.glyph }
      : { kind: 'placeGlyph', glyph: tool.glyph };
  }

  if (tool.kind === 'rune' && (placed && !isGlyph(placed) ? placed.rune : null) !== tool.rune) {
    const rune = tool.rune;
    if (ctx.free(rune) === 0) return { kind: 'reject', reason: `No ${RUNES[rune].name} left` };
    const left = inkLeft(ctx.lattice, ctx.capacity, lib);
    const refund = placed ? placedInk(placed, lib, ctx.lattice) : 0;
    if (left !== null && inkCost(rune) > left + refund) return inkReject(rune, left + refund);
    return placed ? { kind: 'replace', rune } : { kind: 'place', rune };
  }

  if (!placed) return { kind: 'ignore' };
  if (isGlyph(placed)) return { kind: 'rotate' };
  return RUNES[placed.rune].arrow ? { kind: 'rotate' } : { kind: 'inspect' };
}

const emptyGlyph: GlyphDef = {
  id: '',
  name: '',
  kind: 'payload',
  cells: [],
  entry: { x: 0, y: 0 },
  exits: [],
  idiom: null,
  version: 1,
  params: [],
  extraExit: null,
};

/** Puts a Glyph socket on `at` (replacing whatever is there), pointing right until turned. */
export function setGlyph(
  l: Lattice,
  at: Coord,
  glyph: GlyphId,
  dir: Dir = 'right',
  args?: Readonly<Record<CellKey, GlyphArg>>,
): Lattice {
  const rest = l.runes.filter((r) => r.at.x !== at.x || r.at.y !== at.y);
  const socket: Placed = args ? { at: { ...at }, glyph, dir, args } : { at: { ...at }, glyph, dir };
  const runes: Placed[] = [...rest, socket];
  runes.sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  return { shape: l.shape, runes };
}

export function applyDecision(lattice: Lattice, at: Coord, d: SocketDecision): Lattice {
  switch (d.kind) {
    case 'place':
    case 'replace':
      return setSocket(lattice, at, d.rune);
    case 'placeGlyph':
    case 'replaceGlyph':
      return setGlyph(lattice, at, d.glyph);
    case 'rotate': {
      const placed = socketAt(lattice, at);
      return placed && isGlyph(placed)
        ? setGlyph(lattice, at, placed.glyph, turnRight(placed.dir), placed.args)
        : rotateSocket(lattice, at);
    }
    case 'remove':
      return setSocket(lattice, at, null);
    default:
      return lattice;
  }
}

/** The shelf rune stays selected while copies remain; it drops itself when the last one is placed. */
export function toolAfter(
  tool: ShelfTool,
  d: SocketDecision,
  freeBefore: number | null,
): ShelfTool {
  if (tool.kind === 'glyph') {
    return d.kind === 'placeGlyph' || d.kind === 'replaceGlyph' ? NO_TOOL : tool;
  }
  if (tool.kind !== 'rune') return tool;
  if (d.kind !== 'place' && d.kind !== 'replace') return tool;
  return freeBefore !== null && freeBefore - 1 <= 0 ? NO_TOOL : tool;
}

export interface EditResult {
  lattice: Lattice;
  tool: ShelfTool;
  decision: SocketDecision;
  /** A reason to show the player (toast), or null. */
  message: string | null;
}

/** One tap or long-press on a socket. A long-press removes whatever is there, whatever the tool. */
export function editSocket(
  ctx: EditContext,
  at: Coord,
  tool: ShelfTool,
  longPress: boolean,
): EditResult {
  const decision: SocketDecision = longPress
    ? socketAt(ctx.lattice, at)
      ? { kind: 'remove' }
      : { kind: 'ignore' }
    : decideSocketTap(ctx, at, tool);
  const placing = decision.kind === 'place' || decision.kind === 'replace';
  const free = placing && tool.kind === 'rune' ? ctx.free(tool.rune) : null;
  return {
    lattice: applyDecision(ctx.lattice, at, decision),
    tool: longPress ? tool : toolAfter(tool, decision, free),
    decision,
    message: decision.kind === 'reject' ? decision.reason : null,
  };
}

export interface ShelfSlot {
  rune: RuneId;
  known: boolean;
  /** null = unlimited (Lab). */
  owned: number | null;
  free: number | null;
  cost: number;
  /** Can be picked up: known and a copy is left. */
  usable: boolean;
  /** Could be dropped on an empty socket right now (enough ink as well). */
  affordable: boolean;
  reason: string | null;
}

/**
 * The 14 shelf slots in RUNE_IDS order. `owned` null = Lab (everything known, ∞).
 * `current` is the lattice being edited and must be one of `lattices`.
 */
export function shelfSlots(
  owned: Readonly<Record<RuneId, number>> | null,
  lattices: readonly Lattice[],
  current: Lattice,
  capacity: number | null,
  glyphs: GlyphLibrary = {},
): ShelfSlot[] {
  const free = freeCounter(owned, lattices, glyphs);
  const left = inkLeft(current, capacity, glyphs);
  return RUNE_IDS.map((rune) => {
    const own = owned === null ? null : owned[rune];
    const known = own === null || own > 0;
    const f = free(rune);
    const cost = inkCost(rune);
    const usable = known && f !== 0;
    return {
      rune,
      known,
      owned: own,
      free: f,
      cost,
      usable,
      affordable: usable && (left === null || cost <= left),
      reason: !known ? 'Not found yet' : f === 0 ? `No ${RUNES[rune].name} left` : null,
    };
  });
}

// ── Profile wrappers (the Study edits the saved profile) ──

/** The edit context for one member of a profile: its ink capacity and what is left on the shelf. */
export function profileContext(p: Profile, m: MemberId): EditContext {
  return {
    lattice: latticeOf(p, m),
    capacity: p.inkCapacity[m],
    free: (rune) => available(p, rune),
    glyphs: glyphLibrary(p),
  };
}

/** The 20 shelf slots for `m`'s page: owned counts come from the profile, placed counts from both lattices. */
export function profileShelf(p: Profile, m: MemberId): ShelfSlot[] {
  return shelfSlots(
    p.collection,
    MEMBER_IDS.map((id) => latticeOf(p, id)),
    latticeOf(p, m),
    p.inkCapacity[m],
    glyphLibrary(p),
  );
}

export interface GlyphSlot {
  /** The current version as its rewards make it (the effective view). */
  glyph: GlyphDef;
  /** Ink the Glyph costs before outer auras. */
  cost: number;
  /** Every inner rune is still on the shelf (plan P1). */
  runesFree: boolean;
  /** Could be picked up: its inner runes are free. */
  usable: boolean;
  /** Could be dropped on an empty socket right now (enough ink as well). */
  affordable: boolean;
  reason: string | null;
  /** The current version's best tiers (shelf marks, M14). */
  tiers: { economy: TierLevel; reliability: TierLevel };
  /** Open cells it takes arguments in ("( )" on the shelf, M21). */
  open: number;
}

/** The Fair copies tab: the profile's Glyphs, and whether each can be placed on `m`'s page. */
export function glyphSlots(p: Profile, m: MemberId): GlyphSlot[] {
  const lib = glyphLibrary(p);
  const left = inkLeft(latticeOf(p, m), p.inkCapacity[m], lib);
  return p.glyphs.map((saved) => {
    const glyph = lib[saved.id] ?? saved;
    const needs = new Map<RuneId, number>();
    // An open cell whose default is used up can take another rune of its family (M25).
    for (const rune of glyphRunes(glyph, fallbackArgs(p, glyph))) {
      needs.set(rune, (needs.get(rune) ?? 0) + 1);
    }
    const runesFree = [...needs].every(([rune, n]) => available(p, rune) >= n);
    const cost = glyphCost(glyph);
    return {
      glyph,
      tiers: { ...recordOf(p, saved.id, saved.version).best },
      open: glyph.params.length,
      cost,
      runesFree,
      usable: runesFree,
      affordable: runesFree && (left === null || cost <= left),
      reason: runesFree ? null : 'Some of its runes are in use elsewhere',
    };
  });
}

export interface ProfileEdit extends Omit<EditResult, 'lattice'> {
  profile: Profile;
  /** The lattice changed (worth saving). */
  changed: boolean;
}

const CHANGING: readonly SocketDecision['kind'][] = [
  'place',
  'replace',
  'placeGlyph',
  'replaceGlyph',
  'rotate',
  'remove',
];

/**
 * One tap or long-press on member `m`'s socket, against the saved profile. The engine's `canPlace`
 * has the last word: anything study.ts would place that the engine refuses is rejected with its reason.
 * The result must also fit the ink (a new aura raises the cost of the Glyphs it touches).
 */
export function editProfile(
  p: Profile,
  m: MemberId,
  at: Coord,
  tool: ShelfTool,
  longPress: boolean,
): ProfileEdit {
  const r = editSocket(profileContext(p, m), at, tool, longPress);
  const d = r.decision;
  const refuse = (reason: string): ProfileEdit => ({
    profile: p,
    tool,
    decision: { kind: 'reject', reason },
    message: reason,
    changed: false,
  });
  if (d.kind === 'place' || d.kind === 'replace') {
    const reason = canPlace(p, m, at, d.rune);
    if (reason !== null) return refuse(reason);
  }
  // A Glyph with open cells goes down pre-filled (M25): its defaults, or the first rune of the
  // family that is still free when a default is used up. The engine has the last word.
  const args =
    d.kind === 'placeGlyph' || d.kind === 'replaceGlyph' ? placementArgs(p, m, at, d.glyph) : {};
  if (d.kind === 'placeGlyph' || d.kind === 'replaceGlyph') {
    const reason = canPlaceGlyph(p, m, at, d.glyph, hasArgs(args) ? args : undefined);
    if (reason !== null) return refuse(reason);
  }
  const placing = ['place', 'replace', 'placeGlyph', 'replaceGlyph'].includes(d.kind);
  if (placing && inkUsed(r.lattice, glyphLibrary(p)) > p.inkCapacity[m]) {
    return refuse('Not enough ink');
  }
  const changed = CHANGING.includes(d.kind);
  const { lattice, ...rest } = r;
  const placed = hasArgs(args) ? stampArgs(lattice, at, args) : lattice;
  return { ...rest, profile: changed ? setMemberLattice(p, m, placed) : p, changed };
}

const hasArgs = (args: Readonly<Record<CellKey, GlyphArg>>): boolean =>
  Object.keys(args).length > 0;

/** The lattice with `args` set on the Glyph socket at `at`. */
function stampArgs(l: Lattice, at: Coord, args: Readonly<Record<CellKey, GlyphArg>>): Lattice {
  return {
    shape: l.shape,
    runes: l.runes.map((r) => (isGlyph(r) && sameAt(r.at, at) ? { ...r, args: { ...args } } : r)),
  };
}

const sameAt = (a: Coord, b: Coord): boolean => a.x === b.x && a.y === b.y;

/** The profile with the socket at `at` of `m`'s page emptied (what is free for a placement there). */
function withoutSocket(p: Profile, m: MemberId, at: Coord): Profile {
  const l = latticeOf(p, m);
  return setMemberLattice(p, m, {
    shape: l.shape,
    runes: l.runes.filter((r) => !sameAt(r.at, at)),
  });
}

const argFor = (rune: RuneId, from: { dir?: Dir } | undefined): GlyphArg =>
  RUNES[rune].arrow ? { rune, dir: from?.dir ?? 'right' } : { rune };

/**
 * The arguments a Glyph is placed with when none were chosen yet (M25): nothing while every default
 * rune is free (a missing argument means the default, M21); for an open cell whose default is used
 * up, the first rune of its family that is.
 */
function fallbackArgs(p: Profile, def: GlyphDef): Record<CellKey, GlyphArg> {
  const args: Record<CellKey, GlyphArg> = {};
  const needs = new Map<RuneId, number>();
  for (const rune of glyphRunes(def)) needs.set(rune, (needs.get(rune) ?? 0) + 1);
  for (const k of def.params) {
    const cell = def.cells.find((c) => key(c.at) === k);
    if (!cell || available(p, cell.rune) >= (needs.get(cell.rune) ?? 0)) continue;
    const family = RUNES[cell.rune].family;
    const pick = RUNE_IDS.find(
      (r) =>
        r !== cell.rune && RUNES[r].family === family && available(p, r) >= (needs.get(r) ?? 0) + 1,
    );
    if (!pick) continue;
    needs.set(cell.rune, (needs.get(cell.rune) ?? 1) - 1);
    needs.set(pick, (needs.get(pick) ?? 0) + 1);
    args[k] = argFor(pick, cell);
  }
  return args;
}

/** What `glyph` would carry if placed on `at` of `m`'s page now (M25); empty when the defaults all fit. */
export function placementArgs(
  p: Profile,
  m: MemberId,
  at: Coord,
  glyph: GlyphId,
): Record<CellKey, GlyphArg> {
  const def = glyphLibrary(p)[glyph];
  return def && def.params.length > 0 ? fallbackArgs(withoutSocket(p, m, at), def) : {};
}

/**
 * Sets the arguments of the Glyph placed on `at` of `m`'s page (M25); an empty set clears them. An
 * argument that equals its default is dropped (a missing one means the default, M21). Throws when
 * no Glyph is there, an argument isn't allowed (family, open cell) or the page can't hold it
 * (runes owned, ink): the engine's `canPlaceGlyph` has the last word.
 */
export function setGlyphArgs(
  p: Profile,
  m: MemberId,
  at: Coord,
  args: Readonly<Record<CellKey, GlyphArg>>,
): Profile {
  const l = latticeOf(p, m);
  const placed = socketAt(l, at);
  if (!placed || !isGlyph(placed)) throw new Error('No Fair copy there');
  const def = glyphLibrary(p)[placed.glyph];
  if (!def) throw new Error('Unknown Fair copy');
  const kept: Record<CellKey, GlyphArg> = {};
  for (const [k, arg] of Object.entries(args)) {
    const why = argIssue(def, k, arg);
    if (why) throw new Error(`${def.name} ${why}`);
    kept[k] = RUNES[arg.rune].arrow
      ? { rune: arg.rune, dir: arg.dir ?? 'right' }
      : { rune: arg.rune };
  }
  const reason = canPlaceGlyph(p, m, at, placed.glyph, hasArgs(kept) ? kept : undefined);
  if (reason !== null) throw new Error(reason);
  const { args: _old, ...bare } = placed;
  const next: Placed = hasArgs(kept) ? { ...bare, args: kept } : bare;
  const runes = l.runes.map((r) => (r === placed ? next : r));
  return setMemberLattice(p, m, { shape: l.shape, runes });
}

export interface ArgOption {
  rune: RuneId;
  /** Copies this cell could take now: owned, not used elsewhere or by the Glyph's other cells. */
  free: number;
}

/**
 * The runes open cell `cell` of the Glyph on `at` can take (M21, M25): every owned rune of the
 * default's family, with how many are still free for it given the Glyph's other cells (`args`).
 */
export function argOptions(
  p: Profile,
  m: MemberId,
  at: Coord,
  cell: CellKey,
  args: Readonly<Record<CellKey, GlyphArg>>,
): ArgOption[] {
  const placed = socketAt(latticeOf(p, m), at);
  const def = placed && isGlyph(placed) ? glyphLibrary(p)[placed.glyph] : undefined;
  const slot = def?.cells.find((c) => key(c.at) === cell);
  if (!def || !slot) return [];
  const without = withoutSocket(p, m, at);
  const others = glyphRunes({ ...def, cells: def.cells.filter((c) => key(c.at) !== cell) }, args);
  const family = RUNES[slot.rune].family;
  return RUNE_IDS.filter((r) => RUNES[r].family === family && p.collection[r] > 0).map((rune) => ({
    rune,
    free: Math.max(0, available(without, rune) - others.filter((x) => x === rune).length),
  }));
}

/**
 * Sets a Glyph's open cells (M20, M22) and drops the arguments that placed copies hold for cells
 * that are no longer open, so a settings change never leaves a stale-argument issue on a page.
 */
export function setGlyphOpenCells(p: Profile, id: GlyphId, cells: readonly CellKey[]): Profile {
  const next = setOpenCells(p, id, cells);
  const keep = new Set(cells);
  const lattices = { ...next.lattices };
  for (const m of MEMBER_IDS) {
    lattices[m] = next.lattices[m].map((r) => {
      if (!isGlyph(r) || r.glyph !== id || !r.args) return r;
      const rest = Object.fromEntries(Object.entries(r.args).filter(([k]) => keep.has(k)));
      const { args: _old, ...bare } = r;
      return Object.keys(rest).length > 0 ? { ...bare, args: rest } : bare;
    });
  }
  return { ...next, lattices };
}

/** One rune the revision editor may use, and how many the inside may hold (M19: what is owned). */
export interface PaletteSlot {
  rune: RuneId;
  /** null = no limit (a draft's own page runes, M34). */
  count: number | null;
}

/** The revision editor's palette: every rune owned at least once, with the owned count (M19). */
export function revisionPalette(p: Profile): PaletteSlot[] {
  return RUNE_IDS.filter((r) => p.collection[r] > 0).map((rune) => ({
    rune,
    count: p.collection[rune],
  }));
}

/** Writes any idiom the pages now contain into the codex; returns the toast lines for the new ones. */
export function noteIdioms(p: Profile): { profile: Profile; toasts: string[] } {
  const { profile, fresh } = recogniseIdioms(p);
  const names = fresh.map((id) => IDIOMS.find((i) => i.id === id)?.name ?? id);
  return { profile, toasts: names.map((n) => `Idiom recognised: ${n}`) };
}

/** What stops the party leaving the desk or a doorway: the first problem with either lattice, in plain words. */
export function loadoutBlocker(p: Profile): string | null {
  for (const [id, list] of Object.entries(validateLoadout(p))) {
    const first = list?.[0];
    if (first) return `${MEMBERS[id as MemberId].name}: ${first.message}`;
  }
  return null;
}
