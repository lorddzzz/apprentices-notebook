<script lang="ts">
  import type { Snippet } from 'svelte';
  import { type ArtId, artSize, artUrl } from './registry';

  interface Props {
    id: ArtId;
    /** Drawn when the asset is not shipped (placeholder first: every screen works with zero art). */
    fallback?: Snippet;
    alt?: string;
    fit?: 'cover' | 'contain';
    class?: string;
  }

  let { id, fallback, alt = '', fit = 'contain', class: className }: Props = $props();

  const url = $derived(artUrl(id));
  const size = $derived(artSize(id));
</script>

{#if url}
  <img
    class={className}
    src={url}
    {alt}
    width={size?.w}
    height={size?.h}
    style:object-fit={fit}
    decoding="async"
    draggable="false"
  />
{:else if fallback}
  {@render fallback()}
{/if}
