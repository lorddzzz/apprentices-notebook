import { DISTRICT_IDS, DISTRICTS, encountersOf } from '$data';
import { createRng, deriveSeed } from '../rng';
import type { Trip } from '../types';

/** Which of the encounter's layouts this trip plays (plan S10): derived from the seed, never stored. */
export function variantFor(t: Trip, encounter: number): number {
  const count = encountersOf(t.district)[encounter]?.variants.length ?? 1;
  // The Seam keeps its original salt so old trips replay the same rooms (K-2).
  const salt =
    t.district === 'seam'
      ? 2000 + encounter
      : 3000 + 100 * DISTRICT_IDS.indexOf(t.district) + encounter;
  return createRng(deriveSeed(t.seed, salt)).int(0, count - 1);
}

/** The name of the room this trip fights in at `encounter` (its layout's place name). */
export function placeOf(t: Trip, encounter = t.encounter): string {
  const enc = encountersOf(t.district)[encounter];
  return enc?.variants[variantFor(t, encounter)]?.name ?? enc?.title ?? DISTRICTS[t.district].name;
}
