import { DISTRICT_IDS, DISTRICTS, type DistrictId, type MemberId } from '$data';
import { DISTRICT_KIT, type ThresholdSpec } from '$data/districts/index';
import {
  type ActionResult,
  type BattleState,
  compiledFor,
  createBattle,
  districtState,
  type PartyInit,
  type Profile,
  solveThreshold,
  tripParty,
} from '$engine';

/** A threshold room's battle (K-22) is not a trip: one fixed seed, so Retry replays the same start. */
export const THRESHOLD_SEED = 1;

export type ThresholdPlan =
  | { ok: true; district: DistrictId; name: string; room: ThresholdSpec; line: string }
  | { ok: false; why: string };

/** Which district the URL names, if it is one. */
export function districtParam(d: string | null): DistrictId | null {
  return DISTRICT_IDS.find((id) => id === d) ?? null;
}

/** A district's threshold room as kit data (P15: copy, start points, goal, solved art), if it has one. */
export function thresholdRoom(d: DistrictId): ThresholdSpec | undefined {
  return DISTRICT_KIT[d]?.threshold;
}

/** Whether `d` has a threshold room to try right now: heard, with a threshold gate, not open. */
export function planThreshold(p: Profile, d: string | null): ThresholdPlan {
  const id = districtParam(d);
  if (id === null) return { ok: false, why: 'The map has no such place.' };
  const def = DISTRICTS[id];
  const state = districtState(p, id);
  if (state === 'unheard') return { ok: false, why: 'You have not heard of this place yet.' };
  if (def.gate.kind !== 'threshold') return { ok: false, why: `${def.name} has no barred way.` };
  const room = thresholdRoom(id);
  if (room === undefined) return { ok: false, why: `${def.name} has no barred way.` };
  if (tripParty(p).length === 0) {
    return { ok: false, why: 'No one is slotted. Slot an apprentice in the study first.' };
  }
  if (state === 'open') return { ok: false, why: `${def.name} is already open.` };
  return { ok: true, district: id, name: def.name, room, line: def.line };
}

/** The room's opening state: the current lattices, full HP and full charges. */
export function thresholdStart(
  p: Profile,
  room: Pick<ThresholdSpec, 'name' | 'board' | 'goal'>,
): ActionResult {
  const lineup = tripParty(p);
  const party: Partial<Record<MemberId, PartyInit>> = {};
  for (const m of lineup) {
    const spells = compiledFor(p, m).spells;
    party[m] = { spells, charges: Object.fromEntries(spells.map((s) => [s.key, s.charges])) };
  }
  return createBattle({
    title: room.name,
    board: room.board,
    seed: THRESHOLD_SEED,
    objective: room.goal,
    party,
    lineup,
    startSeed: THRESHOLD_SEED,
  });
}

/** The profile after the battle: solved on a win, otherwise the same object. */
export function thresholdOutcome(p: Profile, d: DistrictId, state: BattleState): Profile {
  return state.phase === 'won' ? solveThreshold(p, d) : p;
}
