import {
  APPRENTICES,
  type ApprenticeDef,
  type ApprenticeId,
  type BasicActionId,
  HABITS,
  isInvention,
  LINES,
  type LineId,
  MEMBERS,
  type MemberId,
  type Role,
  RUNE_IDS,
  RUNES,
  type RuneId,
  type RuneRef,
  SOLVENT_IDS,
} from '$data';
import {
  argIssue,
  type CellKey,
  type CompiledLattice,
  type Coord,
  canBeOpen,
  canPlace,
  canPlaceGlyph,
  type Dir,
  FOUNDERS,
  type GlyphArg,
  type GlyphDef,
  type GlyphId,
  type GlyphLibrary,
  glyphCost,
  glyphLibrary,
  growingLattice,
  hasArrow,
  headlineOf,
  type InventionLibrary,
  inHousehold,
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
  pageOf,
  parseLattice,
  placedInk,
  recordOf,
  roleOf,
  rotateSocket,
  type SlotIndex,
  type SpellKey,
  type Step,
  setMemberLattice,
  setOpenCells,
  setSlot,
  setSocket,
  socketAt,
  type TierLevel,
  type Trip,
  tripParty,
  turnRight,
  validateLoadout,
} from '$engine';
import { SCHOOL_NAME } from './describe';

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
  /** The runes the household knows (P34); a rune outside it is refused. Default: all (Lab). */
  known?: readonly RuneId[] | null;
  /** Whose page: the trained school makes its runes cheaper (P33). Default: nobody's. */
  member?: MemberId;
}

const leanOf = (member: MemberId | undefined) => (member ? MEMBERS[member].lean : null);

/** Known runes only; an invention is known once the household has made it (it is in the library). */
function runeKnown(ctx: EditContext, rune: RuneRef): boolean {
  if (isInvention(rune)) return ctx.inventions === undefined || rune in ctx.inventions;
  return !ctx.known || ctx.known.includes(rune);
}

export const NO_TOOL: ShelfTool = { kind: 'none' };

/** View identity is separate from saved paper and edits; reset/import owners advance the session. */
export function pageSessionKey(
  context: 'study' | 'doorway' | 'lab',
  member: MemberId,
  session: number | string = 0,
): string {
  return `${context}:${session}:${member}`;
}

const framed = (lattice: Lattice): Lattice =>
  lattice.shape.kind === 'growing' ? growingLattice(lattice.runes) : lattice;

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

  if (tool.kind === 'rune' && !runeKnown(ctx, tool.rune)) {
    return { kind: 'reject', reason: 'Not known' };
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
  return framed({ shape: l.shape, runes });
}

export function applyDecision(lattice: Lattice, at: Coord, d: SocketDecision): Lattice {
  switch (d.kind) {
    case 'place':
    case 'replace':
      return framed(setSocket(lattice, at, d.rune));
    case 'placeGlyph':
    case 'replaceGlyph':
      return setGlyph(lattice, at, d.glyph);
    case 'rotate': {
      const placed = socketAt(lattice, at);
      return placed && isGlyph(placed)
        ? setGlyph(lattice, at, placed.glyph, turnRight(placed.dir), placed.args)
        : framed(rotateSocket(lattice, at));
    }
    case 'remove':
      return framed(setSocket(lattice, at, null));
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
  /** What it costs this apprentice (the trained discount taken off). */
  cost: number;
  /** What it costs untrained; above `cost` when the school's discount applies (P33). */
  base?: number;
  role?: Role | null;
  /** An invention of the household rather than an authored rune. */
  invention?: boolean;
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
      base: inkOf(rune, inventions),
      role: roleOf(rune, inventions),
      invention: isInvention(rune),
      usable: isKnown,
      affordable: isKnown && (left === null || cost <= left),
      reason: isKnown ? null : 'Not found yet',
    };
  });
}

export const ROLE_ORDER: readonly Role[] = [
  'source',
  'action',
  'kind',
  'shape',
  'trigger',
  'seal',
  'aura',
];

export interface ShelfGroup {
  role: Role;
  slots: ShelfSlot[];
}

const isMade = (s: ShelfSlot): boolean => s.invention ?? isInvention(s.rune);
const slotRole = (s: ShelfSlot): Role | null =>
  s.role !== undefined ? s.role : isInvention(s.rune) ? null : RUNES[s.rune].role;

