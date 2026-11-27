import { CHEMISTRY, type RuneId, type RuneRef } from '$data';
import type { LayerId } from '../../../app/view';
import { type ArtId, artSize, artUrl } from '../../art/registry';
import { RUNE_ART } from '../../runeArt';
import type { TileKind } from './fightArt';
import { CELL, GUTTER } from './geometry';

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

/** The first id of a lookup order (`fightArtIds`) that ships, with its URL; null = draw the vector. */
export function firstArt(ids: readonly ArtId[]): { id: ArtId; url: string } | null {
  for (const id of ids) {
    const url = artUrl(id);
    if (url) return { id, url };
  }
  return null;
}

/** A scene is commissioned at 750x800 (FT-D7); a sidecar's pixel size wins. */
const SCENE_SIZE = { w: 750, h: 800 } as const;

/**
 * Where a scene image sits behind the grid: it covers the grid plus its gutters (cover, never
 * letterboxed), and `focal` (fractions of the source) is kept as near the middle as the edges allow.
 */
export function sceneRect(
  cols: number,
  rows: number,
  id: ArtId,
  focal: readonly [number, number] = [0.5, 0.5],
): { x: number; y: number; w: number; h: number } {
  const box = { x: -GUTTER, y: -GUTTER, w: cols * CELL + GUTTER, h: rows * CELL + GUTTER };
  const src = artSize(id) ?? SCENE_SIZE;
  const k = Math.max(box.w / src.w, box.h / src.h);
  const w = src.w * k;
  const h = src.h * k;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return {
    x: clamp(box.x + box.w / 2 - focal[0] * w, box.x + box.w - w, box.x),
    y: clamp(box.y + box.h / 2 - focal[1] * h, box.y + box.h - h, box.y),
    w,
    h,
  };
}

/**
 * The corner stamp of a tile's material (FT-7): a 24-unit glyph, always vector, drawn at the top-right
 * of the cell on top of any tile art. Each silhouette is different, so a material reads without colour.
 * Clouds are left out: SteamLayer draws them over the units with their own shapes.
 */
export const TILE_STAMP: Readonly<Record<string, { path: string; filled: boolean }>> = {
  water: { path: 'M3 8q4-4 6 0t6 0 6 0M3 16q4-4 6 0t6 0 6 0', filled: false },
  slick: { path: 'M4 20 14 4M12 22 22 6', filled: false },
  blot: { path: 'M12 3a9 9 0 1 0 .01 0z', filled: true },
  fire: {
    path: 'M12 2c3 4 9 8 9 14a9 9 0 0 1-18 0c0-4 3-5 3-9 2 1 3 3 4 5 0-4-1-7 2-10z',
    filled: true,
  },
  plate: { path: 'M3 3h18v18H3z', filled: true },
  stain: { path: 'M12 3a9 9 0 1 0 .01 0zM12 8a4 4 0 1 0 .01 0z', filled: false },
  pool: {
    path: 'M2 12a10 6 0 1 0 20 0 10 6 0 1 0-20 0zM7 12a5 3 0 1 0 10 0 5 3 0 1 0-10 0z',
    filled: false,
  },
  skidPlate: { path: 'M3 3h18v18H3zM8 8l5 4-5 4M13 8l5 4-5 4', filled: false },
  kettle: { path: 'M2 19a10 10 0 0 1 20 0z', filled: true },
  wall: { path: 'M2 4h20M2 12h20M2 20h20M8 4v8M16 12v8', filled: false },
  grate: { path: 'M5 3v18M12 3v18M19 3v18', filled: false },
  gate: { path: 'M4 3h16v18H4zM4 12h16', filled: false },
  lamp: { path: 'M12 2a6 6 0 1 0 .01 0zM12 14v8', filled: false },
  vent: { path: 'M3 6h18M3 12h18M3 18h18', filled: false },
  drop: { path: 'M3 3l18 18M21 3 3 21', filled: false },
};

/** The TILE_STAMPs a tile wears, its layer first, then its terrain. Cloud-like layers show none. */
export function stampsOf(t: {
  state: LayerId | null;
  water?: unknown;
  grate?: boolean;
  gate?: boolean;
  lamp?: boolean;
  vent: boolean;
  drop?: boolean;
}): string[] {
  const out: string[] = [];
  if (t.state !== null && !CLOUD_LIKE.has(t.state) && t.state in TILE_STAMP) out.push(t.state);
  if (t.water) out.push('water');
  if (t.grate) out.push('grate');
  if (t.gate) out.push('gate');
  if (t.lamp) out.push('lamp');
  if (t.vent) out.push('vent');
  if (t.drop) out.push('drop');
  return out.slice(0, 2);
}

/** The art subject of a tile for `fightArtIds`: its layer, else its terrain, else the floor. */
export function materialOf(t: Parameters<typeof stampsOf>[0]): TileKind {
  if (t.state !== null) return t.state;
  return (stampsOf(t)[0] as TileKind | undefined) ?? 'floor';
}
