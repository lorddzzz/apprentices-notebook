import { type Component, createRawSnippet, mount, type Snippet, unmount } from 'svelte';
import type { Route } from '../../../app/routes';

/** AppHeader's public types and the crest adapter (C7), importable from plain .ts as well. */

/** The registry's id type (type-only: nothing of the art index is pulled in by this file). */
export type { ArtId } from '../../art/registry';

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
 * when a crest component is passed, that component mounted inside the disc with its props
 * (`{ id }` by default).
 * Takes the component as an argument so this file imports nothing from the fight or the trip.
 */
export function crestSnippet<I extends string, Props extends Record<string, unknown>>(
  id: I,
  ...crest: [component?: Component<{ id: I }>] | [component: Component<Props>, props: Props]
): Snippet {
  return createRawSnippet(() => ({
    render: () =>
      `<span class="crest-disc" data-crest="${id.replace(/[^\w-]/g, '')}" aria-hidden="true">${(id[0] ?? '?').toUpperCase()}</span>`,
    setup: (node) => {
      if (!crest[0]) return;
      node.textContent = '';
      node.classList.add('mounted');
      const mounted =
        crest.length === 2
          ? mount(crest[0], { target: node, props: crest[1] })
          : mount(crest[0], { target: node, props: { id } });
      return () => {
        void unmount(mounted);
      };
    },
  }));
}
