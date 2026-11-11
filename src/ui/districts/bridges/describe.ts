import { BRIDGES_PASS_CARD } from '$data/districts/bridges';
import { tilesOfData } from '../eventTiles';
import type { DistrictDescribe } from '../logic';

export const BRIDGES_DESCRIBE: DistrictDescribe = {
  loot: (item) =>
    item.kind === 'key' && item.district === 'bridges' ? { ...BRIDGES_PASS_CARD } : null,
  eventTiles: { 'bridges:collapse': tilesOfData },
};
