import { DISTRICT_IDS, type DistrictId, encountersOf } from '$data';
import {
  type BonusObjective,
  type CheckpointDef,
  DISTRICT_KIT,
  type ReturnPolicy,
} from '$data/districts/index';
import { KIT } from '../districts/index';
import type {
  CityCheckpoints,
  Json,
  RuleId,
  ShapeInput,
  TakenChoice,
  TripKitState,
  TripShapeDef,
} from '../districts/types';
import type { Profile, Trip } from '../types';

/**
 * A district's trip shape (P3–P5): where home is reachable, the checkpoint, how many rooms, and
 * the module's shape hooks. The return and choice logic reads only this, so tests and the fuzz
 * pass fixture shapes; the game reads `shapeOf(district)`.
 */
export interface DistrictShape {
  ret: ReturnPolicy;
  checkpoint?: CheckpointDef;
  /** Rooms in a trip; the last is the heart. */
  length: number;
  trip?: TripShapeDef;
  /** The district's own district-scoped rules, listed in every room (P9; DK-5b). */
  rules?: readonly RuleId[];
  /** Rooms with an optional objective, by room index (P13; DK-5b). */
  bonuses?: Readonly<Record<number, BonusObjective>>;
}

export function shapeOf(district: DistrictId): DistrictShape {
  const data = DISTRICT_KIT[district];
  const mod = KIT.modules[district];
  const trip = mod?.trip;
  const rules = (mod?.rules ?? []).filter((r) => r.scope === 'district').map((r) => r.id);
  const bonuses: Record<number, BonusObjective> = {};
  data?.rooms?.forEach((room, i) => {
    if (room.bonus) bonuses[i] = room.bonus;
  });
  return {
    ret: data?.ret ?? { kind: 'any' },
    ...(data?.checkpoint ? { checkpoint: data.checkpoint } : {}),
    length: encountersOf(district).length,
    ...(trip ? { trip } : {}),
    ...(rules.length > 0 ? { rules } : {}),
    ...(Object.keys(bonuses).length > 0 ? { bonuses } : {}),
  };
}

/** The heart is the last room: a return point whatever the policy says (city K-table). */
export const heartOf = (shape: DistrictShape): number => shape.length - 1;

/** Whether a trip into this shape carries `Trip.kit` (the Seam and the canals do not). */
export const carriesKit = (shape: DistrictShape): boolean =>
  shape.trip !== undefined || shape.checkpoint !== undefined || shape.bonuses !== undefined;

/** A fresh `Trip.kit`, or undefined for a shape that needs none. */
export function newTripKit(shape: DistrictShape): TripKitState | undefined {
  if (!carriesKit(shape)) return undefined;
  return { state: shape.trip?.initState() ?? null, choices: [], checkpoint: false, bonuses: [] };
}

/** What a shape hook reads: the trip with its kit and parsed state. */
export function shapeInput(t: Trip, shape: DistrictShape): ShapeInput<Json> {
  const kit = t.kit ?? { state: null, choices: [], checkpoint: false, bonuses: [] };
  return {
    trip: t,
    kit,
    state: shape.trip ? shape.trip.parseState(kit.state) : kit.state,
    room: t.encounter,
    length: shape.length,
  };
}

/**
 * The checkpoint is reached once its room is won (P5): the party stands at the doorway's
 * Crossroads, or anywhere past it. A trip started there has reached it too.
 */
export function reachedCheckpoint(
  shape: DistrictShape,
  t: Pick<Trip, 'encounter' | 'status'>,
): boolean {
  const cp = shape.checkpoint;
  if (!cp) return false;
  return t.encounter > cp.after || (t.encounter === cp.after && t.status !== 'fight');
}

/** A won room may be the checkpoint's: the trip notes it (P5). */
export function markCheckpoint(t: Trip, shape: DistrictShape = shapeOf(t.district)): Trip {
  if (!t.kit || t.kit.checkpoint || !reachedCheckpoint(shape, t)) return t;
  return { ...t, kit: { ...t.kit, checkpoint: true } };
}

