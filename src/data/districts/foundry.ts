import type { DistrictKitData } from './index';

/**
 * The bell foundry's kit data (district-bell-foundry.md, Hearing): a conducted Spark reaching
 * three units in the Seam. The old Conduct trigger (any conduct burst, anywhere) is gone. The
 * rumour of six trips stays.
 */
export const FOUNDRY_KIT: DistrictKitData = {
  id: 'foundry',
  hear: [
    {
      kind: 'conducted',
      atLeast: 3,
      district: 'seam',
      voice: 'owner',
      text: 'A note that carries. The owner inks in the foundry.',
    },
    { kind: 'trips', atLeast: 6, voice: 'rumour' },
  ],
};
