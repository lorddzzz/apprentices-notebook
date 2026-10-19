import type { Coord } from '$engine';
import type { BoardView, TileView, UnitView } from '../../src/app/view';

/** Hand-built board views for the app tests: a bare tile and a plain unit, with overrides. */
export const bareTile = (over: Partial<TileView> = {}): TileView => ({
  state: null,
  rounds: 0,
  hits: 0,
  jar: null,
  vent: false,
  ...over,
});

export const plainUnit = (over: Partial<UnitView> & Pick<UnitView, 'id' | 'pos'>): UnitView => ({
  kind: over.id === 'draughtsman' || over.id === 'stoker' ? 'member' : 'enemy',
  def: over.id === 'draughtsman' ? 'draughtsman' : over.id === 'stoker' ? 'stoker' : 'rat',
  name: over.id,
  hp: 3,
  maxHp: 3,
  shield: 0,
  guard: null,
  mark: null,
  bound: null,
  lineage: null,
  collar: false,
  born: false,
  shackle: 0,
  held: 0,
  stunned: false,
  alive: true,
  intent: null,
  ...over,
});

export function plainBoard(
  width: number,
  height: number,
  units: UnitView[] = [],
  tile: Partial<TileView> = {},
): BoardView {
  return {
    width,
    height,
    tiles: Array.from({ length: width * height }, () => bareTile(tile)),
    units,
    round: 1,
    phase: 'player',
  };
}

export const at = (x: number, y: number): Coord => ({ x, y });
