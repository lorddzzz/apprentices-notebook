import { IDIOMS, MEMBER_IDS, MEMBERS, type MemberId, RUNE_IDS, RUNES, type RuneId } from '$data';
import {
  available,
  type Coord,
  canPlace,
  canPlaceGlyph,
  countRunes,
  type Dir,
  type GlyphDef,
  type GlyphId,
  type GlyphLibrary,
  glyphCost,
  glyphLibrary,
  inkCost,
  inkUsed,
  isGlyph,
  isSocket,
  type Lattice,
  latticeOf,
  type Placed,
  type Profile,
  placedInk,
  recogniseIdioms,
  rotateSocket,
  setMemberLattice,
  setSocket,
  socketAt,
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
      if (isGlyph(r)) for (const c of glyphs[r.glyph]?.cells ?? []) used[c.rune] += 1;
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
};

/** Puts a Glyph socket on `at` (replacing whatever is there), pointing right until turned. */
export function setGlyph(l: Lattice, at: Coord, glyph: GlyphId, dir: Dir = 'right'): Lattice {
  const rest = l.runes.filter((r) => r.at.x !== at.x || r.at.y !== at.y);
  const runes: Placed[] = [...rest, { at: { ...at }, glyph, dir }];
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
        ? setGlyph(lattice, at, placed.glyph, turnRight(placed.dir))
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
}

/** The Fair copies tab: the profile's Glyphs, and whether each can be placed on `m`'s page. */
export function glyphSlots(p: Profile, m: MemberId): GlyphSlot[] {
  const left = inkLeft(latticeOf(p, m), p.inkCapacity[m], glyphLibrary(p));
  return p.glyphs.map((glyph) => {
    const needs = new Map<RuneId, number>();
    for (const c of glyph.cells) needs.set(c.rune, (needs.get(c.rune) ?? 0) + 1);
    const runesFree = [...needs].every(([rune, n]) => available(p, rune) >= n);
    const cost = glyphCost(glyph);
    return {
      glyph,
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
  if (d.kind === 'placeGlyph' || d.kind === 'replaceGlyph') {
    const reason = canPlaceGlyph(p, m, at, d.glyph);
    if (reason !== null) return refuse(reason);
  }
  const placing = ['place', 'replace', 'placeGlyph', 'replaceGlyph'].includes(d.kind);
  if (placing && inkUsed(r.lattice, glyphLibrary(p)) > p.inkCapacity[m]) {
    return refuse('Not enough ink');
  }
  const changed = CHANGING.includes(d.kind);
  const { lattice, ...rest } = r;
  return { ...rest, profile: changed ? setMemberLattice(p, m, lattice) : p, changed };
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
