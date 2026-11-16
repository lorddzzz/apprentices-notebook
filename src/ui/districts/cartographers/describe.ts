import { tilesOfData } from '../eventTiles';
import type { DistrictDescribe } from '../logic';

/** The hall's wording for `app/describe.ts`: the tiles a struck circle touches. The foes' own telegraphs read from their engine `describe`. */
export const CARTOGRAPHERS_DESCRIBE: DistrictDescribe = {
  eventTiles: { 'cartographers:struck': tilesOfData },
};
