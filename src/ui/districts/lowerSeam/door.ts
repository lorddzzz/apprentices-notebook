import { ENDING_LINES } from '$data/ending';
import type { Profile, Trip } from '$engine';
import { LOWER_SEAM, ownerDoor, tripFloors } from '$engine/districts/lowerSeam';
import { endingOf } from '$engine/drawing';

/** The line on the lowest floor's bottom screen (SM P11): the door in its two visible states. */
export interface DoorLine {
  state: 'sealed' | 'open';
  label: string;
  sub: string;
}

/** The row under the Seam node (P20): the owner's door until the visit, the owner's desk after it. */
export function doorRow(profile: Profile): { label: string; sub: string } | null {
  if (ownerDoor(profile) !== 'open') return null;
  return endingOf(profile).handover
    ? { label: ENDING_LINES.desk, sub: ENDING_LINES.deskSub }
    : { label: ENDING_LINES.door, sub: ENDING_LINES.doorSub };
}

/**
 * The door's line, or null when there is none to draw: not the lowest floor of a lower-Seam trip,
 * or the door still hidden (the lowest floor not reached yet). Sealed is a greyed line; open is
 * a line that points home (the visit is a free one from the map, P20). Never names what keeps it sealed.
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
      return { state: 'open', label: ENDING_LINES.inTrip, sub: '' };
  }
}
