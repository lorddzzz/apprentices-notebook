import { BATH_TOKENS } from './bathhouses/types';
import type { DistrictData } from './index';

/**
 * The bathhouses (district-bathhouses.md; bathhouses-plan). BH-0: still drawing and roomless, with
 * free return (P5), the steam lean and the foes' tokens. Hearing (DK-8): one Storm reaching three
 * units in the Seam; the rumour of four trips stays.
 */
export const BATHHOUSES_KIT: DistrictData = {
  id: 'bathhouses',
  name: 'The bathhouses',
  guild: 'The bath-keepers',
  edge: 'wall',
  rooms: [],
  ret: { kind: 'any' },
  tokens: BATH_TOKENS,
  gate: { kind: 'drawing' },
  line: 'one fog over the whole house',
  barred: 'The page is still being drawn.',
  lean: { lean: 'steam', text: 'Steam' },
  map: { x: 75, y: 70, label: 'above' },
  hear: [
    {
      kind: 'burstUnits',
      burst: 'storm',
      atLeast: 3,
      district: 'seam',
      voice: 'owner',
      text: 'Steam remembers who stood in it. The owner inks in the thermae.',
    },
    { kind: 'trips', atLeast: 4, voice: 'rumour' },
  ],
};
