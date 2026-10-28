import type { DistrictId, EnemyId } from '$data';
import { DISTRICT_KIT, type IntrusionSpec } from '$data/districts/index';
import { FLOOR_FORMAT, type FloorFormat } from '$data/districts/seam';
import { label } from '../grid';
import { type BoardSpec, parseBoard } from '../notation';
import type { CityState, Profile } from '../types';
import { KIT } from './kit';
import type { Kit } from './types';

/**
 * The lower Seam (SM P7, P10, P11). SM-0: its contracts. The trip itself (SM-7), the floor
 * builder (SM-8) and the door's Crossroads line (SM-10) come later.
 */

/** The lower Seam's module id (P7). SM-7 appends it last to `DISTRICT_IDS` (other salts unchanged). */
export const LOWER_SEAM = 'lowerSeam' as const;
/** `Trip.kit.state` on a lower-Seam trip: the floors, fixed at `startTrip` so replays stay seeded. */
export interface LowerSeamState {
  floors: DistrictId[];
}
/** `city.doorSeen` (P11): the lowest floor was reached once, win or wipe. SM-10 adds the field. */
export type DoorCity = CityState & { doorSeen?: boolean };

// ── Floors (P7) ─────────────────────────────────────────
/** Districts that are never a floor: the Seam itself, and the Cartographers (its truth, not a floor). */
const NOT_FLOORS: readonly DistrictId[] = ['seam', 'cartographers'];

/** The lower Seam opens when the Marginalia (the Seam's heart) has fallen. */
export function lowerSeamOpen(p: Profile): boolean {
  return p.city.hearts.includes('seam');
}

/** The floors, top to bottom: opened districts in opening order that ship an `IntrusionSpec`. */
export function floorsFor(
  p: Profile,
  kit: Readonly<Partial<Record<DistrictId, { intrusion?: IntrusionSpec }>>> = DISTRICT_KIT,
): DistrictId[] {
  return p.city.open.filter((d) => !NOT_FLOORS.includes(d) && kit[d]?.intrusion !== undefined);
}

// ── The sealed door (P11) ───────────────────────────────
export type DoorState = 'hidden' | 'sealed' | 'open';
/**
 * Derived, never stored: hidden until the lowest floor has been reached once, then sealed until
 * the Cartographers' heart is cleared. Monotone, since both inputs only grow.
 */
export function ownerDoor(p: { city: DoorCity }): DoorState {
  if (!p.city.doorSeen) return 'hidden';
  return p.city.hearts.includes('cartographers') ? 'open' : 'sealed';
}

// ── The floor format (P9, P10) ──────────────────────────
/** One problem `checkFloor` finds; `layout` is the index in `rooms`, null for the spec itself. */
export interface FloorProblem {
  layout: number | null;
  message: string;
}

/** Does this board carry the intrusion: one of its pieces, or a terrain one of its rules reads? */
function carriesIntrusion(board: BoardSpec, spec: IntrusionSpec, kit: Kit): boolean {
  const flags = spec.rules.flatMap((id) => {
    const a = kit.rules[id]?.activatedBy;
    return a?.kind === 'terrain' ? [a.flag] : [];
  });
  return board.tiles.some(
    (t) =>
      (t.piece !== null && spec.pieces.includes(t.piece.id)) ||
      flags.some((f) => Boolean(t.terrain[f])),
  );
}

function checkLayout(layout: string, spec: IntrusionSpec, kit: Kit, f: FloorFormat): string[] {
  let board: BoardSpec;
  try {
    board = parseBoard(layout);
  } catch (err) {
    return [err instanceof Error ? err.message : String(err)];
  }
  const out: string[] = [];
  if (board.width < f.minWidth || board.width > f.maxWidth) {
    out.push(`Floor is ${board.width} wide, want ${f.minWidth}–${f.maxWidth}`);
  }
  if (board.height < f.minHeight || board.height > f.maxHeight) {
    out.push(`Floor is ${board.height} tall, want ${f.minHeight}–${f.maxHeight}`);
  }
  if (board.starts.length < f.minStarts) {
    out.push(`Floor has ${board.starts.length} start points, want at least ${f.minStarts}`);
  }
  for (const u of board.units) {
    if (u.kind === 'member') {
      out.push(`Apprentice in cell ${label(u.at)}: floors use start points (P)`);
    } else if (!f.foes.includes(u.def as EnemyId)) {
      out.push(`Foe "${u.def}" in cell ${label(u.at)}: floors hold Seam foes only`);
    }
  }
  for (const t of board.tiles) {
    if (t.piece && !spec.pieces.includes(t.piece.id)) {
      out.push(`Piece "${t.piece.id}" is not one the intrusion brings`);
    }
  }
  if (!carriesIntrusion(board, spec, kit)) out.push('No intrusion piece or terrain on the floor');
  return out;
}

/**
 * The floor format check (P9, P10): pieces and rules the kit knows, piece-scoped rules only, and
 * per layout a 6–7 × 7–9 board, at least five `P`, Seam foes only, and at least one intrusion
 * piece (or terrain one of its rules reads). Empty when the spec is fine. Foe budget is tuned by
 * the bot, not checked here.
 */
export function checkFloor(spec: IntrusionSpec, kit: Kit = KIT, f = FLOOR_FORMAT): FloorProblem[] {
  const problems: FloorProblem[] = [];
  for (const id of spec.pieces) {
    if (!kit.pieces[id]) problems.push({ layout: null, message: `Unknown piece '${id}'` });
  }
  for (const id of spec.rules) {
    const rule = kit.rules[id];
    if (!rule) problems.push({ layout: null, message: `Unknown rule '${id}'` });
    else if (rule.scope !== 'piece') {
      problems.push({ layout: null, message: `Rule '${id}' is district-scoped (P9)` });
    }
  }
  spec.rooms.forEach((layout, i) => {
    for (const message of checkLayout(layout, spec, kit, f)) problems.push({ layout: i, message });
  });
  return problems;
}
