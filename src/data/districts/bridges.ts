import { BRIDGE_TABLE_IDS, BRIDGE_TOKENS } from './bridges/types';
import type { DistrictData } from './index';

/**
 * The bridges' kit data (district-bridges.md, Hearing): perform The Wall in the Seam. The rumour
 * of five trips stays. BR-0: still drawing and roomless, free return after any room (P11), the
 * staff's tokens and the span tables' ids. The edge stays `wall` until the first bridge room
 * exists (BR-1 flips it to `drop` with the rooms).
 */
export const BRIDGES_KIT: DistrictData = {
  id: 'bridges',
  name: 'The bridges',
  guild: 'The bridge-wardens',
  edge: 'wall',
  rooms: [],
  ret: { kind: 'any' },
  tokens: BRIDGE_TOKENS,
  tables: BRIDGE_TABLE_IDS,
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
