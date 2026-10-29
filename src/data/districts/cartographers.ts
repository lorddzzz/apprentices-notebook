import type { DistrictData } from './index';

/**
 * The Cartographers' hall's kit data (district-cartographers.md, Hearing): five recovered rival
 * pages, the four middle masters' and the Lamplighter's. The Registrar's page never counts. The
 * old "canals' heart or eight trips" placeholders are gone.
 */
export const CARTOGRAPHERS_KIT: DistrictData = {
  id: 'cartographers',
  name: "The Cartographers' hall",
  guild: 'The Cartographers',
  edge: 'wall',
  rooms: [],
  gate: { kind: 'drawing' },
  line: 'the paper keeps changing under the pen',
  barred: 'The page is still being drawn.',
  lean: { lean: 'paper', text: 'Unfinished paper' },
  map: { x: 75, y: 22, label: 'above' },
  hear: [
    {
      kind: 'pages',
      atLeast: 5,
      except: ['registrar'],
      voice: 'owner',
      text: 'Five fragments of one plan. The owner draws in the academy.',
    },
  ],
};
