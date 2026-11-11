import type { DistrictId } from '$data';
import { type GameEvent, newProfile, type Profile, type SaveData } from '$engine';
import { botFight } from '$engine/sim';
import { endBattle, goHome, setOut, startBattle, takeOffer } from '../../../src/app/flow';
import { CURRENT_VERSION } from '../../../src/app/save';

/**
 * Records the SAVE-1 saves: one trip-ending save and one mid-trip save per district, played with
 * the greedy bot through the app's own flow (`setOut` → `startBattle` → `endBattle` → …). Run once
 * with the build named in the README; the JSON files are committed and never regenerated.
 */

/** The notebook a district's save is recorded from: the Seam (open at once) and the district. */
export function openedProfile(district: DistrictId): Profile {
  const p = newProfile();
  const open: DistrictId[] = district === 'seam' ? ['seam'] : ['seam', district];
  return { ...p, city: { ...p.city, heard: open, open } };
}

/** One room played to its end with the bot; `won` when the party took the room. */
function playRoom(save: SaveData): { save: SaveData; won: boolean } {
  const trip = save.trip;
  if (!trip) throw new Error('no trip');
  const start = startBattle(save);
  const fight = botFight(start.state, 40);
  if (fight.state.phase === 'player') return { save, won: false };
  const log: GameEvent[] = [...start.events, ...fight.events];
  const withActions = { ...save, trip: { ...trip, actions: fight.actions } };
  const end = endBattle(withActions, fight.state, log);
  return { save: end.save, won: end.outcome === 'won' };
}

/**
 * The first seed whose opening room the bot wins: the save right after that win, still looting
 * (the mid-trip save), and the same trip played on until it returns home.
 */
export function recordDistrict(district: DistrictId): {
  midTrip: SaveData;
  returned: SaveData;
  seedCounter: number;
} {
  for (let seedCounter = 1; seedCounter < 200; seedCounter++) {
    const base: SaveData = {
      profile: openedProfile(district),
      trip: null,
      seedCounter,
      lastTrip: null,
    };
    const first = playRoom(setOut(base, district));
    if (!first.won || first.save.trip?.status !== 'looting') continue;
    let save = first.save;
    for (let guard = 0; guard < 30 && save.trip; guard++) {
      const status = save.trip.status;
      if (status === 'looting') save = takeOffer(save, 0);
      else if (status === 'fight') {
        const r = playRoom(save);
        save = r.save;
        if (!r.won) break;
      } else if (status === 'crossroads' || status === 'cleared') save = goHome(save);
      else break;
    }
    if (save.trip || save.lastTrip?.outcome !== 'returned') continue;
    return { midTrip: first.save, returned: save, seedCounter };
  }
  throw new Error(`no winning seed for ${district}`);
}

/** The file text of a save: the envelope the save boundary writes, pretty-printed for review. */
export function fixtureText(save: SaveData): string {
  return `${JSON.stringify({ version: CURRENT_VERSION, data: save }, null, 2)}\n`;
}
