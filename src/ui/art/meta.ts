/**
 * Public art metadata (R26): role, decoded size, shipped bytes, map-patch bbox (750×3800 master
 * pixels) and nine-slice insets (source pixels), derived from the sidecars at build time by
 * `artMetaPlugin`. Nothing else from `art-src/` (prompts, references, masters) reaches the client.
 */
import META from 'virtual:art-meta';
import type { ArtMeta } from './spec';

export type { ArtMeta, Insets, Rect } from './spec';

export function artMeta(id: string): ArtMeta | null {
  return META[id] ?? null;
}
