/**
 * The trip lifecycle (split out of run.ts, DK-2):
 *
 *   startTrip → beginEncounter → (battle) → closeBattle → pickLoot × picks → pushOn | returnHome
 *
 * `closeBattle` = `recordTripCasts` (proof and Glyph records, one replay) → `finishEncounter` →
 * the trip's tier-ups (M7, M16).
 */

export { pickLoot, pushOn, returnHome } from './crossroads';
export { applyDoorway } from './doorway';
export {
  closeBattle,
  finishEncounter,
  firedLines,
  learnFromFight,
  metIn,
  recordTripCasts,
} from './finish';
export { type Owned, rollOffers } from './offers';
export { placeOf, variantFor } from './place';
export { beginEncounter, recordAction, startTrip } from './start';
