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
    'To the owner of the notebook. The guild notes a small irregularity in your survey of the northern edge: a street that does not join. Please draw it again, and do be careful with it. With every courtesy, the Cartographers.',
  ),
  letter(
    2,
    1,
    'A second courtesy',
    'To the owner. The street has not been redrawn. The guild is told it now ends in a wall at one end and in nothing at the other. We ask again, with some patience, that you correct the page.',
  ),
  letter(
    3,
    2,
    'A question',
    'To the owner. Several members have asked why you did not strike the street out. The guild has no wish to be unkind, but a place nobody drew cannot be left standing on our map. Please reply by return.',
  ),
  letter(
    4,
    3,
    'A hearing',
    'To the owner. You are asked to attend the guild on the matter of the place you call the Seam. Bring your pen and your notebook. Do not bring the place. We regret that this should be necessary.',
  ),
  letter(
    5,
    4,
    'The notice',
    'To the owner. The guild has considered your case and finds that you are no longer of the Cartographers. Your pen is withdrawn and your name is struck from the roll. This notice is to be delivered by hand, as is proper. The Cartographers.',
  ),
];
