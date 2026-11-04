import type { DistrictId, EncounterDef, EnemyId } from '$data';
import { DISTRICT_IDS, DISTRICT_KIT, DISTRICTS, type IntrusionSpec } from '$data/districts/index';
import { LOWER_SEAM_FLOOR } from '$data/districts/lowerSeam';
import { FLOOR_FORMAT, type FloorFormat } from '$data/districts/seam';
import { label } from '../grid';
import { type BoardSpec, parseBoard } from '../notation';
import { SEAM_DROP_RULE } from '../outOfRoom';
import type { CityState, Profile, Trip } from '../types';
import { KIT } from './kit';
import type { BoardRule, DistrictModule, Kit, TripShapeDef } from './types';

/**
 * The lower Seam (SM P7, P10, P11): its own trip, one floor per opened district with an
 * intrusion, free return after any floor, no heart. SM-7: the trip and its module. SM-8: the floor
 * builder (piece-scoped rules only, the Seam drop, the loot table). SM-10: the sealed door.
 */

/** The lower Seam's module id (P7), last in `DISTRICT_IDS` so other salts are unchanged. */
export const LOWER_SEAM = 'lowerSeam' as const;
/** `Trip.kit.state` on a lower-Seam trip: the floors, fixed at `startTrip` so replays stay seeded. */
export interface LowerSeamState {
  floors: DistrictId[];
}
/** A city with `doorSeen` (P11); the field itself lives on `CityState`. */
export type DoorCity = CityState;

// ── Floors (P7) ─────────────────────────────────────────
/** Districts that are never a floor: the Seam itself, and the Cartographers (its truth, not a floor). */
const NOT_FLOORS: readonly DistrictId[] = ['seam', 'cartographers', LOWER_SEAM];

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

type IntrusionKit = Readonly<Partial<Record<DistrictId, { intrusion?: IntrusionSpec }>>>;

// ── The trip (P7) ───────────────────────────────────────
const badSave = (): never => {
  throw new Error('Not a valid save');
};

/**
 * Trip state from a save: one or more floors, each a district that is still a floor (not the
 * Seam, the Cartographers or the lower Seam, and shipping an intrusion), none twice.
 */
export function parseLowerSeamState(
  raw: unknown,
  kit: IntrusionKit = DISTRICT_KIT,
): LowerSeamState {
  if (typeof raw !== 'object' || raw === null || !('floors' in raw)) return badSave();
  const floors = raw.floors;
  if (!Array.isArray(floors) || floors.length === 0) return badSave();
  const out = floors.map((f): DistrictId => {
    const d = DISTRICT_IDS.find((id) => id === f) ?? badSave();
    return NOT_FLOORS.includes(d) || !kit[d]?.intrusion ? badSave() : d;
  });
  return new Set(out).size === out.length ? { floors: out } : badSave();
}

/** The floors a lower-Seam trip fixed when it set out (none on any other trip). */
export function tripFloors(t: Pick<Trip, 'district' | 'kit'>): readonly DistrictId[] {
  if (t.district !== LOWER_SEAM || !t.kit) return [];
  return parseLowerSeamState(t.kit.state).floors;
}

/**
 * Floor `index` of a trip with these floors, as a room: the floor district's three intrusion
 * layouts are its variants (the seed picks one, salted per floor by `variantFor`). The lowest
 * floor is the trip's last room (`heart: true`, two picks, P10), and still marks no heart
 * (`marksHeart: false`). Its loot is the `lowerSeam` table. A spec carrying a district-scoped or
 * unknown rule is refused (P9): the board brings its piece-scoped rules itself, nothing else runs.
 */
export function floorRoom(
  floors: readonly DistrictId[],
  index: number,
  kit: IntrusionKit = DISTRICT_KIT,
  rulesKit: Kit = KIT,
): EncounterDef {
  const d = floors[index];
  const spec = d === undefined ? undefined : kit[d]?.intrusion;
  if (d === undefined || !spec) throw new Error(`No floor ${index + 1} below the Seam`);
  const bad = spec.rules.filter((id) => rulesKit.rules[id]?.scope !== 'piece');
  if (bad.length > 0)
    throw new Error(`Floor ${d} brings a rule that is not piece-scoped: ${bad.join(', ')}`);
  const lowest = index === floors.length - 1;
  const title = `Floor ${index + 1}: ${DISTRICTS[d].name}`;
  return {
    id: `${LOWER_SEAM}:${d}`,
    title,
    depth: index + 1,
    layout: spec.rooms[0],
    variants: spec.rooms.map((layout) => ({ name: title, layout })),
    loot: LOWER_SEAM_FLOOR.loot,
    picks: lowest ? LOWER_SEAM_FLOOR.lowestPicks : LOWER_SEAM_FLOOR.picks,
    heart: lowest,
  };
}

/**
 * The Seam drop (P9): every floor lists this do-nothing rule, and a fall there (a span going, a
 * bridge piece) is the canals' survivable drop instead of out of the room. Piece-scoped like
 * everything a floor runs, and brought by no piece: the floor lists it.
 */
export const SEAM_DROP: BoardRule<null> = {
  id: SEAM_DROP_RULE,
  slot: 'late',
  order: 100, // after every other late rule; it does nothing
  scope: 'piece',
  activatedBy: { kind: 'piece', pieces: [] },
  init: () => null,
  step: (_ctx, own) => own,
};

/** The lower Seam's trip shape: the floors fixed from the profile at `startTrip` (P7). */
export const LOWER_SEAM_TRIP: TripShapeDef<{ floors: DistrictId[] }> = {
  id: `${LOWER_SEAM}:floors`,
  parseState: (raw) => parseLowerSeamState(raw),
  initState: (p) => ({ floors: p ? floorsFor(p) : [] }),
  roomSetup: () => ({ activate: [SEAM_DROP_RULE] }),
};

/** The lower Seam's engine module: per-trip rooms, its shape, opened by the Seam's heart. */
export const LOWER_SEAM_MODULE: DistrictModule = {
  id: LOWER_SEAM,
  rules: [SEAM_DROP],
  trip: LOWER_SEAM_TRIP,
  isOpen: lowerSeamOpen,
  length: (t) => (t.kit ? floorsOfState(t.kit.state).length : 0),
  encounter: (t, i) => floorRoom(tripFloors(t), i),
};

/** A new trip's floors may be empty (refused at `startTrip`, P8); a saved one never is. */
function floorsOfState(state: unknown): readonly DistrictId[] {
  const floors =
    typeof state === 'object' && state !== null && 'floors' in state ? state.floors : null;
  return Array.isArray(floors) && floors.length === 0 ? [] : parseLowerSeamState(state).floors;
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

/**
 * Closes the lowest floor's fight (win or wipe) into `city.doorSeen` (P11): the room was reached,
 * and the door is no longer hidden. Any other trip or room leaves the profile as it was.
 */
export function markDoorSeen(p: Profile, t: Trip): Profile {
  if (t.district !== LOWER_SEAM || !t.kit || p.city.doorSeen) return p;
  if (t.encounter !== tripFloors(t).length - 1) return p;
  return { ...p, city: { ...p.city, doorSeen: true } };
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
