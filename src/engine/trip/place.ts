import { DISTRICT_IDS, DISTRICTS, encountersOf } from '$data';
import { createRng, deriveSeed } from '../rng';
import type { Trip } from '../types';

/** The variant pool the Crossroads before `encounter` fixed, if any (P4). */
export function poolFor(t: Pick<Trip, 'kit'>, encounter: number): readonly number[] | undefined {
  return t.kit?.choices.find((c) => c.after === encounter - 1)?.pool;
}

/**
 * Which of the encounter's layouts this trip plays (plan S10): derived from the seed, never
 * stored. A choice at the Crossroads before it may narrow the draw to a pool (P4); the roll is the
 * same one, so a room without a pool plays as before.
 */
export function variantFor(t: Trip, encounter: number): number {
  const count = encountersOf(t.district)[encounter]?.variants.length ?? 1;
  // The Seam keeps its original salt so old trips replay the same rooms (K-2).
  const salt =
    t.district === 'seam'
      ? 2000 + encounter
      : 3000 + 100 * DISTRICT_IDS.indexOf(t.district) + encounter;
  const rng = createRng(deriveSeed(t.seed, salt));
  const pool = poolFor(t, encounter)?.filter((v) => v < count);
  if (pool && pool.length > 0) return pool[rng.int(0, pool.length - 1)] ?? 0;
  return rng.int(0, count - 1);
}

/** The name of the room this trip fights in at `encounter` (its layout's place name). */
export function placeOf(t: Trip, encounter = t.encounter): string {
  const enc = encountersOf(t.district)[encounter];
  return enc?.variants[variantFor(t, encounter)]?.name ?? enc?.title ?? DISTRICTS[t.district].name;
}
