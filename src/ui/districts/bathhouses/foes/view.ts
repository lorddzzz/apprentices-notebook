import { ENEMIES } from '$data';
import type { BoardView, UnitView } from '../../../../app/view';

/**
 * The steam's people on the board (BH-14): pure readers of a board view. The engine derives
 * "dissolved" from the tile (`dissolved.ts::isDissolved`); the view has no unit state for it, so
 * the board asks the same question of the tile the token stands on.
 */

const CLOUD_STATES: ReadonlySet<string> = new Set(['cloud', 'brandCloud', 'greaseFog', 'bank']);

/** The foe ids this module draws. */
export const BATH_ART_DEFS: readonly string[] = [
  'dissolvedBather',
  'attendant',
  'boilerman',
  'bathSteward',
];

export const isBathDef = (def: string): boolean => BATH_ART_DEFS.includes(def);

/** Whether `unit` is a dissolving foe (the `dissolves` trait) standing on a cloud tile of `view`. */
export function dissolvedOn(view: Pick<BoardView, 'width' | 'tiles'>, unit: UnitView): boolean {
  if (unit.kind !== 'enemy' || !unit.alive) return false;
  const def = ENEMIES[unit.def as keyof typeof ENEMIES];
  if (!def.traits?.includes('dissolves')) return false;
  const tile = view.tiles[unit.pos.y * view.width + unit.pos.x];
  return !!tile?.state && CLOUD_STATES.has(tile.state);
}
