import type { Profile, Trip } from '$engine';
import { LOWER_SEAM, ownerDoor, tripFloors } from '$engine/districts/lowerSeam';

/** The line on the lowest floor's bottom screen (SM P11): the door in its two visible states. */
export interface DoorLine {
  state: 'sealed' | 'open';
  label: string;
  sub: string;
}

/** What "Go through the door" says until BL-126's entry is designed. */
export const DOOR_PLACEHOLDER = 'Beyond the door: not yet written.';

/**
 * The door's line, or null when there is none to draw: not the lowest floor of a lower-Seam trip,
 * or the door still hidden (the lowest floor not reached yet). Sealed is a greyed line; open is
 * the way through. Never names what keeps it sealed.
 */
export function doorLine(profile: Profile, trip: Trip): DoorLine | null {
  if (trip.district !== LOWER_SEAM || !trip.kit) return null;
  if (trip.encounter !== tripFloors(trip).length - 1) return null;
  switch (ownerDoor(profile)) {
    case 'hidden':
      return null;
    case 'sealed':
      return {
        state: 'sealed',
        label: 'A sealed door',
        sub: 'No handle on this side. It will not open to this hand yet.',
      };
    case 'open':
      return { state: 'open', label: 'Go through the door', sub: 'It is unlatched now.' };
  }
}
