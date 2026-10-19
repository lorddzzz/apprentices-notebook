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

/** A battle on a board of our own, members on their start lattices (Draughtsman `Bolt> Ink Strike`: spell '0,1'). */
export function battleOf(board: string, lab = true): BattleState {
  return scenarioBattle({ board }, { lab, lattices: fallbackLattices() });
}

/** The Draughtsman at A1 with a dummy three tiles right, the Stoker below: a Bolt right hits the dummy. */
export const CAST_BOARD = [
  'D . . d . .',
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
  '. S . . . .',
].join('\n');

/** The Stoker at A1 with a rat beside it: a shove right pushes the rat along the row. */
export const SHOVE_BOARD = [
  'S r . . . .',
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
  '. . . . . .',
  '. D . . . .',
].join('\n');
