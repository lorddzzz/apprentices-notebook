import type { AttackId } from '$data';
import type { Coord, Dir, UnitId } from '$engine';

/** What the board draws on top of the tiles. U4 adds `overlayFor` (input mode + previews → Overlay). */
export type Highlight =
  | { kind: 'reach'; at: Coord } // a tile the selected member can move to
  | { kind: 'aim'; at: Coord; chevron?: Dir } // a legal aim tile (chevron: next to the caster)
  | { kind: 'target'; at: Coord } // a tile the previewed action hits
  | { kind: 'path'; cells: Coord[] } // projectile / push path
  | { kind: 'shove'; at: Coord }; // an adjacent unit that can be shoved

export interface IntentDraw {
  from: Coord;
  /** Tiles between the enemy and the hit tile (empty for adjacent attacks). */
  path: Coord[];
  hit: Coord | null;
  order: number;
  attack: AttackId;
  dir: Dir;
  emphasis: 'normal' | 'strong' | 'dim';
}

export interface Badge {
  at: Coord;
  kind: 'damage' | 'kill' | 'shield';
  text: string;
}

/** Dashed outline of where a unit would stand after the previewed action. */
export interface Ghost {
  unit: UnitId;
  at: Coord;
  kind: 'member' | 'enemy';
  def: string;
}

export interface Overlay {
  highlights: Highlight[];
  intents: IntentDraw[];
  badges: Badge[];
  ghosts: Ghost[];
  selected: UnitId | null;
}

export const EMPTY_OVERLAY: Overlay = {
  highlights: [],
  intents: [],
  badges: [],
  ghosts: [],
  selected: null,
};
