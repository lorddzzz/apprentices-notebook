import { artUrl } from '../../art/registry';

/** The home plates UA may ship (`ui-plates/home/<name>`); every one has a CSS fallback. */
export type PlateName =
  | 'paper-tile'
  | 'page-frame'
  | 'wood-tile'
  | 'drawer-top'
  | 'drawer-mid'
  | 'drawer-bottom'
  | 'spell-strip'
  | 'seat-tab'
  | 'rune-card';

/** A CSS `url(...)` for a shipped plate, else undefined (a CSS custom property left unset falls back). */
export function plate(name: PlateName): string | undefined {
  const url = artUrl(`ui-plates/home/${name}`);
  return url ? `url(${url})` : undefined;
}
