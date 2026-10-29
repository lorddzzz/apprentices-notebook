import type { DistrictData } from './index';

/**
 * The bell foundry's kit data (district-bell-foundry.md, Hearing): a conducted Spark reaching
 * three units in the Seam. The old Conduct trigger (any conduct burst, anywhere) is gone. The
 * rumour of six trips stays.
 */
export const FOUNDRY_KIT: DistrictData = {
  id: 'foundry',
  name: 'The bell foundry',
  guild: 'The founders',
  edge: 'wall',
  rooms: [],
  gate: { kind: 'drawing' },
  line: 'one bang, heard three tiles away',
  barred: 'The page is still being drawn.',
  lean: { lean: 'brass', text: 'Brass' },
  map: { x: 25, y: 22, label: 'above' },
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