/** The Runes tab: the known authored runes grouped by role, in the design's role order (§5.3). */
export function shelfGroups(slots: readonly ShelfSlot[]): ShelfGroup[] {
  return ROLE_ORDER.map((role) => ({
    role,
    slots: slots.filter((s) => s.known && !isMade(s) && slotRole(s) === role),
  })).filter((g) => g.slots.length > 0);
}

/** The Inventions tab: the household's inventions, in the order they were made. */
export const inventionSlots = (slots: readonly ShelfSlot[]): ShelfSlot[] => slots.filter(isMade);

/** The words on a long-press (or details tap) of a shelf item. */
export interface RuneDetail {
  name: string;
  role: Role | null;
  headline: string;
  /** Rows of fine print about it (an invention: about its method), and how many were witnessed. */
  finePrint: FinePrint;
}

export interface FinePrint {
  witnessed: number;
  total: number;
}

/** The fine-print rows a rune or an invention's method owns, against the lines this household has seen. */
export function finePrint(
  witnessed: readonly LineId[],
  ref: RuneRef,
  inventions: InventionLibrary = {},
): FinePrint {
  const subject = isInvention(ref) ? inventions[ref]?.method : ref;
  const rows = LINES.filter((l) => l.subject === subject);
  return { total: rows.length, witnessed: rows.filter((l) => witnessed.includes(l.id)).length };
}

export function detailOf(
  ref: RuneRef,
  witnessed: readonly LineId[],
  inventions: InventionLibrary = {},
): RuneDetail {
  const def = isInvention(ref) ? inventions[ref] : undefined;
  return {
    name: nameOf(ref, inventions),
    role: roleOf(ref, inventions),
    headline: isInvention(ref)
      ? def
        ? headlineOf(def, inventions)
        : 'Not one of your inventions.'
      : RUNES[ref].headline,
    finePrint: finePrint(witnessed, ref, inventions),
  };
}

// ── The flow on the page: Fork sides and Seal splits ──

export type ForkSide = 'left' | 'right';

/** How one cell of a spell's flow reads on the page. */
export interface FlowZone {
  /** The nearest Fork branch it hangs on, or null on the trunk. */
  side: ForkSide | null;
  /** After a Seal: it happens later, in the jar (P3, R5). */
  sealed: boolean;
}

/**
 * For each cell the flow of `spell` enters (outer lattice cells; a Glyph's inside is its socket),
 * which Fork branch it is on and whether a Seal has split it off in time. Bend cells ride with the
 * step they lead to. The Source and the trunk read null / false.
 */
export function flowZones(compiled: CompiledLattice): Map<SpellKey, Map<CellKey, FlowZone>> {
  const out = new Map<SpellKey, Map<CellKey, FlowZone>>();
  for (const spell of compiled.spells) {
    const zones = new Map<CellKey, FlowZone>();
    const pending: { st: Step; zone: FlowZone }[] = spell.first
      ? [{ st: spell.first, zone: { side: null, sealed: false } }]
      : [];
    while (pending.length) {
      const current = pending.pop();
      if (!current) continue;
      const { st, zone } = current;
      const here = key(st.at);
      // A cell reached twice (a Glyph's inside) keeps its first reading.
      if (!zones.has(here)) zones.set(here, zone);
      for (const v of st.via ?? []) if (!zones.has(key(v))) zones.set(key(v), zone);
      switch (st.role) {
        case 'fork':
          if (st.right) pending.push({ st: st.right, zone: { ...zone, side: 'right' } });
          if (st.left) pending.push({ st: st.left, zone: { ...zone, side: 'left' } });
          break;
        case 'seal':
          if (st.rest) pending.push({ st: st.rest, zone: { ...zone, sealed: true } });
          break;
        case 'split':
          for (let i = st.branches.length - 1; i >= 0; i--) {
            const branch = st.branches[i];
            if (branch) pending.push({ st: branch, zone });
          }
          break;
        default:
          if (st.next) pending.push({ st: st.next, zone });
      }
    }
    out.set(spell.key, zones);
  }
  return out;
}

// ── Profile wrappers (the Study edits the saved profile) ──

