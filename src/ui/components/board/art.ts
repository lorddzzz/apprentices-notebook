import { CHEMISTRY, type RuneId, type RuneRef } from '$data';
import type { LayerId } from '../../../app/view';
import { RUNE_ART } from '../../runeArt';

/** Path data (24-unit box) for a rune the board shows small: a jar's peek, a bound mark's action. */
export function runePath(ref: RuneRef | null): string | null {
  if (!ref) return null;
  return ref in RUNE_ART ? RUNE_ART[ref as RuneId] : null;
}

/** Layers drawn as a standing plate: they carry hits and no unit shares their tile. */
export const PLATE_LIKE: ReadonlySet<LayerId> = new Set(['plate', 'skidPlate', 'kettle', 'wall']);

/** Layers drawn as a cloud over the units (SteamLayer), not on the ground. */
export const CLOUD_LIKE: ReadonlySet<LayerId> = new Set([
  'cloud',
  'brandCloud',
  'greaseFog',
  'bank',
]);

/** How many hits a fresh layer takes: the pips drawn on a plate-like tile. */
export const maxHits = (id: LayerId): number =>
  id === 'wall' ? CHEMISTRY.wallHits : CHEMISTRY.plateHits;

/** A teardrop, the board's mark symbol (drawn about the origin, 16 wide). */
export const DROP = 'M0-14c-5 7-8 10-8 14.5a8 8 0 0 0 16 0c0-4.5-3-7.5-8-14.5z';
