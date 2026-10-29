import type { DistrictData } from './index';

/**
 * The bridges' kit data (district-bridges.md, Hearing): perform The Wall in the Seam. The rumour
 * of five trips stays.
 */
export const BRIDGES_KIT: DistrictData = {
  id: 'bridges',
  name: 'The bridges',
  guild: 'The bridge-wardens',
  edge: 'wall',
  rooms: [],
  gate: { kind: 'drawing' },
  line: 'the edge is a door too',
  barred: 'The page is still being drawn.',
  lean: { lean: 'height', text: 'Height, the drop' },
  map: { x: 75, y: 43, label: 'above' },
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
