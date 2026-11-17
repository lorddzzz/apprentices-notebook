import { cloneData } from '../../clone';
import { KIT } from '../../districts/kit';
import type { Json, RoomSetup, RuleId, ShapeInput, TripShapeDef } from '../../districts/types';
import { createRng } from '../../rng';
import type { GenKit, RuleKit, ShapeKit } from '../types';
import { at, coords, foeKit, isPlain, lay, needsOf, shuffled } from './seam';

/**
 * The bathhouses' kit (EN-K4; P4, P14, P15, P33): the boil-over rule with the vents and steam it
 * brings, the foes of the steam, and the rising-heat shape lent to drawn trips. The district is
 * reached through `KIT` (the lint rule for engine files), read lazily: see the import cycle noted
 * in `generate.ts`. No district file is edited.
 */

export const BOIL_OVER: RuleId = 'bathhouses:boilOver';
const HEAT = 'bathhouses:heat';

/**
 * The boil-over's stamp (P4: the rule brings its vents): one or two vents on plain tiles above the
 * bottom two rows (where the start points go) and, past the minimum, a patch of steam beside the
 * first vent, so the gauge has something to fill from at every heat. The minimum stamp is one vent.
 */
export const boilOverKit: RuleKit = {
  id: BOIL_OVER,
  needs: needsOf(BOIL_OVER),
  brings: [],
  stamp(layout, seed, minimum) {
    const rng = createRng(seed);
    const out = cloneData(layout);
    const free = shuffled(
      coords(out).filter((c) => {
        const t = at(out, c);
        return t !== undefined && isPlain(t) && c.y < out.height - 2;
      }),
      rng,
    );
    const vents = minimum ? 1 : rng.int(1, 2);
    const laid = free.slice(0, vents);
    for (const c of laid) lay(out, c, '@');
    const first = laid[0];
    if (!minimum && first) {
      const beside = free
        .slice(vents)
        .filter((c) => Math.abs(c.x - first.x) + Math.abs(c.y - first.y) <= 2);
      for (const c of beside.slice(0, rng.int(2, 3))) lay(out, c, '~');
    }
    return out;
  },
};

/** The heat levels the gauge knows. */
type Heat = 1 | 2 | 3 | 4;
const HEART_HEAT: Heat = 4;

/**
 * P15: the room's base heat on a trip of `length` rooms: 1 in room 1, climbing in even steps over
 * the rooms before the heart (never past 3, a longer trip climbs more slowly), the heart always at
 * 4. Rooms are 0-based.
 */
export function heatAt(room: number, length: number): Heat {
  if (room >= length - 1) return HEART_HEAT;
  return (1 + Math.min(2, Math.floor((room * 3) / (length - 1)))) as Heat;
}

/** The district's heat shape, read when first used (the cycle noted in `generate.ts`). */
const heatShape = (): TripShapeDef => {
  const shape = KIT.shapes[HEAT];
  if (!shape) throw new RangeError(`No kit for ${HEAT}`);
  return shape;
};

type CoolState = { pendingCool?: number };

/**
 * The rising heat (P15), at any length a drawing takes. The district's own shape reads its heat
 * from a table of five rooms; this one reads `heatAt`, and keeps everything else of the district's
 * (its state reader, its start and its settling after a room). A cold plunge never reaches a
 * drawn trip (its card is the baths' own), but a cooled room reads as it does at home, one lower
 * and never below 1, the heart never cooled.
 */
export function heatSetup(input: Pick<ShapeInput<Json>, 'room' | 'length' | 'state'>): RoomSetup {
  const base = heatAt(input.room, input.length);
  const cool = (input.state as CoolState | null)?.pendingCool === 1 ? 1 : 0;
  const heat = base === HEART_HEAT || cool === 0 ? base : (Math.max(1, base - cool) as Heat);
  return { rulesConfig: { [BOIL_OVER]: { heat } } };
}

/**
 * Rising heat is lent as the district's shape with its heat by `heatAt`: the district's offers are
 * replaced by the drawn trip's own (EN-8), so only the room setup differs.
 */
export const heatKit: ShapeKit = {
  id: HEAT,
  needs: needsOf(HEAT),
  lengths: [3, 4, 5, 6],
  get shape(): TripShapeDef {
    const home = heatShape();
    return { ...home, roomSetup: (input) => heatSetup(input) };
  },
};

/** The steam's people: plain foes by their own data (the Steward is the frame's, not the drawing's). */
export const BATH_FOE_KITS = (['attendant', 'boilerman', 'dissolvedBather'] as const).map(foeKit);

/** The bathhouses: boil-over with its vents and steam, the baths' people and the rising heat. */
export const BATH_KIT: GenKit = {
  district: 'bathhouses',
  rules: [boilOverKit],
  pieces: [],
  foes: BATH_FOE_KITS,
  shapes: [heatKit],
  frames: [],
};
