/**
 * The art registry (C2): shipped assets are discovered from `src/assets/art/**` (no hand list).
 * Every lookup answers synchronously; with zero art present every id resolves to null and screens
 * draw their vector fallback.
 */
import { artMeta } from './meta';
import { type ArtId, isArtId } from './spec';

export type { ArtId } from './spec';
export { artMeta };

const ROOT = '/src/assets/art/';

/** `/src/assets/art/foes/seam/rat.webp` → `foes/seam/rat`; null for anything off the path rule. */
export function artIdFromPath(path: string): ArtId | null {
  if (!path.startsWith(ROOT) || !path.endsWith('.webp')) return null;
  const id = path.slice(ROOT.length, -'.webp'.length);
  return isArtId(id) ? id : null;
}

/** Glob result (path → URL) to an id → URL index. */
export function buildIndex(urls: Readonly<Record<string, string>>): ReadonlyMap<ArtId, string> {
  const index = new Map<ArtId, string>();
  for (const [path, url] of Object.entries(urls)) {
    const id = artIdFromPath(path);
    if (id) index.set(id, url);
  }
  return index;
}

const INDEX = buildIndex(
  import.meta.glob<string>('/src/assets/art/**/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
);

export function artUrl(id: ArtId): string | null {
  return INDEX.get(id) ?? null;
}

export function artIds(): ArtId[] {
  return [...INDEX.keys()].sort();
}

/** The decoded pixel size, when the asset ships with a sidecar. */
export function artSize(id: ArtId): { w: number; h: number } | null {
  const meta = artMeta(id);
  return meta ? { w: meta.w, h: meta.h } : null;
}