/** The edit context for one member of a profile: its ink capacity, Fair copies and inventions. */
export function profileContext(p: Profile, m: MemberId): EditContext {
  return {
    lattice: latticeOf(p, m),
    capacity: p.ink,
    glyphs: glyphLibrary(p),
    inventions: inventionLibrary(p),
    known: p.known,
    member: m,
  };
}

/** The shelf slots for `m`'s page: known runes are usable, the rest read `???`. */
export function profileShelf(p: Profile, m: MemberId): ShelfSlot[] {
  return shelfSlots(p.known, latticeOf(p, m), p.ink, glyphLibrary(p), inventionLibrary(p), m);
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
  const left = inkLeft(latticeOf(p, m), p.ink, lib, inv, m);
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
    inkUsed(r.lattice, glyphLibrary(p), inventionLibrary(p), MEMBERS[m].lean) > p.ink
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
  for (const m of next.household.members) {
    lattices[m] = pageOf(next, m).map((r) => {
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

/** What stops the party leaving the desk or a doorway: nobody slotted, else the first problem with a party page. */
export function loadoutBlocker(p: Profile): string | null {
  const party = tripParty(p);
  if (party.length === 0) return NO_PARTY;
  for (const [id, list] of Object.entries(validateLoadout(p, party))) {
    const first = list?.[0];
    if (first) return `${APPRENTICES[id as ApprenticeId].name}: ${first.message}`;
  }
  return null;
}

// ── The household shelf (HC-7, party.md §1) ──

export const NO_PARTY = 'Nobody is in a trip slot: bring someone from the shelf';
export const TRIP_LOCK = 'Out on a trip: the slots are fixed until you are home';
const SEATS = 3;

/**
 * How many trip slots the shelf shows (HC P8): one per apprentice up to three, so a two-person
 * household never shows an empty third seat.
 */
export function visibleSlots(p: Profile): number {
  return Math.min(SEATS, Math.max(1, p.household.members.length));
}

/** The seats as the shelf draws them: an apprentice or null (an empty seat). */
export function seatsOf(p: Profile): (ApprenticeId | null)[] {
  return p.household.slots.slice(0, visibleSlots(p));
}

/** Who is not in a slot, in join order. */
export function benchOf(p: Profile): ApprenticeId[] {
  return p.household.members.filter((m) => !p.household.slots.includes(m));
}

export function slotOf(p: Profile, id: ApprenticeId): SlotIndex | null {
  const i = p.household.slots.indexOf(id);
  return i < 0 ? null : (i as SlotIndex);
}

/** The words for a basic action on a card (party.md §1). */
export const ACTION_INFO: Record<BasicActionId, { name: string; rule: string }> = {
  shove: { name: 'Shove', rule: 'Pushes an adjacent unit one tile.' },
  pull: { name: 'Pull', rule: 'Hooks a unit two tiles away one tile closer.' },
  hop: { name: 'Hop', rule: 'Leaps to a free tile exactly two away.' },
  swap: { name: 'Swap', rule: 'Trades places with an adjacent unit.' },
};

export interface CardView {
  def: ApprenticeDef;
  /** The slot they hold, or null on the bench. */
  slot: SlotIndex | null;
  trained: string;
  /** Null when the gift repeats the trained school (one chip reads "Seam, trained and gifted"). */
  gifted: string | null;
  habit: { line: string; kind: 'lattice' | 'body'; leansOn: string | null } | null;
  /** The habit leans on a rune the household does not know (HC P12). Never set for the founders. */
  dormant: boolean;
}

/** What a shelf card shows for one household member; only registry fields, so recruits need no UI work. */
export function cardOf(p: Profile, id: ApprenticeId): CardView {
  const def = APPRENTICES[id];
  const habit = def.habit ? HABITS[def.habit] : null;
  const leans = habit?.leansOn ?? null;
  return {
    def,
    slot: slotOf(p, id),
    trained: SCHOOL_NAME[def.lean.trained],
    gifted:
      def.lean.gifted && def.lean.gifted !== def.lean.trained ? SCHOOL_NAME[def.lean.gifted] : null,
    habit: habit
      ? { line: habit.line, kind: habit.kind, leansOn: leans ? RUNES[leans].name : null }
      : null,
    dormant: leans !== null && !p.known.includes(leans) && !FOUNDERS.includes(id),
  };
}

export type SlotMove = { profile: Profile } | { why: string };

function tryMove(trip: Trip | null, change: () => Profile): SlotMove {
  if (trip) return { why: TRIP_LOCK };
  try {
    return { profile: change() };
  } catch (e) {
    return { why: e instanceof Error ? e.message : 'That did not work' };
  }
}

/** Puts `id` in a slot: the first empty seat, or `slot` when given (their old seat swaps with its occupant). */
export function placeInSlot(
  p: Profile,
  trip: Trip | null,
  id: ApprenticeId,
  slot?: SlotIndex,
): SlotMove {
  return tryMove(trip, () => {
    if (!inHousehold(p, id)) throw new Error('They are not in the household');
    const seats = visibleSlots(p);
    const open = p.household.slots.slice(0, seats).indexOf(null);
    const to = slot ?? (open < 0 ? null : (open as SlotIndex));
    if (to === null) throw new Error('Every seat is taken: send someone home first');
    if (to >= seats) throw new Error('There is no such seat');
    const from = slotOf(p, id);
    if (from === to) return p;
    const displaced = p.household.slots[to];
    let next = from === null ? p : setSlot(p, from, null);
    next = setSlot(next, to, id);
    // Dragging between two seats swaps them; from the bench the occupant goes home.
    if (from !== null && displaced) next = setSlot(next, from, displaced);
    return next;
  });
}

/** Empties `id`'s slot; they wait on the bench with their page intact. */
export function leaveHome(p: Profile, trip: Trip | null, id: ApprenticeId): SlotMove {
  return tryMove(trip, () => {
    const from = slotOf(p, id);
    return from === null ? p : setSlot(p, from, null);
  });
}

/** Whose page the Study shows: `current` while they are in the household, else the first slotted, else the first. */
export function openMemberFor(p: Profile, current: ApprenticeId): ApprenticeId {
  if (inHousehold(p, current)) return current;
  return tripParty(p)[0] ?? p.household.members[0] ?? current;
}

/** The lattice editor's bookmarks: the slotted party in slot order, plus the open page's owner (HC P11). */
export function bookmarksOf(p: Profile, open: ApprenticeId): ApprenticeId[] {
  const party = tripParty(p);
  return party.includes(open) ? party : [...party, open];
}

// ── Copy to the Study (rivals P14) ──

export type SpellCopy = { profile: Profile } | { why: string };

/** The row a copied spell starts on: one blank row under the page's lowest rune (the top of an empty page). */
function freeRowBelow(page: readonly Placed[]): number {
  return page.length === 0 ? 0 : Math.max(...page.map((r) => r.at.y)) + 2;
}

/**
 * Copies a recovered page's wiring onto `m`'s page (rivals P14). Every rune must be known, else the
 * refusal names the missing ones. The wiring goes on a free row below what is there, and the new
 * page must pass the same checks the game runs on load (ink, owned runes, structure); a new issue
 * refuses the whole copy with its ordinary message. Nothing else in the profile changes.
 */
export function copySpellToPage(p: Profile, m: MemberId, spell: string): SpellCopy {
  let parsed: Lattice;
  let page: Placed[];
  try {
    page = pageOf(p, m);
    parsed = parseLattice(spell);
  } catch (e) {
    return { why: e instanceof Error ? e.message : 'That did not work' };
  }
  const inv = inventionLibrary(p);
  const runes = parsed.runes.flatMap((r) => (isGlyph(r) ? [] : [r.rune]));
  if (runes.length === 0) return { why: 'Nothing to copy' };
  const missing = [...new Set(runes.filter((r) => !knows(p, r)))];
  if (missing.length > 0) {
    return { why: `Not owned yet: ${missing.map((r) => nameOf(r, inv)).join(', ')}` };
  }
  const top = Math.min(...parsed.runes.map((r) => r.at.y));
  const dy = freeRowBelow(page) - top;
  const copied = parsed.runes.map((r) => ({ ...r, at: { x: r.at.x, y: r.at.y + dy } }));
  const next = setMemberLattice(p, m, growingLattice([...page, ...copied]));
  const before = new Set((validateLoadout(p, [m])[m] ?? []).map((i) => i.message));
  const fresh = (validateLoadout(next, [m])[m] ?? []).filter((i) => !before.has(i.message));
  const first = fresh[0];
  if (first) return { why: first.message };
  return { profile: next };
}
