import type { PaperDef } from '../index';

/**
 * Letters to the owner (ink-quarter-plan P13, IQ-14): five undelivered notices in the
 * Cartographers' hand, one per room of the dead-letter office and the last on the postmaster's
 * desk. Polite, and the politeness is the point (district-cartographers: "the guild's polite
 * notices: the expulsion and the reasons it gave"). Ids are namespaced `inkQuarter:letter-N`.
 *
 * Wiring: each room's `lore` names its letter (`INK_LETTERS[room].id`); `found.room` is the
 * encounter index (0-3 the rooms, 4 the heart, where the postmaster's desk stands).
 */
const letter = (n: number, room: number, title: string, text: string): PaperDef => ({
  id: `inkQuarter:letter-${n}`,
  district: 'inkQuarter',
  title,
  hand: 'The Cartographers',
  text,
  group: 'Dead letters',
  found: { kind: 'room', room },
});

export const INK_LETTERS: readonly PaperDef[] = [
  letter(
    1,
    0,
    'A courtesy',
    'Re: Sheet 0, northern edge, to the owner of the notebook. A small irregularity has been noted in the survey of the northern edge: a street that does not join. It is requested that the street be drawn again, with care. With every courtesy, the Cartographers.',
  ),
  letter(
    2,
    1,
    'A second courtesy',
    'Re: Sheet 0, northern edge, to the owner. The street has not been redrawn. It is understood to end now in a wall at one end and in nothing at the other. It is requested again, with some patience, that the page be corrected.',
  ),
  letter(
    3,
    2,
    'A question',
    'Re: Non-Conforming Join, Sheet 0, to the owner. It has been asked, by several members, why the street was not struck out. It is held that a place nobody drew cannot be left standing on the map. A reply is requested by return.',
  ),
  letter(
    4,
    3,
    'A hearing',
    'Re: Non-Conforming Join, Sheet 0, to the owner. Attendance is requested on the matter of the place the owner calls the Seam. The pen and the notebook are to be brought. The place is not. It is regretted that this should be necessary.',
  ),
  letter(
    5,
    4,
    'The notice',
    'Re: Non-Conforming Join, Sheet 0, to the owner. The case has been considered. It is found that the owner is no longer of the Cartographers. The pen is withdrawn and the name is struck from the roll. This notice is to be delivered by hand, as is proper. The Cartographers.',
  ),
];
