import { ENEMIES, type EnemyId } from '$data';
import { COSTS, NEEDS } from '$data/drawing';
import type { PieceId, RuleId } from '../../districts/types';
import type { Coord } from '../../grid';
import { type BoardSpec, parseCell } from '../../notation';
import { blocksUnits } from '../../queries';
import type { Rng } from '../../rng';
import type { Tile } from '../../types';
import type { FoeKit, GenKit, Need } from '../types';

/**
 * The Seam's kit (EN-S1, moved here unchanged by EN-W1; P34), and the board helpers every kit
 * reads: the tile tests, `lay`, `coords`, `shuffled` and `foeKit`.
 */

// ── Board helpers (shared by the kits and the generator) ──────────────

export const needsOf = (id: string): readonly Need[] =>
  (NEEDS[id] ?? []).map((n) => ({
    anyOf: n.anyOf as readonly (RuleId | PieceId)[],
    reason: n.reason,
  }));

export const at = (layout: BoardSpec, c: Coord): Tile | undefined =>
  c.x < 0 || c.y < 0 || c.x >= layout.width || c.y >= layout.height
    ? undefined
    : layout.tiles[c.y * layout.width + c.x];

export const isWater = (t: Tile): boolean => t.terrain.water !== null;
/** A tile nothing is laid on: free for ground, lamps, start points and foes of any habitat. */
export const isPlain = (t: Tile): boolean =>
  !isWater(t) &&
  !t.terrain.gate &&
  !t.terrain.grate &&
  !t.terrain.drop &&
  !t.terrain.vent &&
  !t.terrain.lamp &&
  t.state === null &&
  t.piece === null &&
  t.jar === null;
/** P9 "no unit starting in a burst or fire": fire, a cloud or a vent. */
export const isHazard = (t: Tile): boolean =>
  t.state?.id === 'fire' || t.state?.id === 'cloud' || t.terrain.vent;

export const lay = (layout: BoardSpec, c: Coord, token: string): void => {
  layout.tiles[c.y * layout.width + c.x] = parseCell(token, c).tile;
};

export const coords = (layout: BoardSpec): Coord[] =>
  Array.from({ length: layout.width * layout.height }, (_, i) => ({
    x: i % layout.width,
    y: Math.floor(i / layout.width),
  }));

export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const swap = out[i] as T;
    out[i] = out[j] as T;
    out[j] = swap;
  }
  return out;
}

/** A foe kit read from the enemy's data and its `NEEDS` rows. */
export const foeKit = (id: EnemyId): FoeKit => {
  const def = ENEMIES[id];
  return {
    id,
    needs: needsOf(id),
    budget: def.elite ? COSTS.elite : COSTS.minion,
    habitat: def.habitat,
    valid(layout, c) {
      const t = at(layout, c);
      if (t === undefined || blocksUnits(t) || isHazard(t)) return false;
      return def.habitat === 'water' ? isWater(t) : def.habitat === 'land' ? !isWater(t) : true;
    },
  };
};

/** The Seam: its three foes and its ground (no rule of its own). */
export const SEAM_KIT: GenKit = {
  district: 'seam',
  rules: [],
  pieces: [],
  foes: (['rat', 'familiar', 'sentry'] as const).map(foeKit),
  shapes: [],
  frames: [],
};
