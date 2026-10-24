import type { DistrictKitData } from './index';

/**
 * The ink-makers' quarter's kit data (district-ink-makers.md, Hearing): a mark by one apprentice,
 * hit by a different apprentice's cast the same turn, in the Seam. The old deep-mark trigger is
 * gone. The rumour of three trips stays as the city's talk.
 */
export const INK_QUARTER_KIT: DistrictKitData = {
  id: 'inkQuarter',
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
