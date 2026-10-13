import { SCENARIOS, type ScenarioDef } from '$data';
import { type BattleState, parseLabel, scenarioBattle } from '$engine';
import { fallbackLattices } from '../../src/app/lab';

export const at = parseLabel;

export function scenario(id: string): ScenarioDef {
  const def = SCENARIOS.find((s) => s.id === id);
  if (!def) throw new Error(`no scenario ${id}`);
  return def;
}

/** A Lab battle for a scenario, members without scenario lattices on their start lattices. */
export function labBattle(id: string, lab = true): BattleState {
  return scenarioBattle(scenario(id), { lab, lattices: fallbackLattices() });
}
