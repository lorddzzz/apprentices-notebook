import { MEMBER_IDS, type MemberId, RUNE_IDS, RUNES, type RuneId } from '$data';
import {
  available,
  type Coord,
  canPlace,
  countRunes,
  inkCost,
  inkUsed,
  isSocket,
  type Lattice,
  latticeOf,
  type Profile,
  rotateSocket,
  setMemberLattice,
  setSocket,
  socketAt,
} from '$engine';

/** What the player is holding: a rune from the shelf, the eraser, or nothing. */
export type ShelfTool = { kind: 'rune'; rune: RuneId } | { kind: 'erase' } | { kind: 'none' };

export type SocketDecision =
  | { kind: 'place'; rune: RuneId }
  | { kind: 'replace'; rune: RuneId }
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
}

export const NO_TOOL: ShelfTool = { kind: 'none' };

export function inkLeft(lattice: Lattice, capacity: number | null): number | null {
  return capacity === null ? null : capacity - inkUsed(lattice);
}

/** Shelf counter for one collection: owned minus what every lattice already holds. null owned = Lab (∞). */
export function freeCounter(
  owned: Readonly<Record<RuneId, number>> | null,
  lattices: readonly Lattice[],
): (rune: RuneId) => number | null {
  if (owned === null) return () => null;
  const used = countRunes(lattices);
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

  if (tool.kind === 'erase') return placed ? { kind: 'remove' } : { kind: 'ignore' };

  if (tool.kind === 'rune' && placed?.rune !== tool.rune) {
    const rune = tool.rune;
    if (ctx.free(rune) === 0) return { kind: 'reject', reason: `No ${RUNES[rune].name} left` };
    const left = inkLeft(ctx.lattice, ctx.capacity);
    const refund = placed ? inkCost(placed.rune) : 0;
    if (left !== null && inkCost(rune) > left + refund) return inkReject(rune, left + refund);
    return placed ? { kind: 'replace', rune } : { kind: 'place', rune };
  }

  if (!placed) return { kind: 'ignore' };
  return RUNES[placed.rune].arrow ? { kind: 'rotate' } : { kind: 'inspect' };
}

export function applyDecision(lattice: Lattice, at: Coord, d: SocketDecision): Lattice {
  switch (d.kind) {
    case 'place':
    case 'replace':
      return setSocket(lattice, at, d.rune);
    case 'rotate':
      return rotateSocket(lattice, at);
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
): ShelfSlot[] {
  const free = freeCounter(owned, lattices);
  const left = inkLeft(current, capacity);
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
  };
}

/** The 14 shelf slots for `m`'s page: owned counts come from the profile, placed counts from both lattices. */
export function profileShelf(p: Profile, m: MemberId): ShelfSlot[] {
  return shelfSlots(
    p.collection,
    MEMBER_IDS.map((id) => latticeOf(p, id)),
    latticeOf(p, m),
    p.inkCapacity[m],
  );
}

export interface ProfileEdit extends Omit<EditResult, 'lattice'> {
  profile: Profile;
  /** The lattice changed (worth saving). */
  changed: boolean;
}

/**
 * One tap or long-press on member `m`'s socket, against the saved profile. The engine's `canPlace`
 * has the last word: anything study.ts would place that the engine refuses is rejected with its reason.
 */
export function editProfile(
  p: Profile,
  m: MemberId,
  at: Coord,
  tool: ShelfTool,
  longPress: boolean,
): ProfileEdit {
  const r = editSocket(profileContext(p, m), at, tool, longPress);
  if (r.decision.kind === 'place' || r.decision.kind === 'replace') {
    const reason = canPlace(p, m, at, r.decision.rune);
    if (reason !== null) {
      return {
        profile: p,
        tool,
        decision: { kind: 'reject', reason },
        message: reason,
        changed: false,
      };
    }
  }
  const changed = ['place', 'replace', 'rotate', 'remove'].includes(r.decision.kind);
  const { lattice, ...rest } = r;
  return { ...rest, profile: changed ? setMemberLattice(p, m, lattice) : p, changed };
}
