import type { DistrictData } from './index';

/**
 * The inked page (EN P1, P16): the district every drawn trip runs in. It has no static rooms (the
 * engine module builds them per trip from the drawing's snapshot), no hearing, no heart on the city
 * (`marksHeart: false`), no checkpoint and is never a map node: the owner opens it from the
 * drawing table, on the handover. It hears as the Seam so no hearing filter reads it as a district
 * of its own, and a trip home is free (`ret: any`) whatever the lent shape then blocks.
 */
export const INKED_PAGE_KIT: DistrictData = {
  id: 'inkedPage',
  name: 'The inked page',
  plain: '',
  guild: "No guild: the owner's drawing",
  edge: 'wall',
  rooms: [],
  hear: [],
  gate: { kind: 'drawing' },
  line: 'A page the owner drew, played for the ink.',
  barred: 'No page is drawn yet.',
  lean: { lean: 'ink', text: 'All five materials' },
  // Never drawn as a node (`mapNodes` skips a district that hears as another).
  map: { x: 50, y: 50, label: 'below' },
  ret: { kind: 'any' },
  hearsAs: 'seam',
  marksHeart: false,
};
