import type { DistrictId } from '$data';
import { newSave, type Profile, type SaveData } from '$engine';
import { setOut } from '../flow';

/**
 * UF-15c: setup recipes for the dev fixtures. Each is built from engine and app-flow calls
 * (`setOut`), never from recorded JSON or `tests/`, and has no FT dependency.
 */

/** The seed every fixture notebook starts from (`setOut` advances it deterministically). */
export const RECIPE_SEED = 1;

/**
 * A notebook out on a trip into `district`, standing at the first room's fight (status `fight`,
 * encounter 0, no actions yet). The district is opened in the city so `setOut` accepts it; the
 * party is `profile`'s (the fixtures pass the lock notebook: Pell and the stoker, each with a spell). `startBattle(save)` then
 * gives the real board, and the Combat screen shows it with the intro playing and then idle.
 */
export function fightSave(district: DistrictId, p: Profile): SaveData {
  // A save keeps heard ⊇ open (K-19), so the district is heard as well as open.
  const heard = [...new Set([...p.city.heard, district])];
  const open = [...new Set([...p.city.open, district])];
  const save = { ...newSave(RECIPE_SEED), profile: { ...p, city: { ...p.city, heard, open } } };
  return setOut(save, district);
}
