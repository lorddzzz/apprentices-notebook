import { type Component, createRawSnippet, mount, type Snippet, unmount } from 'svelte';
import type { Route } from '../../../app/routes';

/** AppHeader's public types and the crest adapter (C7), importable from plain .ts as well. */

/** Until Pack 0b's src/ui/art/registry.ts merges (then this is retyped to its ArtId). */
export type ArtId = string;

export type HeaderVariant = 'study' | 'subroom' | 'city' | 'system';

export type HeaderBack = { label: string; to: Route } | { label: string; onback: () => void };

/** R28: the header's height per variant (88 = the Study's strip header). */
export const HEADER_HEIGHT: Readonly<Record<HeaderVariant, number>> = {
  study: 88,
  subroom: 64,
  city: 56,
  system: 56,
};

/** The world each variant declares on the header (data-world). */
export const HEADER_WORLD: Readonly<Record<HeaderVariant, 'home' | 'city' | 'system'>> = {
  study: 'home',
  subroom: 'home',
  city: 'city',
  system: 'system',
};

/**
 * The `crest` adapter: a plain disc carrying the id's initial (also the server render), and,
 * when a crest component is passed, that component mounted inside the disc with `{ id }`.
 * Takes the component as an argument so this file imports nothing from the fight or the trip.
 */
export function crestSnippet<I extends string>(id: I, component?: Component<{ id: I }>): Snippet {
  return createRawSnippet(() => ({
    render: () =>
      `<span class="crest-disc" data-crest="${id.replace(/[^\w-]/g, '')}" aria-hidden="true">${(id[0] ?? '?').toUpperCase()}</span>`,
    setup: (node) => {
      if (!component) return;
      node.textContent = '';
      node.classList.add('mounted');
      const crest = mount(component, { target: node, props: { id } });
      return () => {
        void unmount(crest);
      };
    },
  }));
}
