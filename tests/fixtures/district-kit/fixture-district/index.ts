/**
 * The fixture district (DK-18): one district that uses every kit hook, the template district
 * plans copy. `data.ts` is the district's data file, `module.ts` its engine module; a real
 * district puts them in `src/data/districts/` and `src/engine/districts/` and lists each once.
 * `tests/run/kit.test.ts` walks a full trip through it.
 */
export { FIXTURE_DATA, FIXTURE_ROOMS, STAND_IN } from './data';
export type { KitOps, Plank, SpanState, Sway, TermItem, Toll, Wind } from './module';
export { FIXTURE_MODULE, SPANS, useKitOps } from './module';
