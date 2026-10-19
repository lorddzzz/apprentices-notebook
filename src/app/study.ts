import {
  MEMBER_IDS,
  MEMBERS,
  type MemberId,
  RUNE_IDS,
  type RuneId,
  type RuneRef,
  SOLVENT_IDS,
} from '$data';
import {
  argIssue,
  type CellKey,
  type Coord,
  canBeOpen,
  canPlace,
  canPlaceGlyph,
  type Dir,
  type GlyphArg,
  type GlyphDef,
  type GlyphId,
  type GlyphLibrary,
  glyphCost,
  glyphLibrary,
  hasArrow,
  type InventionLibrary,
  inkOf,
  inkUsed,
  inventionLibrary,
  isGlyph,
  isSocket,
  key,
  knows,
  type Lattice,
  latticeOf,
  nameOf,
  type Placed,
  type Profile,
  placedInk,
  recordOf,
  roleOf,
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
  | { kind: 'rune'; rune: RuneRef }
  | { kind: 'glyph'; glyph: GlyphId }
  | { kind: 'erase' }
  | { kind: 'none' };

export type SocketDecision =
  | { kind: 'place'; rune: RuneRef }
  | { kind: 'replace'; rune: RuneRef }
  | { kind: 'placeGlyph'; glyph: GlyphId }
  | { kind: 'replaceGlyph'; glyph: GlyphId }
  | { kind: 'rotate' }
  | { kind: 'remove' }
  | { kind: 'inspect' }
  | { kind: 'ignore' }
  | { kind: 'reject'; reason: string };

/**
 * Everything a lattice edit needs. `capacity` null = unlimited ink (Lab). Runes are knowledge,
 * not copies (P34): a known rune can go on as many sockets as the ink allows.
 */
export interface EditContext {
  lattice: Lattice;
  capacity: number | null;
  /** The profile's Fair copies (ink for Glyph sockets). Default: none. */
  glyphs?: GlyphLibrary;
  /** The household's inventions (their ink and role). Default: none. */
  inventions?: InventionLibrary;
  /** Whose page: the trained school makes its runes cheaper (P33). Default: nobody's. */
  member?: MemberId;
}

const leanOf = (member: MemberId | undefined) => (member ? MEMBERS[member].lean : null);

export const NO_TOOL: ShelfTool = { kind: 'none' };

export function inkLeft(
  lattice: Lattice,
  capacity: number | null,
  glyphs: GlyphLibrary = {},
  inventions: InventionLibrary = {},
  member?: MemberId,
): number | null {
  return capacity === null ? null : capacity - inkUsed(lattice, glyphs, inventions, leanOf(member));
}

function inkReject(
  rune: RuneRef,
  cost: number,
  left: number,
  inv: InventionLibrary,
): SocketDecision {
  return {
    kind: 'reject',
    reason: `${nameOf(rune, inv)} needs ${cost} ink, ${Math.max(0, left)} left`,
  };
}

export function decideSocketTap(ctx: EditContext, at: Coord, tool: ShelfTool): SocketDecision {
  if (!isSocket(ctx.lattice.shape, at)) return { kind: 'ignore' };
  const placed = socketAt(ctx.lattice, at);
  const lib = ctx.glyphs ?? {};
  const inv = ctx.inventions ?? {};
  const lean = leanOf(ctx.member);

  if (tool.kind === 'erase') return placed ? { kind: 'remove' } : { kind: 'ignore' };

  if (tool.kind === 'glyph') {
    if (placed && isGlyph(placed) && placed.glyph === tool.glyph) return { kind: 'rotate' };
    const refund = placed ? placedInk(placed, lib, ctx.lattice, inv, lean) : 0;
    const left = inkLeft(ctx.lattice, ctx.capacity, lib, inv, ctx.member);
    const cost = glyphCost(lib[tool.glyph] ?? emptyGlyph, inv, lean);
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
    const left = inkLeft(ctx.lattice, ctx.capacity, lib, inv, ctx.member);
    const refund = placed ? placedInk(placed, lib, ctx.lattice, inv, lean) : 0;
    const cost = inkOf(rune, inv, lean);
    if (left !== null && cost > left + refund) return inkReject(rune, cost, left + refund, inv);
    return placed ? { kind: 'replace', rune } : { kind: 'place', rune };
  }

  if (!placed) return { kind: 'ignore' };
  if (isGlyph(placed)) return { kind: 'rotate' };
  return hasArrow(placed.rune) ? { kind: 'rotate' } : { kind: 'inspect' };
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

/** The shelf rune stays selected: a known rune has no copies to run out of (P34). */
export function toolAfter(tool: ShelfTool, d: SocketDecision): ShelfTool {
  if (tool.kind === 'glyph') {
    return d.kind === 'placeGlyph' || d.kind === 'replaceGlyph' ? NO_TOOL : tool;
  }
  return tool;
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
  return {
    lattice: applyDecision(ctx.lattice, at, decision),
    tool: longPress ? tool : toolAfter(tool, decision),
    decision,
    message: decision.kind === 'reject' ? decision.reason : null,
  };
}

export interface ShelfSlot {
  rune: RuneRef;
  known: boolean;
  cost: number;
  /** Can be picked up: known. */
  usable: boolean;
  /** Could be dropped on an empty socket right now (enough ink as well). */
  affordable: boolean;
  reason: string | null;
}

/**
 * The shelf slots: every rune in RUNE_IDS order, then the household's inventions. `known` null =
 * Lab (everything known). `current` is the lattice being edited.
 */
export function shelfSlots(
  known: readonly RuneId[] | null,
  current: Lattice,
  capacity: number | null,
  glyphs: GlyphLibrary = {},
  inventions: InventionLibrary = {},
  member?: MemberId,
): ShelfSlot[] {
  const left = inkLeft(current, capacity, glyphs, inventions, member);
  const lean = leanOf(member);
  const refs: RuneRef[] = [...RUNE_IDS, ...(Object.keys(inventions) as RuneRef[])];
  return refs.map((rune) => {
    const isKnown =
      known === null || !RUNE_IDS.some((id) => id === rune) || known.some((id) => id === rune);
    const cost = inkOf(rune, inventions, lean);
    return {
      rune,
      known: isKnown,
      cost,
      usable: isKnown,
      affordable: isKnown && (left === null || cost <= left),
      reason: isKnown ? null : 'Not found yet',
    };
  });
}

// ── Profile wrappers (the Study edits the saved profile) ──

/** The edit context for one member of a profile: its ink capacity, Fair copies and inventions. */
export function profileContext(p: Profile, m: MemberId): EditContext {
  return {
    lattice: latticeOf(p, m),
    capacity: p.inkCapacity[m],
    glyphs: glyphLibrary(p),
    inventions: inventionLibrary(p),
    member: m,
  };
}

/** The shelf slots for `m`'s page: known runes are usable, the rest read `???`. */
export function profileShelf(p: Profile, m: MemberId): ShelfSlot[] {
  return shelfSlots(
    p.known,
    latticeOf(p, m),
    p.inkCapacity[m],
    glyphLibrary(p),
    inventionLibrary(p),
    m,
  );
}

export interface GlyphSlot {
  /** The current version as its rewards make it (the effective view). */
  glyph: GlyphDef;
  /** Ink the Glyph costs before outer auras. */
  cost: number;
  /** Could be picked up: every inner rune is known. */
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
  const inv = inventionLibrary(p);
  const lean = MEMBERS[m].lean;
  const left = inkLeft(latticeOf(p, m), p.inkCapacity[m], lib, inv, m);
  return p.glyphs.map((saved) => {
    const glyph = lib[saved.id] ?? saved;
    const cost = glyphCost(glyph, inv, lean);
    const unknown = glyph.cells.some((c) => !knows(p, c.rune));
    return {
      glyph,
      tiers: { ...recordOf(p, saved.id, saved.version).best },
      open: glyph.params.length,
      cost,
      usable: !unknown,
      affordable: !unknown && (left === null || cost <= left),
      reason: unknown ? 'Some of its runes are not known' : null,
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
  if (
    placing &&
    inkUsed(r.lattice, glyphLibrary(p), inventionLibrary(p), MEMBERS[m].lean) > p.inkCapacity[m]
  ) {
    return refuse('Not enough ink');
  }
  const changed = CHANGING.includes(d.kind);
  const { lattice, ...rest } = r;
  return { ...rest, profile: changed ? setMemberLattice(p, m, lattice) : p, changed };
}

const hasArgs = (args: Readonly<Record<CellKey, GlyphArg>>): boolean =>
  Object.keys(args).length > 0;

/**
 * Sets the arguments of the Glyph placed on `at` of `m`'s page (M25); an empty set clears them. An
 * argument that equals its default is dropped (a missing one means the default, M21). Throws when
 * no Glyph is there, an argument isn't allowed (role, open cell) or the page can't hold it
 * (runes known, ink): the engine's `canPlaceGlyph` has the last word.
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
  const inv = inventionLibrary(p);
  const kept: Record<CellKey, GlyphArg> = {};
  for (const [k, arg] of Object.entries(args)) {
    const why = argIssue(def, k, arg, inv);
    if (why) throw new Error(`${def.name} ${why}`);
    const dir = hasArrow(arg.rune) ? (arg.dir ?? 'right') : undefined;
    // An argument equal to the default isn't stored, so the cell follows the Glyph's next revision.
    const slot = def.cells.find((c) => key(c.at) === k);
    if (slot && slot.rune === arg.rune && slot.dir === dir) continue;
    kept[k] = dir ? { rune: arg.rune, dir } : { rune: arg.rune };
  }
  const reason = canPlaceGlyph(p, m, at, placed.glyph, hasArgs(kept) ? kept : undefined);
  if (reason !== null) throw new Error(reason);
  const { args: _old, ...bare } = placed;
  const next: Placed = hasArgs(kept) ? { ...bare, args: kept } : bare;
  const runes = l.runes.map((r) => (r === placed ? next : r));
  return setMemberLattice(p, m, { shape: l.shape, runes });
}

export interface ArgOption {
  rune: RuneRef;
}

/**
 * The runes open cell `cell` of the Glyph on `at` can take (M21, P7): every known rune (or
 * invention) with the default's role.
 */
export function argOptions(p: Profile, m: MemberId, at: Coord, cell: CellKey): ArgOption[] {
  const placed = socketAt(latticeOf(p, m), at);
  const def = placed && isGlyph(placed) ? glyphLibrary(p)[placed.glyph] : undefined;
  const slot = def?.cells.find((c) => key(c.at) === cell);
  if (!def || !slot) return [];
  const inv = inventionLibrary(p);
  if (!canBeOpen(slot.rune, inv)) return [];
  const role = roleOf(slot.rune, inv);
  const refs: RuneRef[] = [...p.known, ...p.inventions.map((d) => d.id)];
  return refs.filter((r) => roleOf(r, inv) === role).map((rune) => ({ rune }));
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

/** One rune the revision editor may use, and how many the inside may hold (null: no limit, P34). */
export interface PaletteSlot {
  rune: RuneRef;
  count: number | null;
}

/** The revision editor's palette: every known rune and invention, without a limit (P34). */
export function revisionPalette(p: Profile): PaletteSlot[] {
  const refs: RuneRef[] = [
    ...RUNE_IDS.filter((r) => p.known.includes(r)),
    ...p.inventions.map((d) => d.id),
  ];
  return refs.map((rune) => ({ rune, count: null }));
}

/** The Bench shows in the Study once the household holds a method page, an invention or a solvent. */
export function benchUnlocked(p: Profile): boolean {
  return (
    p.methods.length > 0 || p.inventions.length > 0 || SOLVENT_IDS.some((id) => p.solvents[id] > 0)
  );
}

/** What stops the party leaving the desk or a doorway: the first problem with either lattice, in plain words. */
export function loadoutBlocker(p: Profile): string | null {
  for (const [id, list] of Object.entries(validateLoadout(p))) {
    const first = list?.[0];
    if (first) return `${MEMBERS[id as MemberId].name}: ${first.message}`;
  }
  return null;
}
