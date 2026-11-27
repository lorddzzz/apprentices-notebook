<script lang="ts">
  import type { DistrictId } from '$data';
  import ArtImage from '../../art/ArtImage.svelte';
  import type { ArtId } from '../../art/registry';

  /**
   * UT-8. The scene slot of the Crossroads (220 px) and Cleared (260 px): the district's painted
   * scene when it ships, else a vector dusk in the district's light. The screen root carries
   * `data-district`, so `--district-*` reach it by inheritance. Decorative: no alt text.
   */
  interface Props {
    district: DistrictId;
    kind: 'crossroads' | 'stair';
  }

  let { district, kind }: Props = $props();

  // The stair is one shared picture; the district's colour tints it (code, not art).
  const id = $derived(
    (kind === 'crossroads' ? `scenes/${district}/crossroads` : 'scenes/shared/stair') as ArtId,
  );
</script>

{#snippet dusk()}
  <svg viewBox="0 0 375 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    {#if kind === 'crossroads'}
      <path d="M0 200 L150 160 L225 160 L375 200 L375 260 L0 260 Z" fill="var(--district-dark)" opacity="0.7" />
      <path d="M175 160 L200 160 L250 260 L125 260 Z" fill="var(--district-mid)" opacity="0.55" />
      <rect x="276" y="92" width="4" height="100" fill="var(--district-light)" opacity="0.9" />
      <circle cx="278" cy="88" r="9" fill="var(--lamp)" />
      <circle cx="278" cy="88" r="26" fill="var(--lamp)" opacity="0.18" />
    {:else}
      <path d="M130 260 L150 200 L225 200 L245 260 Z" fill="var(--district-mid)" opacity="0.6" />
      <path d="M150 200 L162 150 L213 150 L225 200 Z" fill="var(--district-mid)" opacity="0.75" />
      <path d="M162 150 L172 110 L203 110 L213 150 Z" fill="var(--district-light)" opacity="0.6" />
      <circle cx="187" cy="92" r="30" fill="var(--lamp)" opacity="0.22" />
      <circle cx="187" cy="92" r="9" fill="var(--lamp)" />
    {/if}
  </svg>
{/snippet}

<div class="scene" class:stair={kind === 'stair'} data-scene={kind} data-testid="scene" aria-hidden="true">
  <ArtImage id={id} fit="cover" fallback={dusk} />
  {#if kind === 'stair'}<span class="tint"></span>{/if}
</div>

<style>
  .scene {
    position: relative;
    flex: none;
    height: 220px;
    overflow: hidden;
    background: linear-gradient(var(--district-dark, var(--city-night)), var(--district-mid, var(--city-stone)));
  }
  .stair {
    height: 260px;
  }
  .scene :global(img),
  .scene :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .tint {
    position: absolute;
    inset: 0;
    background: var(--district-dark, var(--city-night));
    mix-blend-mode: multiply;
    opacity: 0.35;
  }
</style>
