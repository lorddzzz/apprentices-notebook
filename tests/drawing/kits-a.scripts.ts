import type { MasterId } from '$data';
import { applyAction, createBattle } from '$engine/battle';
import { HEART_FRAMES } from '$engine/drawing';
import { serializeBoard } from '$engine/notation';
import { compiledFor } from '$engine/run';
import type { Action, BattleState } from '$engine/types';
import { sampleHousehold, sampleParty } from '../../src/app/dev/samples';

/**
 * The scripted solves of Pack I's fallback boards (EN-K1 to EN-K3): one fixed action list per
 * master, recorded once from the lite bot on the authored fallback with the battle seed below and
 * stored here as text, so the test replays it and nothing is searched. The party is the sample
 * founding pair on the sample household's compiled pages. A line is one round of both founders:
 * `m <unit> x,y` moves, `c <unit> <spell> <dir|x,y|self>` casts, `s <unit> <dir>` shoves, `e` ends
 * the turn. A frame whose fallback no longer wins under its script needs a re-recorded script.
 */

export const SCRIPT_SEED = 1234;

export const SCRIPTS: Partial<Record<MasterId, readonly string[]>> = {
  marginalia: [
    'm draughtsman 1,3;m stoker 2,5;c stoker 1,0 up;e',
    'm draughtsman 2,1;c draughtsman 0,1 right;m stoker 2,2;c stoker 1,0 left;e',
    'c draughtsman 0,1 up;m draughtsman 1,0;c stoker 1,0 up;m stoker 3,0;e',
    'c draughtsman 0,1 right;m draughtsman 2,1;s stoker left',
  ],
  mother: [
    'm draughtsman 1,6;c draughtsman 0,1 up;m stoker 0,6;e',
    'c draughtsman 0,1 up;m draughtsman 1,3;m stoker 1,7;e',
    'c draughtsman 0,1 up;m draughtsman 2,2;c stoker 1,0 up;m stoker 1,4;e',
    'c draughtsman 0,1 left;m draughtsman 1,1;c stoker 1,0 up;m stoker 0,2;e',
    'c draughtsman 0,1 up;m draughtsman 1,1;c stoker 1,0 right;m stoker 1,3;e',
    'm draughtsman 1,1;s draughtsman down;c stoker 1,0 up;m stoker 2,1;e',
    'm draughtsman 1,1;s draughtsman down;m stoker 2,2;c stoker 1,0 left;e',
    'm draughtsman 1,1;s draughtsman down;s stoker left;m stoker 3,0;e',
    'm draughtsman 1,1;s draughtsman down;m stoker 2,2;s stoker left;e',
    'm draughtsman 1,1;s draughtsman down;s stoker left;m stoker 1,3;e',
    'm draughtsman 1,1;s draughtsman down;s stoker up;m stoker 2,1;e',
    'm draughtsman 1,1;s draughtsman down;m stoker 2,2;s stoker left;e',
    'm draughtsman 1,1;s draughtsman down;s stoker left;m stoker 1,3;e',
    'm draughtsman 1,1;s draughtsman down;s stoker up;m stoker 2,1;e',
    'm draughtsman 1,1;s draughtsman down;m stoker 2,2;s stoker left;e',
    'm draughtsman 1,1;s draughtsman down;s stoker left;m stoker 1,3;e',
    's draughtsman up;m draughtsman 1,1;s stoker up;m stoker 0,2;e',
    'm draughtsman 1,1;s draughtsman down;s stoker right;m stoker 1,3;e',
    'm draughtsman 1,1;s draughtsman down;s stoker up;m stoker 0,2;e',
    's draughtsman up;m draughtsman 1,1;s stoker right;m stoker 1,3;e',
    'm draughtsman 1,1;s draughtsman down;m stoker 2,1;s stoker up',
  ],
  lamplighter: [
    'm draughtsman 3,6;c draughtsman 0,1 up;m stoker 1,5;e',
    'm draughtsman 2,4;c draughtsman 0,1 right;m stoker 3,3;c stoker 1,0 down',
  ],
};

const DIRS = ['up', 'down', 'left', 'right'] as const;
type Dir = (typeof DIRS)[number];
const isDir = (s: string): s is Dir => (DIRS as readonly string[]).includes(s);
const coord = (s: string) => {
  const [x, y] = s.split(',').map(Number);
  return { x: x as number, y: y as number };
};

/** One script step as the engine's action. */
export function decode(step: string): Action {
  const [kind, unit, a, b] = step.split(' ');
  if (kind === 'e') return { type: 'endTurn' };
  if (kind === 'm') return { type: 'move', unit: unit as string, to: coord(a as string) };
  if (kind === 's' && isDir(a as string)) {
    return { type: 'shove', unit: unit as string, dir: a as Dir };
  }
  if (kind === 'c') {
    const aim = isDir(b as string)
      ? ({ kind: 'dir', dir: b as Dir } as const)
      : b === 'self'
        ? ({ kind: 'self' } as const)
        : ({ kind: 'tile', at: coord(b as string) } as const);
    return { type: 'cast', unit: unit as string, spell: a as string, aim };
  }
  throw new Error(`Bad script step: ${step}`);
}

/** Replays the master's script on its frame's fallback board; the final state of the battle. */
export function scriptedSolve(master: MasterId): BattleState {
  const frame = HEART_FRAMES[master];
  const script = SCRIPTS[master];
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
