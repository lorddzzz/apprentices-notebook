import type { Drawing, MasterId } from '$data';
import { applyAction, createBattle } from '$engine/battle';
import type { Json, ShapeInput } from '$engine/districts/types';
import { HEART_FRAMES } from '$engine/drawing';
import type { InkedTripState } from '$engine/drawing/types';
import { type BoardSpec, serializeBoard } from '$engine/notation';
import { compiledFor } from '$engine/run';
import type { BattleState, Trip } from '$engine/types';
import { sampleHousehold, sampleParty } from '../../src/app/dev/samples';
import { decode, SCRIPT_SEED } from './kits-a.scripts';

/**
 * The scripted solves of Pack K's fallback boards (EN-K6, EN-K7), stored the way Packs I and J
 * stored theirs (`kits-a.scripts.ts`, whose step format and battle seed they share): one fixed
 * action list per master, recorded once from the lite bot on the authored fallback and replayed
 * here, so nothing is searched. A frame whose fallback no longer wins under its script needs a
 * re-recorded script.
 */

export const SCRIPTS_C: Partial<Record<MasterId, readonly string[]>> = {
  carillonneur: [
    'm draughtsman 2,5;c draughtsman 0,1 up;m stoker 4,5;c stoker 1,0 left;e',
    'm draughtsman 3,4;c draughtsman 0,1 up;c stoker 1,0 up;m stoker 4,2;e',
    'm draughtsman 2,4;c draughtsman 0,1 up;m stoker 4,0;c stoker 1,0 left;e',
    'm draughtsman 0,4;c draughtsman 0,1 right;s stoker left;m stoker 3,1;e',
    'm draughtsman 1,5;c stoker 1,0 up;m stoker 1,2;e',
    'm draughtsman 3,4;c draughtsman 0,1 left;m stoker 0,4;c stoker 1,0 right',
  ],
  registrar: [
    'm draughtsman 5,5;c draughtsman 0,1 left;m stoker 1,5;c stoker 1,0 right;e',
    'm draughtsman 3,4;c draughtsman 0,1 up;m stoker 1,2;e',
    'c draughtsman 0,1 up;m draughtsman 2,2;m stoker 2,1;c stoker 1,0 right',
  ],
};

/** Replays the master's script on its frame's fallback board; the final state of the battle. */
export function scriptedSolveC(master: MasterId): BattleState {
  const frame = HEART_FRAMES[master];
  const script = SCRIPTS_C[master];
  if (!frame || !script) throw new RangeError(`No scripted solve for ${master}`);
  const profile = sampleHousehold();
  const party = sampleParty(2);
  let state = createBattle({
    title: 'A scripted fallback',
    board: serializeBoard(frame.fallback),
    seed: SCRIPT_SEED,
    lineup: party,
    party: Object.fromEntries(party.map((id) => [id, { spells: compiledFor(profile, id).spells }])),
  }).state;
  for (const step of script.flatMap((line) => line.split(';'))) {
    state = applyAction(state, decode(step)).state;
  }
  return state;
}

/**
 * What a lent shape's hooks read on a drawn trip (the shapes read the trip seed, the stored
 * rooms in `kit.state` and the lent state): room `room` of `drawing`, with the layouts of
 * `rooms` (by index) already inked.
 */
export function shapeInput(
  drawing: Drawing,
  seed: number,
  room: number,
  state: Json,
  rooms: Readonly<Record<number, BoardSpec>> = {},
): ShapeInput<Json> {
  const inked: InkedTripState = {
    slot: 0,
    drawing,
    rooms: Array.from({ length: drawing.length }, (_, i) => {
      const layout = rooms[i];
      return layout ? serializeBoard(layout) : null;
    }),
    inner: null,
  };
  return {
    trip: { seed } as unknown as Trip,
    kit: {
      state: inked as unknown as Json,
      choices: [],
      checkpoint: false,
      bonuses: [],
    },
    state,
    room,
    length: drawing.length,
  };
}
