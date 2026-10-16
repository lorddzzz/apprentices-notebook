import {
  DISTRICT_IDS,
  DISTRICTS,
  type DistrictId,
  MEMBER_IDS,
  type MemberId,
  type ThresholdDef,
} from '$data';
import {
  type ActionResult,
  type BattleState,
  compiledFor,
  createBattle,
  districtState,
  type PartyInit,
  type Profile,
  solveThreshold,
} from '$engine';

/** A threshold room's battle (K-22) is not a trip: one fixed seed, so Retry replays the same start. */
export const THRESHOLD_SEED = 1;

export type ThresholdPlan =
  | { ok: true; district: DistrictId; name: string; room: ThresholdDef; line: string }
  | { ok: false; why: string };

/** Which district the URL names, if it is one. */
export function districtParam(d: string | null): DistrictId | null {
  return DISTRICT_IDS.find((id) => id === d) ?? null;
}

/** Whether `d` has a threshold room to try right now: heard, with a threshold gate, not open. */
export function planThreshold(p: Profile, d: string | null): ThresholdPlan {
  const id = districtParam(d);
  if (id === null) return { ok: false, why: 'The map has no such place.' };
  const def = DISTRICTS[id];
  const state = districtState(p, id);
  if (state === 'unheard') return { ok: false, why: 'You have not heard of this place yet.' };
  if (def.gate.kind !== 'threshold') return { ok: false, why: `${def.name} has no barred way.` };
  if (state === 'open') return { ok: false, why: `${def.name} is already open.` };
  return { ok: true, district: id, name: def.name, room: def.gate.room, line: def.line };
}

/** The room's opening state: the current lattices, full HP and full charges. */
export function thresholdStart(p: Profile, room: ThresholdDef): ActionResult {
  const party: Partial<Record<MemberId, PartyInit>> = {};
  for (const m of MEMBER_IDS) {
    const spells = compiledFor(p, m).spells;
    party[m] = { spells, charges: Object.fromEntries(spells.map((s) => [s.key, s.charges])) };
  }
  return createBattle({
    title: room.name,
    board: room.board,
    seed: THRESHOLD_SEED,
    objective: room.goal,
    party,
  });
}

/** The profile after the battle: solved on a win, otherwise the same object. */
export function thresholdOutcome(p: Profile, d: DistrictId, state: BattleState): Profile {
  return state.phase === 'won' ? solveThreshold(p, d) : p;
}
