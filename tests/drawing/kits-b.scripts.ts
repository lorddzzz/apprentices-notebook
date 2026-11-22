import type { MasterId } from '$data';
import { applyAction, createBattle } from '$engine/battle';
import { HEART_FRAMES } from '$engine/drawing';
import { serializeBoard } from '$engine/notation';
import { compiledFor } from '$engine/run';
import type { BattleState } from '$engine/types';
import { sampleHousehold, sampleParty } from '../../src/app/dev/samples';
import { decode, SCRIPT_SEED } from './kits-a.scripts';

/**
 * The scripted solves of Pack J's fallback boards (EN-K4, EN-K5), stored the way Pack I stored
 * theirs (`kits-a.scripts.ts`, whose step format and battle seed they share): one fixed action
 * list per master, recorded once from the lite bot on the authored fallback and replayed here, so
 * nothing is searched. A frame whose fallback no longer wins under its script needs a re-recorded
 * script.
 */

export const SCRIPTS_B: Partial<Record<MasterId, readonly string[]>> = {
  // CAL-3 calibrated: re-recorded from the lite bot after the bath and bridge body numbers moved
  // (Steward HP 38, gauge 32 pips; Chief Warden HP 28). The openings match the earlier scripts.
  // CAL-5H: the 14 HP Steward falls to the Stoker's cast in round 3, where this replay now ends.
  bathSteward: [
    'm draughtsman 6,2;c draughtsman 0,1 left;c stoker 1,0 up;m stoker 2,3;e',
    'c draughtsman 0,1 down;m draughtsman 3,2;c stoker 1,0 up;m stoker 1,2;e',
    'c draughtsman 0,1 left;m draughtsman 2,1;c stoker 1,0 right',
  ],
  chiefWarden: [
    'm draughtsman 2,4;c draughtsman 0,1 right;c stoker 1,0 up;m stoker 5,4;e',
    'c draughtsman 0,1 left;m draughtsman 1,3;c stoker 1,0 left;m stoker 5,1;e',
    'm draughtsman 1,0;c draughtsman 0,1 right;m stoker 4,0;c stoker 1,0 left;e',
    'c draughtsman 0,1 right;m draughtsman 2,0;c stoker 1,0 left;m stoker 3,1;e',
    'c draughtsman 0,1 right;m draughtsman 1,0;c stoker 1,0 up',
  ],
};

/** Replays the master's script on its frame's fallback board; the final state of the battle. */
export function scriptedSolveB(master: MasterId): BattleState {
  const frame = HEART_FRAMES[master];
  const script = SCRIPTS_B[master];
  if (!frame || !script) throw new RangeError(`No scripted solve for ${master}`);
  const profile = sampleHousehold();
  const party = sampleParty(2);
  let state = createBattle({
    title: 'A scripted fallback',
    board: serializeBoard(frame.fallback),
    enemyHp: frame.enemyHp,
    seed: SCRIPT_SEED,
    lineup: party,
    party: Object.fromEntries(party.map((id) => [id, { spells: compiledFor(profile, id).spells }])),
  }).state;
  for (const step of script.flatMap((line) => line.split(';'))) {
    state = applyAction(state, decode(step)).state;
  }
  return state;
}
