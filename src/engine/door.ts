import type { CityState } from './types';

/** The owner's door at the bottom of the lower Seam (SM P11). */
export type DoorState = 'hidden' | 'sealed' | 'open';

/**
 * Derived, never stored: hidden until the lowest floor has been reached once, then sealed until
 * the Cartographers' heart is cleared. Monotone, since both inputs only grow. A core file, so the
 * handover (`drawing/ending.ts`) reads the same rule as the lower Seam that re-exports it.
 */
export function ownerDoor(p: { city: CityState }): DoorState {
  if (!p.city.doorSeen) return 'hidden';
  return p.city.hearts.includes('cartographers') ? 'open' : 'sealed';
}
