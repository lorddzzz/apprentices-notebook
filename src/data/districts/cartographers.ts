import { CARTOGRAPHERS_PAPERS, withLore } from './cartographers/lore';
import { CARTOGRAPHERS_ROOMS } from './cartographers/rooms';
import { CARTOGRAPHERS_THRESHOLD } from './cartographers/threshold';
import { CARTOGRAPHERS_TABLE_IDS, CARTOGRAPHERS_TOKENS } from './cartographers/types';
import type { DistrictData } from './index';

/**
 * The Cartographers' hall's kit data (district-cartographers.md, Hearing): five recovered rival
 * pages, the four middle masters' and the Lamplighter's. The Registrar's page never counts. The
 * old "canals' heart or eight trips" placeholders are gone. CG-W0: still drawing and roomless, the
 * guild's tokens and the six loot tables' ids declared (`cartographers/types.ts`).
 */
export const CARTOGRAPHERS_KIT: DistrictData = {
  id: 'cartographers',
  name: 'The Sestante',
  plain: "the Cartographers' hall",
  guild: 'The Cartographers',
  edge: 'wall',
  rooms: withLore(CARTOGRAPHERS_ROOMS),
  papers: CARTOGRAPHERS_PAPERS,
  ret: { kind: 'until', after: 2 },
  checkpoint: { after: 2, name: 'the quiet doorway' },
  tokens: CARTOGRAPHERS_TOKENS,
  tables: CARTOGRAPHERS_TABLE_IDS,
  gate: { kind: 'threshold', room: CARTOGRAPHERS_THRESHOLD },
  threshold: CARTOGRAPHERS_THRESHOLD,
  line: 'the paper keeps changing under the pen',
  barred: 'The page is still being drawn.',
  lean: { lean: 'paper', text: 'Unfinished paper' },
  map: { x: 75, y: 22, label: 'above', solvedArt: CARTOGRAPHERS_THRESHOLD.solvedArt },
  hear: [
    {
      kind: 'pages',
      atLeast: 5,
      except: ['registrar'],
      voice: 'owner',
      text: 'Five fragments of one plan. The owner draws in the hall.',
    },
  ],
};
