import type { Coord } from '$engine';

/** The `tiles` list of a district event's data; empty for anything malformed. */
export function tilesOfData(data: unknown): Coord[] {
  const tiles = (data as { tiles?: unknown } | undefined)?.tiles;
  if (!Array.isArray(tiles)) return [];
  return tiles.flatMap((t) =>
    t && typeof t.x === 'number' && typeof t.y === 'number' ? [{ x: t.x, y: t.y }] : [],
  );
}
