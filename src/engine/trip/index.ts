/**
 * The trip lifecycle (split out of run.ts, DK-2):
 *
 *   startTrip → beginEncounter → (battle) → closeBattle → pickLoot × picks → pushOn | returnHome
 *
 * `closeBattle` = `recordTripCasts` (proof and Glyph records, one replay) → `finishEncounter` →
 * the trip's tier-ups (M7, M16).
 */

export { choicesAt, NO_WAY_HOME, takeChoice } from './choices';
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
export { placeOf, poolFor, variantFor } from './place';
export { crossesNoReturn, nextReturnPoint, policyAllows, returnCheck } from './ret';
export {
  afterRoomWon,
  bonusMet,
  type RoomRoll,
  roomRoll,
  roomRules,
  roomSetupFor,
  setUpRoom,
} from './setup';
export {
  checkpointRoom,
  type DistrictShape,
  heartOf,
  markCheckpoint,
  newTripKit,
  parseTripKit,
  reachedCheckpoint,
  rememberCheckpoint,
  shapeOf,
} from './shape';
export { beginEncounter, recordAction, startTrip } from './start';
