<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Route } from '../../../app/routes';
  import { artUrl } from '../../art/registry';
  import AppHeader, { type ArtId, type HeaderVariant } from '../common/AppHeader.svelte';

  /**
   * UH-0. The home rooms' header: an AppHeader (world home) carrying a painted strip. The height
   * is AppHeader's `variant` ('study' 88, 'subroom' 64), never inferred from the strip id.
   * Without art the header is the flat home-world colour; a `fallback` snippet, when given, is
   * painted behind the header's content in its place (the Study's StudyScene, a later pack).
   */
  interface Props {
    strip: ArtId;
    title: string;
    back?: { to: Route; label: string };
    right?: Snippet;
    fallback?: Snippet;
    variant?: Extract<HeaderVariant, 'study' | 'subroom'>;
  }

  let { strip, title, back, right, fallback, variant = 'subroom' }: Props = $props();

  const showFallback = $derived(fallback !== undefined && artUrl(strip) === null);
</script>

<div class="home-strip" class:with-fallback={showFallback} data-testid="home-strip">
  {#if showFallback && fallback}
    <div class="fallback" aria-hidden="true">{@render fallback()}</div>
  {/if}
  <AppHeader {variant} {title} {back} {right} {strip} />
</div>

<style>
  .home-strip {
    position: relative;
    flex: none;
  }
  .fallback {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  /* The header's own background would hide the fallback layer behind it. */
  .with-fallback :global(.app-header) {
    background: transparent;
  }
</style>
