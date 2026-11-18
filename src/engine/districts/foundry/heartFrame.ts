import { FOUNDRY_HEART } from '$data/districts/foundry';
import { type BoardSpec, parseBoard, parseCell } from '../../notation';
import {
  cellIndex,
  type Placement,
  placeFrame,
  placementsFrom,
  type Structure,
  settle,
} from '../frame';
import type { HeartSetup } from '../types';
import { TUNE_RULE_ID } from './types';

/**
 * The foundry's heart frame (KIT-R3; foundry-plan P24): the Great Bell's four `{hook}` tiles are the
 * stamped structure (each takes `settle`'s nearest bare tile to its authored spot, so none is lost or
 * stacked on any size), then the Carillonneur, the staff, the bells and the ropes settle by
 * placement, seeded. The tune rule is the heart's rule.
 */

const SALT = 7150;
const HOOK = '{hook}';

interface Source {
  placements: Placement[];
  hooks: Placement[];
}

/** Read from the authored heart on first use: the notation parser is not ready at module load. */
let source: Source | null = null;
function sourceOfHeart(): Source {
  if (source) return source;
  const layout = FOUNDRY_HEART.variants?.[0]?.layout;
  if (!layout) throw new Error('the foundry has no authored heart');
  const all = placementsFrom(parseBoard(layout));
  const master = all.find((p) => p.token.startsWith('V'));
  if (!master) throw new Error('the foundry heart has no Carillonneur');
  source = {
    hooks: all.filter((p) => p.token === HOOK),
    placements: [master, ...all.filter((p) => p !== master && p.token !== HOOK)],
  };
  return source;
}

const stampHooks: Structure = (out: BoardSpec, mirror: boolean): void => {
  for (const h of sourceOfHeart().hooks) {
    const fx = mirror ? 1 - h.at.x : h.at.x;
    const want = { x: Math.round(fx * (out.width - 1)), y: Math.round(h.at.y * (out.height - 1)) };
    const best = settle(out, want);
    if (!best) continue;
    const cell = parseCell(HOOK, best);
    out.tiles[cellIndex(out, best)] = { ...cell.tile, terrain: { ...cell.tile.terrain } };
  }
};

export const foundryHeartFrame = (board: BoardSpec, seed: number): BoardSpec =>
  placeFrame(board, seed, SALT, sourceOfHeart().placements, stampHooks);

export const FOUNDRY_HEART_SETUP: HeartSetup = {
  foe: 'carillonneur',
  rules: [TUNE_RULE_ID],
  frame: foundryHeartFrame,
};
