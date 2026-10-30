import type { DistrictData } from './index';
import { INK_LETTERS } from './inkQuarter/papers';
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
  rooms: [],
  // P7: no landings; an open term decides when the party can go home (the heart is always a way home).
  ret: { kind: 'any' },
  tables: INK_TABLE_IDS,
  papers: INK_LETTERS,
  gate: { kind: 'drawing' },
  threshold: INK_THRESHOLD,
  line: 'marks that keep what they are owed',
  barred: 'The page is still being drawn.',
  lean: { lean: 'ink', text: 'Ink' },
  map: { x: 25, y: 43, label: 'above' },
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
