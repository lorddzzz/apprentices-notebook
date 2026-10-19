import type { BurstRow, MixRow } from './types';

/**
 * Design §4.2 mix table (16 rows, P13–P16). A kind landing on `on` makes `makes`. `mark` and
 * `collar` are the unit layer (P14, P15); every other `on` is a tile state. A kind landing on
 * something with no row washes it out (P16) or replaces it (see `engine/mix.ts`).
 */
export const MIXES: readonly MixRow[] = [
  // Ink
  { kind: 'ink', on: 'mark', makes: 'deepMark' },
  { kind: 'ink', on: 'slick', makes: 'stain' },
  { kind: 'ink', on: 'cloud', makes: 'brandCloud' },
  { kind: 'ink', on: 'collar', makes: 'shackle' },
  // Oil
  { kind: 'oil', on: 'blot', makes: 'stain' },
  { kind: 'oil', on: 'slick', makes: 'pool' },
  { kind: 'oil', on: 'cloud', makes: 'greaseFog' },
  { kind: 'oil', on: 'plate', makes: 'skidPlate' },
  // Steam
  { kind: 'steam', on: 'blot', makes: 'brandCloud' },
  { kind: 'steam', on: 'slick', makes: 'greaseFog' },
  { kind: 'steam', on: 'cloud', makes: 'bank' },
  { kind: 'steam', on: 'plate', makes: 'kettle' },
  // Brass
  { kind: 'brass', on: 'mark', makes: 'shackle' },
  { kind: 'brass', on: 'slick', makes: 'skidPlate' },
  { kind: 'brass', on: 'cloud', makes: 'kettle' },
  { kind: 'brass', on: 'plate', makes: 'wall' },
];

/**
 * Design §4.3 bursts and the burst page (15 rows, P18–P19): what Spark does on each layer, and
 * the damage it deals. The first five are the plain bursts; the ten `page:` rows are Spark on each
 * lingering compound (the four undrafted ones are P18's).
 */
export const BURSTS: readonly BurstRow[] = [
  { on: 'mark', burst: 'detonation', damage: 3 },
  { on: 'slick', burst: 'fire', damage: 2 },
  { on: 'cloud', burst: 'storm', damage: 2 },
  { on: 'plate', burst: 'conduct', damage: 2 },
  { on: 'fire', burst: 'surge', damage: 3 },
  // The burst page
  { on: 'deepMark', burst: 'page:deepMark', damage: 3 }, // leaves a plain mark
  { on: 'stain', burst: 'page:stain', damage: 2 }, // Inkfire: fire that marks whoever it hits
  { on: 'brandCloud', burst: 'page:brandCloud', damage: 2 }, // a storm; marked units take it twice
  { on: 'shackle', burst: 'page:shackle', damage: 3 }, // snaps, throws the unit 1 tile
  { on: 'pool', burst: 'page:pool', damage: 3 }, // all of it goes up at once
  { on: 'greaseFog', burst: 'page:greaseFog', damage: 2 }, // Flashover: storm, then the fog burns
  { on: 'skidPlate', burst: 'page:skidPlate', damage: 3 }, // shoots along the heading
  { on: 'bank', burst: 'page:bank', damage: 2 }, // Thunderhead: storm now and at round end
  { on: 'kettle', burst: 'page:kettle', damage: 2 }, // blows, leaving steam
  { on: 'wall', burst: 'page:wall', damage: 1 }, // rings, pushes everyone touching it 1 away
];
