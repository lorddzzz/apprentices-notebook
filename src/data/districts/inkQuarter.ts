import type { DistrictData } from './index';
import { INK_INTRUSION } from './inkQuarter/floor';
import { INK_LETTERS } from './inkQuarter/papers';
import { INK_ROOMS_12 } from './inkQuarter/rooms12';
import { INK_ROOMS_34 } from './inkQuarter/rooms34';
import { INK_THRESHOLD } from './inkQuarter/threshold';
import { INK_TABLE_IDS } from './inkQuarter/types';

/**
 * The ink-makers' quarter's kit data (district-ink-makers.md, Hearing): a mark by one apprentice,
 * hit by a different apprentice's cast the same turn, in the Seam. The old deep-mark trigger is
 * gone. The rumour of three trips stays as the city's talk.
 */
export const INK_QUARTER_KIT: DistrictData = {
  id: 'inkQuarter',
  name: "The ink-makers' quarter",
  guild: 'The Notaries',
  edge: 'wall',
  rooms: [...INK_ROOMS_12, ...INK_ROOMS_34],
  // P7: no landings; an open term decides when the party can go home (the heart is always a way home).
  ret: { kind: 'any' },
  tables: INK_TABLE_IDS,
  papers: INK_LETTERS,
  gate: { kind: 'threshold', room: INK_THRESHOLD },
  threshold: INK_THRESHOLD,
  intrusion: INK_INTRUSION,
  line: 'marks that keep what they are owed',
  barred: 'The page is still being drawn.',
  lean: { lean: 'ink', text: 'Ink' },
  map: { x: 25, y: 43, label: 'above' },
  // IQ-13 (RC): the junior notary at the landmark, room 3 (0-based 2). Tally is guaranteed in
  // rooms 1-2 while lacking (the shallow table), and the page line says so for the recruit rules.
  recruit: [{ apprentice: 'notary', room: 2 }],
  recruitPages: [{ for: 'notary', runes: ['tally'], rooms: [0, 1] }],
  hear: [
    {
      kind: 'crossDebt',
      district: 'seam',
      voice: 'owner',
      text: 'One hand marked it and another hand collected. The owner inks in a quarter of debts.',
      homeNote: 'A letter, returned to sender, lies in the attic.',
    },
    { kind: 'trips', atLeast: 3, voice: 'rumour' },
  ],
};
