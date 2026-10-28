import type { DistrictKitData } from './index';

/**
 * The Cartographers' hall's kit data (district-cartographers.md, Hearing): five recovered rival
 * pages, the four middle masters' and the Lamplighter's. The Registrar's page never counts. The
 * old "canals' heart or eight trips" placeholders are gone.
 */
export const CARTOGRAPHERS_KIT: DistrictKitData = {
  id: 'cartographers',
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