/** The room a trip started at the checkpoint fights first. */
export const checkpointRoom = (cp: CheckpointDef): number => cp.after + 1;

/**
 * A trip that reached its checkpoint leaves it in the city when it ends, won or wiped (P5, like
 * hearing). Other trips leave the profile as it was.
 */
export function rememberCheckpoint(p: Profile, t: Trip, shape = shapeOf(t.district)): Profile {
  if (!t.kit?.checkpoint || !shape.checkpoint) return p;
  if (p.city.checkpoints?.[t.district] === shape.checkpoint.after) return p;
  const checkpoints = { ...p.city.checkpoints, [t.district]: shape.checkpoint.after };
  return { ...p, city: { ...p.city, checkpoints } };
}

// ── Save parsing ────────────────────────────────────────
const bad = (): never => {
  throw new Error('Not a valid save');
};
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown): number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : bad();
const counts = (v: unknown): number[] => (Array.isArray(v) ? v.map(count) : bad());

function isJson(v: unknown, depth = 0): v is Json {
  if (depth > 32) return false;
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every((x) => isJson(x, depth + 1));
  return isRecord(v) && Object.values(v).every((x) => isJson(x, depth + 1));
}

function parseTaken(v: unknown): TakenChoice {
  if (!isRecord(v) || typeof v.id !== 'string' || v.id === '') return bad();
  const taken: TakenChoice = { after: count(v.after), id: v.id };
  if (v.pool !== undefined) {
    const pool = counts(v.pool);
    if (pool.length === 0) bad();
    taken.pool = pool;
  }
  return taken;
}

/**
 * `Trip.kit` from a save, checked against the trip it rides on: present exactly when the shape
 * carries one, one choice per Crossroads passed (after rooms 0…encounter-1, in order), the
 * checkpoint flag matching the room, and the module's own state through its parser.
 */
export function parseTripKit(
  raw: unknown,
  t: Pick<Trip, 'encounter' | 'status'>,
  shape: DistrictShape,
): TripKitState | undefined {
  if (!carriesKit(shape)) return raw === undefined ? undefined : bad();
  if (!isRecord(raw)) return bad();
  const choices = Array.isArray(raw.choices) ? raw.choices.map(parseTaken) : bad();
  const passed = choices.map((c) => c.after);
  // A trip started at the checkpoint skipped the Crossroads before it.
  const first = passed[0] ?? t.encounter;
  if (passed.some((a, i) => a !== first + i) || first + passed.length !== t.encounter) bad();
  if (typeof raw.checkpoint !== 'boolean') bad();
  const checkpoint = raw.checkpoint === true;
  if (checkpoint !== reachedCheckpoint(shape, t)) bad();
  if (first > 0 && !(shape.checkpoint && first === checkpointRoom(shape.checkpoint))) bad();
  // Fields newer than a save read as empty (P18): no bonuses met, the module's default state.
  const bonuses = raw.bonuses === undefined ? [] : counts(raw.bonuses);
  if (bonuses.some((b) => b > t.encounter)) bad();
  const own = raw.state;
  if (own !== undefined && !isJson(own)) return bad();
  const state: Json = shape.trip ? shape.trip.parseState(own) : (own ?? null);
  return { state, choices, checkpoint, bonuses };
}

/** `city.checkpoints` from a save: only districts whose shape has that checkpoint. */
export function parseCheckpoints(raw: unknown): CityCheckpoints {
  if (!isRecord(raw)) return bad();
  const out: CityCheckpoints = {};
  for (const [id, v] of Object.entries(raw)) {
    const district = DISTRICT_IDS.find((d) => d === id) ?? bad();
    if (count(v) !== shapeOf(district).checkpoint?.after) bad();
    out[district] = count(v);
  }
  return out;
}
