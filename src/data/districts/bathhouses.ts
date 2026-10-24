import type { DistrictKitData } from './index';

/**
 * The bathhouses' kit data (district-bathhouses.md, Hearing): one Storm reaching three units in
 * the Seam. The old grease-fog trigger is gone. The rumour of four trips stays.
 */
export const BATHHOUSES_KIT: DistrictKitData = {
  id: 'bathhouses',
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
