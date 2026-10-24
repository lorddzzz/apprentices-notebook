import type { DistrictKitData } from './index';

/**
 * The bridges' kit data (district-bridges.md, Hearing): perform The Wall in the Seam. The rumour
 * of five trips stays.
 */
export const BRIDGES_KIT: DistrictKitData = {
  id: 'bridges',
  hear: [
    {
      kind: 'performed',
      idiom: 'theWall',
      district: 'seam',
      voice: 'owner',
      text: 'Stone holds because it was pushed against. The owner inks in the bridges.',
    },
    { kind: 'trips', atLeast: 5, voice: 'rumour' },
  ],
};
